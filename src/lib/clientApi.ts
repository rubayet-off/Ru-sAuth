import type { User } from "@/zustand/authStore";

export const UNEXPECTED_RESPONSE = "Unexpected server response. Please try again.";
export const NETWORK_ERROR = "Network error. Please try again.";

export interface ApiResult {
  ok: boolean;
  status: number;
  message: string;
  data: Record<string, unknown>;
}

export async function apiRequest(
  url: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
): Promise<ApiResult> {
  const hasBody = options.body !== undefined;

  try {
    const response = await fetch(url, {
      method: options.method ?? "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    const parsed: unknown = await response.json().catch(() => null);

    const data =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    return {
      ok: response.ok,
      status: response.status,
      message: typeof data.message === "string" ? data.message : "",
      data,
    };
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR, data: {} };
  }
}

export function parseAuthUser(value: unknown): User | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;

  if (
    typeof raw.uid !== "string" ||
    typeof raw.sessionId !== "string" ||
    typeof raw.username !== "string" ||
    typeof raw.email !== "string" ||
    raw.is_verified !== true ||
    !(typeof raw.profile_photo_url === "string" || raw.profile_photo_url === null)
  ) {
    return null;
  }

  return {
    uid: raw.uid,
    sessionId: raw.sessionId,
    username: raw.username,
    email: raw.email,
    is_verified: true,
    profile_photo_url: raw.profile_photo_url,
  };
}

export function parseProfileSnapshot(data: Record<string, unknown>): {
  username: string;
  profile_photo_url: string | null;
  sessionsRevision: string;
} | null {
  const user = data.user;

  if (!user || typeof user !== "object") return null;

  const raw = user as Record<string, unknown>;

  if (
    typeof raw.username !== "string" ||
    !(typeof raw.profile_photo_url === "string" || raw.profile_photo_url === null) ||
    typeof data.sessionsRevision !== "string"
  ) {
    return null;
  }

  return {
    username: raw.username,
    profile_photo_url: raw.profile_photo_url,
    sessionsRevision: data.sessionsRevision,
  };
}
