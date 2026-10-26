import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";

interface RouteContext {
  params: Promise<{ sessionUid: string }>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: RouteContext) {
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

    const { sessionUid } = await context.params;

    if (!UUID_PATTERN.test(sessionUid)) {
      return errorResponse("Invalid session ID.", 400);
    }

    if (sessionUid === current.sessionId) {
      return errorResponse(
        "This is your current session. Use Logout to end it.",
        409,
      );
    }

    const result = await pool.query(
      `
        UPDATE sessions
        SET is_revoked = TRUE, revoked_at = COALESCE(revoked_at, NOW())
        WHERE session_uid = $1
          AND user_id = $2
          AND is_revoked = FALSE
          AND expires_at > NOW()
        RETURNING session_uid
      `,
      [sessionUid, current.uid],
    );

    if (result.rowCount !== 1) {
      return errorResponse("The active session was not found.", 404);
    }

    return jsonResponse({
      success: true,
      sessionUid,
      message: "Session revoked successfully.",
    });
  } catch (error) {
    return handleRouteError(error, "Revoke-session error");
  }
}