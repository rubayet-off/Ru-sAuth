"use client";

import { useEffect } from "react";

import {
  REFRESH_EARLY_MS,
  accessExpiresSoon,
  isExpiryKey,
  readAccessExpiry,
  refreshSession,
  writeAccessExpiry,
} from "@/lib/sessionRefresh";
import { useAuthStore, type Admin, type User } from "./authStore";

interface AuthStoreSetupProps {
  user: User | null;
  admin: Admin | null;
  entityType: "user" | "admin" | null;
}

const MIN_DELAY_MS = 5_000;
const FAILURE_RETRY_MS = 30_000;

export default function AuthStoreSetup({
  user,
  admin,
  entityType,
}: AuthStoreSetupProps) {
  const setAuth = useAuthStore((state) => state.setAuth);

  const identity =
    entityType === "user" && user
      ? `user:${user.uid}:${user.sessionId}`
      : entityType === "admin" && admin
        ? `admin:${admin.email}:${admin.sessionId}`
        : null;

  const serverExpiry =
    (entityType === "user" ? user?.access_expires_at : admin?.access_expires_at) ??
    null;

  const needsRefresh =
    entityType === "user"
      ? Boolean(user?.need_refresh)
      : entityType === "admin"
        ? Boolean(admin?.need_refresh)
        : false;

  useEffect(() => {
    const current = useAuthStore.getState();

    const sameUser =
      user &&
      current.user?.uid === user.uid &&
      current.user.sessionId === user.sessionId;
    const sameAdmin =
      admin &&
      current.admin?.email === admin.email &&
      current.admin.sessionId === admin.sessionId;

    if (sameUser || sameAdmin) return;

    setAuth({ user, admin, entityType });
  }, [user, admin, entityType, setAuth]);

  useEffect(() => {
    if (!identity) return;

    // The server knows exactly when the access cookie expires; keep the later
    // of that and whatever another tab already stored.
    if (serverExpiry && serverExpiry > readAccessExpiry()) {
      writeAccessExpiry(serverExpiry);
    }

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function plan(delayOverride?: number) {
      if (stopped) return;
      if (timer) clearTimeout(timer);

      const expiry = readAccessExpiry();
      const delay =
        delayOverride ??
        (expiry
          ? Math.max(MIN_DELAY_MS, expiry - Date.now() - REFRESH_EARLY_MS)
          : MIN_DELAY_MS);

      timer = setTimeout(tick, delay);
    }

    async function tick() {
      if (stopped) return;

      // Hidden tabs do not refresh; the wake handler catches up when the tab
      // becomes visible again (the refresh token keeps the session alive).
      if (document.visibilityState !== "visible") return;

      const result = await refreshSession();

      if (stopped || result === "ended") return;

      plan(result === "failed" ? FAILURE_RETRY_MS : undefined);
    }

    function onWake() {
      if (document.visibilityState !== "visible") return;

      if (accessExpiresSoon()) void tick();
      else plan();
    }

    function onStorage(event: StorageEvent) {
      if (isExpiryKey(event.key)) plan();
    }

    if (needsRefresh || accessExpiresSoon()) void tick();
    else plan();

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    window.addEventListener("storage", onStorage);

    return () => {
      stopped = true;

      if (timer) clearTimeout(timer);

      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      window.removeEventListener("storage", onStorage);
    };
  }, [identity, serverExpiry, needsRefresh]);

  return null;
}
