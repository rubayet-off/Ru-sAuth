"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { broadcastAuth, subscribeAuth } from "@/lib/authChannel";
import { apiRequest, parseProfileSnapshot } from "@/lib/clientApi";
import { MAX_CONSECUTIVE_STALE } from "@/lib/sessionProbe";
import { clearAccessExpiry, refreshSession } from "@/lib/sessionRefresh";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

const POLL_INTERVAL_MS = 3000;

export default function AuthSync() {
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const entityType = useAuthStore((state) => state.entityType);
  const addToast = useToastStore((state) => state.addToast);
  const checkingRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);
  const staleCountRef = useRef(0);

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      broadcastAuth({ type: "login" });
    }

    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    return subscribeAuth((message) => {
      const store = useAuthStore.getState();

      if (message.type === "logout") {
        if (!store.isAuthenticated) return;
        const loginPath = store.entityType === "admin" ? "/admin/login" : "/";

        store.clearAuth();
        clearAccessExpiry();

        addToast(
          message.reason === "deleted"
            ? "This account was deleted in another tab."
            : "You were signed out in another tab.",
          "error",
        );

        router.replace(loginPath);
        router.refresh();
        return;
      }

      if (message.type === "login") {
        if (!store.isAuthenticated) {
          router.replace("/");
          router.refresh();
        }

        return;
      }

      if (message.type === "profile") {
        store.updateUser({
          ...(message.username !== undefined
            ? { username: message.username }
            : {}),
          ...(message.profile_photo_url !== undefined
            ? { profile_photo_url: message.profile_photo_url }
            : {}),
        });

        return;
      }

      if (message.type === "sessions") {
        store.setSessionsRevision(`local:${Date.now()}`);
      }
    });
  }, [addToast, router]);

  useEffect(() => {
    if (!isAuthenticated || entityType !== "user") return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function signOut(notifyOtherTabs: boolean) {
      const store = useAuthStore.getState();

      if (!store.isAuthenticated) return;

      stopped = true;
      store.clearAuth();
      clearAccessExpiry();

      addToast(
        "You were signed out because this session is no longer active.",
        "error",
      );

      if (notifyOtherTabs) {
        broadcastAuth({ type: "logout", reason: "revoked" });
      }

      router.replace("/");
      router.refresh();
    }

    async function check() {
      if (stopped || checkingRef.current) return;

      checkingRef.current = true;

      const result = await apiRequest("/api/auth/status", { method: "GET" });

      checkingRef.current = false;

      if (stopped) return;
      if (useAuthStore.getState().isSigningOut) return;

      if (result.status === 401) {
        signOut(result.data.reason !== "foreign");
        return;
      }

      if (result.status === 409) {
        // The cookie no longer matches the session. Let the refresh endpoint
        // settle it: it either re-issues tokens or ends the session.
        staleCountRef.current += 1;

        const refreshed = await refreshSession(true);

        if (stopped) return;

        if (refreshed === "refreshed") {
          staleCountRef.current = 0;
          return;
        }

        if (refreshed === "ended") {
          signOut(true);
          return;
        }

        if (staleCountRef.current >= MAX_CONSECUTIVE_STALE) {
          stopped = true;
          useAuthStore.getState().clearAuth();
          clearAccessExpiry();
          window.location.href = "/api/auth/clear-cookie";
        }

        return;
      }

      staleCountRef.current = 0;

      // The browser still holds the previous refresh token (it missed the
      // last rotation). Re-sync now, before the grace window closes.
      if (result.ok && result.data.needsRefresh === true) {
        void refreshSession(true);
      }

      const snapshot = result.ok ? parseProfileSnapshot(result.data) : null;

      if (snapshot) {
        const store = useAuthStore.getState();
        const current = store.user;

        if (
          current &&
          (current.username !== snapshot.username ||
            current.profile_photo_url !== snapshot.profile_photo_url)
        ) {
          store.updateUser({
            username: snapshot.username,
            profile_photo_url: snapshot.profile_photo_url,
          });
        }

        if (store.sessionsRevision !== snapshot.sessionsRevision) {
          store.setSessionsRevision(snapshot.sessionsRevision);
        }
      }
    }

    function schedule() {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await check();

        if (!stopped) schedule();
      }, POLL_INTERVAL_MS);
    }

    function onWake() {
      if (document.visibilityState === "visible") void check();
    }

    void check();
    schedule();

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    return () => {
      stopped = true;

      if (timer) clearTimeout(timer);

      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [isAuthenticated, entityType, addToast, router]);

  return null;
}
