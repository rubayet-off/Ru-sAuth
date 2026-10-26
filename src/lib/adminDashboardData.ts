import pool from "@/database/pool";

const USER_LIST_LIMIT = 200;
const SESSION_LIST_LIMIT = 50;

interface AdminRow {
  email: string;
  username: string;
  created_at: Date | string;
  last_login: Date | string | null;
}

interface AdminSessionRow {
  session_uid: string;
  browser_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  created_at: Date | string;
  expires_at: Date | string;
  is_revoked: boolean;
}

interface UserRow {
  uid: string;
  username: string;
  email: string;
  profile_image_public_url: string | null;
  created_at: Date | string;
  deleted_at: Date | string | null;
}

interface CountRow {
  active: string;
  deleted: string;
}

export interface DashboardSnapshot {
  admin: {
    name: string;
    email: string;
    lastLogin: string | null;
    createdAt: string;
  };
  sessions: {
    id: string;
    browser: string;
    device: "desktop" | "mobile";
    ip: string;
    startedAt: string;
    current: boolean;
    revoked: boolean;
  }[];
  users: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
    createdAt: string;
    deletedAt: string | null;
  }[];
  counts: { active: number; deleted: number };
}

function toISOStringOrNull(value: Date | string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function loadDashboardSnapshot(
  adminEmail: string,
  currentSessionId: string,
): Promise<DashboardSnapshot | null> {
  const [adminResult, sessionResult, countResult, userResult] =
    await Promise.all([
      pool.query<AdminRow>(
        `SELECT email, username, created_at, last_login FROM admins WHERE email = $1 LIMIT 1`,
        [adminEmail],
      ),
      pool.query<AdminSessionRow>(
        `
        SELECT
          session_uid, browser_name, device_type, ip_address,
          created_at, expires_at, is_revoked
        FROM admin_sessions
        WHERE admin_email = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
        [adminEmail, SESSION_LIST_LIMIT],
      ),
      pool.query<CountRow>(
        `
        SELECT
          COUNT(*) FILTER (WHERE is_account_deleted = FALSE) AS active,
          COUNT(*) FILTER (WHERE is_account_deleted = TRUE) AS deleted
        FROM users
        WHERE is_verified = TRUE
      `,
      ),
      pool.query<UserRow>(
        `
        SELECT
          uid, username, email, profile_image_public_url, created_at, deleted_at
        FROM users
        WHERE is_verified = TRUE
        ORDER BY created_at DESC
        LIMIT $1
      `,
        [USER_LIST_LIMIT],
      ),
    ]);

  const admin = adminResult.rows[0];

  if (!admin) return null;

  const now = Date.now();

  return {
    admin: {
      name: admin.username,
      email: admin.email,
      lastLogin: toISOStringOrNull(admin.last_login),
      createdAt:
        toISOStringOrNull(admin.created_at) ?? new Date(0).toISOString(),
    },
    sessions: sessionResult.rows.map((item) => {
      const expiry = new Date(item.expires_at).getTime();
      const isExpired = !Number.isFinite(expiry) || expiry <= now;
      const deviceType = item.device_type?.toLowerCase();

      return {
        id: item.session_uid,
        browser: item.browser_name || "Unknown browser",
        device:
          deviceType === "mobile" || deviceType === "tablet"
            ? ("mobile" as const)
            : ("desktop" as const),
        ip: item.ip_address || "Unknown IP",
        startedAt:
          toISOStringOrNull(item.created_at) ?? new Date(0).toISOString(),
        current: item.session_uid === currentSessionId,
        revoked: item.is_revoked || isExpired,
      };
    }),
    users: userResult.rows.map((item) => ({
      id: item.uid,
      name: item.username,
      email: item.email,
      imageUrl: item.profile_image_public_url,
      createdAt:
        toISOStringOrNull(item.created_at) ?? new Date(0).toISOString(),
      deletedAt: toISOStringOrNull(item.deleted_at),
    })),
    counts: {
      active: Number(countResult.rows[0]?.active ?? 0),
      deleted: Number(countResult.rows[0]?.deleted ?? 0),
    },
  };
}
