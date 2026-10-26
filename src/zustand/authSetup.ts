"use client";

import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/clientApi";
import { useAuthStore, type Admin, type User } from "./authStore";

interface AuthStoreSetupProps {
  user: User | null;
  admin: Admin | null;
  entityType: "user" | "admin" | null;
}

const LOCK_NAME = "rusauth-refresh";
const LAST_REFRESH_KEY = "rusauth-last-refresh";
const SKIP_IF_REFRESHED_WITHIN_MS = 15_000;
const PROACTIVE_INTERVAL_MS = 10 * 60 * 1000;
const RETRY_DELAYS_MS = [1000, 3000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readLastRefresh(): number {
  try {
    return Number(localStorage.getItem(LAST_REFRESH_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastRefresh(): void {
  try {
    localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
  } catch {}
}

async function runRefresh(): Promise<void> {
  if (Date.now() - readLastRefresh() < SKIP_IF_REFRESHED_WITHIN_MS) return;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const result = await apiRequest("/api/auth/refresh-token");

    if (result.ok) {
      writeLastRefresh();
      return;
    }

    if (result.status === 401 || result.status === 403) return;
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }

  console.error("Silent session refresh failed after retries.");
}

async function refreshSession(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(LOCK_NAME, async () => {
      await runRefresh();
    });

    return;
  }

  await runRefresh();
}

export default function AuthStoreSetup({
  user,
  admin,
  entityType,
}: AuthStoreSetupProps) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const refreshStarted = useRef(false);

  useEffect(() => {
    const current = useAuthStore.getState();

    const sameUser = user && current.user?.uid === user.uid;
    const sameAdmin = admin && current.admin?.email === admin.email;

    if (sameUser || sameAdmin) return;

    setAuth({ user, admin, entityType });
  }, [user, admin, entityType, setAuth]);

  useEffect(() => {
    const needsRefresh =
      entityType === "user"
        ? user?.need_refresh
        : entityType === "admin"
          ? admin?.need_refresh
          : false;

    if (!needsRefresh || refreshStarted.current) return;

    refreshStarted.current = true;

    void refreshSession();
  }, [user, admin, entityType]);

  useEffect(() => {
    if (!user && !admin) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function schedule() {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await refreshSession();
        if (!stopped) schedule();
      }, PROACTIVE_INTERVAL_MS);
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const last = readLastRefresh();

      if (last > 0 && Date.now() - last > PROACTIVE_INTERVAL_MS) {
        void refreshSession();
      }
    }

    schedule();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, admin]);

  return null;
}
