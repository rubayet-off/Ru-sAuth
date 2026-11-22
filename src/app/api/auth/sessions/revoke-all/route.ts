import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const current = await requireActiveUserSession(request);

    if (!current) {
      return errorResponse(
        "Your session has expired. Please sign in again.",
        401,
      );
    }

    const result = await pool.query(
      `
        UPDATE sessions
        SET is_revoked = TRUE, revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = $1
          AND session_uid <> $2
          AND is_revoked = FALSE
          AND expires_at > NOW()
        RETURNING session_uid
      `,
      [current.uid, current.sessionId],
    );

    const revokedCount = result.rowCount ?? 0;

    return jsonResponse({
      success: true,
      revokedCount,
      message:
        revokedCount === 0
          ? "There are no other active sessions to revoke."
          : `Revoked ${revokedCount} other session(s).`,
    });
  } catch (error) {
    return handleRouteError(error, "Revoke-all-sessions error");
  }
}
