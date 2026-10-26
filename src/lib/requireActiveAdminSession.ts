import type { NextRequest } from "next/server";
import pool from "@/database/pool";
import { AUTH_CONFIG } from "./authConfig";
import { COOKIE_NAMES } from "./cookieNames";
import { verifyJWT } from "./jwt";
import { matchRefreshToken, type SessionInspection } from "./session";

export interface ActiveAdminSession {
  email: string;
  username: string;
  sessionId: string;
}

interface AdminSessionRow {
  session_uid: string;
  refresh_token_hash: string;
  previous_refresh_token_hash: string | null;
  in_grace: boolean;
  email: string;
  username: string;
}

export async function inspectAdminSession(
  request: NextRequest,
): Promise<SessionInspection<ActiveAdminSession>> {
  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  if (!refreshToken) return { state: "missing" };

  const payload = await verifyJWT(refreshToken, "refresh");

  if (
    !payload ||
    typeof payload.uid !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    return { state: "revoked" };
  }

  if (payload.entityType !== "admin") return { state: "foreign" };

  const result = await pool.query<AdminSessionRow>(
    `
      SELECT
        s.session_uid,
        s.refresh_token_hash,
        s.previous_refresh_token_hash,
        COALESCE(s.rotated_at > NOW() - ($3::int * INTERVAL '1 second'), FALSE) AS in_grace,
        a.email,
        a.username
      FROM admin_sessions AS s
      JOIN admins AS a ON a.email = s.admin_email
      WHERE s.session_uid = $1
        AND s.admin_email = $2
        AND s.is_revoked = FALSE
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [payload.sessionId, payload.uid, AUTH_CONFIG.refreshGraceSeconds],
  );

  const row = result.rows[0];

  if (!row) return { state: "revoked" };

  if (matchRefreshToken(refreshToken, row) === "none")
    return { state: "stale" };

  return {
    state: "active",
    session: {
      email: row.email,
      username: row.username,
      sessionId: row.session_uid,
    },
  };
}

export async function requireActiveAdminSession(
  request: NextRequest,
): Promise<ActiveAdminSession | null> {
  const inspection = await inspectAdminSession(request);

  return inspection.state === "active" ? inspection.session : null;
}
