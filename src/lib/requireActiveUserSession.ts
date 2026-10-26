import type { NextRequest } from "next/server";

import pool from "@/database/pool";

import { AUTH_CONFIG } from "./authConfig";
import { COOKIE_NAMES } from "./cookieNames";
import { verifyJWT } from "./jwt";
import { matchRefreshToken, type SessionInspection } from "./session";

export interface ActiveUserSession {
  uid: string;
  sessionId: string;
  email: string;
  username: string;
  provider: "CREDENTIALS" | "GOOGLE";
}

interface SessionRow {
  session_uid: string;
  user_id: string;
  refresh_token_hash: string;
  previous_refresh_token_hash: string | null;
  in_grace: boolean;
  email: string;
  username: string;
  provider: "CREDENTIALS" | "GOOGLE";
}

export async function inspectUserSession(
  request: NextRequest,
): Promise<SessionInspection<ActiveUserSession>> {
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

  if (payload.entityType !== "user") return { state: "foreign" };
  const result = await pool.query<SessionRow>(
    `
      SELECT
        s.session_uid,
        s.user_id,
        s.refresh_token_hash,
        s.previous_refresh_token_hash,
        COALESCE(s.rotated_at > NOW() - ($3::int * INTERVAL '1 second'), FALSE) AS in_grace,
        u.email,
        u.username,
        u.provider
      FROM sessions AS s
      JOIN users AS u ON u.uid = s.user_id
      WHERE s.session_uid = $1
        AND s.user_id = $2
        AND s.is_revoked = FALSE
        AND s.expires_at > NOW()
        AND u.is_account_deleted = FALSE
        AND u.is_verified = TRUE
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
      uid: row.user_id,
      sessionId: row.session_uid,
      email: row.email,
      username: row.username,
      provider: row.provider,
    },
  };
}

export async function requireActiveUserSession(
  request: NextRequest,
): Promise<ActiveUserSession | null> {
  const inspection = await inspectUserSession(request);

  return inspection.state === "active" ? inspection.session : null;
}
