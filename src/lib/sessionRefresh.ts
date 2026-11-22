"use client";

import { apiRequest } from "./clientApi";

export type RefreshResult = "refreshed" | "skipped" | "ended" | "failed";

const LOCK_NAME = "rusauth-refresh";
const EXPIRY_KEY = "rusauth-access-expires-at";

/** Refresh this long before the access token expires. */
export const REFRESH_EARLY_MS = 60_000;
const RETRY_DELAYS_MS = [1000, 3000];

let inFlight: Promise<RefreshResult> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function readAccessExpiry(): number {
  try {
    return Number(localStorage.getItem(EXPIRY_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function writeAccessExpiry(expiresAt: number): void {
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return;

  try {
    localStorage.setItem(EXPIRY_KEY, String(Math.floor(expiresAt)));
  } catch {}
}

export function clearAccessExpiry(): void {
  try {
    localStorage.removeItem(EXPIRY_KEY);
  } catch {}
}

export function isExpiryKey(key: string | null): boolean {
  return key === EXPIRY_KEY;
}

export function accessExpiresSoon(): boolean {
  return readAccessExpiry() - Date.now() <= REFRESH_EARLY_MS;
}

async function runRefresh(force: boolean): Promise<RefreshResult> {
  // Read inside the lock: if another tab refreshed while this one waited,
  // the stored expiry is already fresh and there is nothing to do.
  if (!force && !accessExpiresSoon()) return "skipped";

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    const result = await apiRequest("/api/auth/refresh-token");

    if (result.ok) {
      const expiresAt = Number(result.data.accessExpiresAt);

      writeAccessExpiry(
        Number.isFinite(expiresAt) ? expiresAt : Date.now() + 5 * 60_000,
      );

      return "refreshed";
    }

    if (result.status === 401) {
      clearAccessExpiry();
      return "ended";
    }

    if (result.status === 403) return "failed";

    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }

  console.error("Silent session refresh failed after retries.");

  return "failed";
}

/**
 * Refreshes the session at most once at a time per browser: a Web Lock
 * serialises tabs, and `inFlight` de-duplicates calls inside one tab.
 * `force` skips the expiry check (used to recover from a stale cookie).
 */
export function refreshSession(force = false): Promise<RefreshResult> {
  if (inFlight) return inFlight;

  const run = (): Promise<RefreshResult> =>
    typeof navigator !== "undefined" && navigator.locks
      ? (navigator.locks.request(LOCK_NAME, () =>
          runRefresh(force),
        ) as Promise<RefreshResult>)
      : runRefresh(force);

  inFlight = run()
    .catch((): RefreshResult => "failed")
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
