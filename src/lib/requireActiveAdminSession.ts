import type { NextRequest } from "next/server";

import pool from "@/database/pool";

import { COOKIE_NAMES } from "./cookies";
import { verifyJWT } from "./jwt";
import { tokenMatchesHash } from "./session";

export interface ActiveAdminSession {
  email: string;
  username: string;
  sessionId: string;
}

interface AdminSessionRow {
  session_uid: string;
  refresh_token_hash: string;
  email: string;
  username: string;
}

// API route এ সচল অ্যাডমিন সেশন নিশ্চিত করে; না থাকলে null ফেরত দেয়
// সাধারণ ব্যবহারকারীর টোকেনে entityType "user" থাকে এবং সেশনও আলাদা টেবিলে, তাই সেটি এখানে কখনো পাস করে না
export async function requireActiveAdminSession(
  request: NextRequest,
): Promise<ActiveAdminSession | null> {
  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  if (!refreshToken) return null;

  const payload = await verifyJWT(refreshToken, "refresh");

  if (
    !payload ||
    payload.entityType !== "admin" ||
    typeof payload.uid !== "string" ||
    typeof payload.sessionId !== "string"
  ) {
    return null;
  }

  const result = await pool.query<AdminSessionRow>(
    `
      SELECT
        s.session_uid,
        s.refresh_token_hash,
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
    [payload.sessionId, payload.uid],
  );

  const row = result.rows[0];

  if (!row || !tokenMatchesHash(refreshToken, row.refresh_token_hash)) {
    return null;
  }

  return {
    email: row.email,
    username: row.username,
    sessionId: row.session_uid,
  };
}
