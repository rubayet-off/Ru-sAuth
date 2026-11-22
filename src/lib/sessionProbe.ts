import { apiRequest } from "./clientApi";

export type SessionKind = "user" | "admin";

export type SessionProbe =
  | { state: "alive" }
  | { state: "stale" }
  | { state: "ended"; reason: "missing" | "revoked" | "foreign" }
  | { state: "unknown" };

export async function probeSession(kind: SessionKind): Promise<SessionProbe> {
  const url = kind === "admin" ? "/api/admin/dashboard" : "/api/auth/status";
  const result = await apiRequest(url, { method: "GET" });
  if (result.ok) return { state: "alive" };
  if (result.status === 409) return { state: "stale" };
  if (result.status === 401) {
    const reason = result.data.reason;

    return {
      state: "ended",
      reason:
        reason === "foreign" || reason === "missing" || reason === "revoked"
          ? reason
          : "revoked",
    };
  }

  return { state: "unknown" };
}

export const MAX_CONSECUTIVE_STALE = 5;
