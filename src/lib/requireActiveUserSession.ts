import type { NextRequest } from "next/server";

import pool from "@/database/pool";

import { COOKIE_NAMES } from "./cookies";
import { verifyJWT } from "./jwt";
import { tokenMatchesHash } from "./session";

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
  email: string;
  username: string;
  provider: "CREDENTIALS" | "GOOGLE";
}

// API route এ সচল ব্যবহারকারী সেশন নিশ্চিত করে; না থাকলে null ফেরত দেয়
export async function requireActiveUserSession(
  request: NextRequest,
): Promise<ActiveUserSession | null> {
  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  if (!refreshToken) return null;

  const payload = await verifyJWT(refreshToken, "refresh");

  if (
    !payload ||
    payload.entityType !== "user" ||
    typeof payload.uid !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    return null;
  }

  const result = await pool.query<SessionRow>(
    `
      SELECT
        s.session_uid,
        s.user_id,
        s.refresh_token_hash,
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
    [payload.sessionId, payload.uid],
  );

  const row = result.rows[0];

  if (!row || !tokenMatchesHash(refreshToken, row.refresh_token_hash)) {
    return null;
  }

  return {
    uid: row.user_id,
    sessionId: row.session_uid,
    email: row.email,
    username: row.username,
    provider: row.provider,
  };
}
