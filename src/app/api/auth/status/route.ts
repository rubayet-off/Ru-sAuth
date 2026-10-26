import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import { handleRouteError, jsonResponse } from "@/lib/apiSecurity";
import { AUTH_CONFIG } from "@/lib/authConfig";
import { COOKIE_NAMES, clearAllAuthCookies } from "@/lib/cookies";
import { verifyJWT } from "@/lib/jwt";
import { matchRefreshToken } from "@/lib/session";

interface StatusRow {
  refresh_token_hash: string;
  previous_refresh_token_hash: string | null;
  in_grace: boolean;
  uid: string;
  username: string;
  email: string;
  profile_image_public_url: string | null;
  revision: string;
}

function signedOut(reason: "missing" | "revoked" | "foreign") {
  const response = jsonResponse(
    { message: "This session is no longer active.", reason },
    { status: 401 },
  );

  if (reason !== "foreign") clearAllAuthCookies(response);

  return response;
}

export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  try {
    if (!refreshToken) return signedOut("missing");

    const payload = await verifyJWT(refreshToken, "refresh");

    if (
      !payload ||
      typeof payload.uid !== "string" ||
      typeof payload.sessionId !== "string"
    ) {
      return signedOut("revoked");
    }

    if (payload.entityType !== "user") return signedOut("foreign");

    const result = await pool.query<StatusRow>(
      `
        SELECT
          s.refresh_token_hash,
          s.previous_refresh_token_hash,
          COALESCE(s.rotated_at > NOW() - ($3::int * INTERVAL '1 second'), FALSE) AS in_grace,
          u.uid,
          u.username,
          u.email,
          u.profile_image_public_url,
          (
            SELECT CONCAT(
              COUNT(*) FILTER (WHERE x.is_revoked = FALSE AND x.expires_at > NOW()),
              ':',
              COALESCE(
                EXTRACT(EPOCH FROM MAX(GREATEST(x.created_at, COALESCE(x.revoked_at, x.created_at))))::bigint,
                0
              )
            )
            FROM sessions AS x
            WHERE x.user_id = s.user_id
          ) AS revision
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
    if (!row) return signedOut("revoked");

    if (matchRefreshToken(refreshToken, row) === "none") {
      return jsonResponse(
        { message: "Session token is out of date.", reason: "stale" },
        { status: 409 },
      );
    }

    return jsonResponse({
      success: true,
      user: {
        uid: row.uid,
        username: row.username,
        email: row.email,
        profile_photo_url: row.profile_image_public_url,
      },
      sessionsRevision: row.revision,
    });
  } catch (error) {
    return handleRouteError(error, "Auth status error");
  }
}
