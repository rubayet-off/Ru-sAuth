import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import {
  COOKIE_NAMES,
  clearSessionCookies,
  setSessionCookies,
} from "@/lib/cookies";
import { verifyJWT } from "@/lib/jwt";
import {
  findActiveSession,
  hashToken,
  issueTokens,
  matchRefreshToken,
  rotateSessionToken,
  type EntityType,
} from "@/lib/session";

function unauthorized() {
  const response = errorResponse("Unauthorized", 401);

  clearSessionCookies(response);

  return response;
}

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Security check failed", 403);
  }

  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  if (!refreshToken) return unauthorized();

  try {
    const payload = await verifyJWT(refreshToken, "refresh");

    if (
      !payload ||
      typeof payload.uid !== "string" ||
      typeof payload.sessionId !== "string" ||
      (payload.entityType !== "user" && payload.entityType !== "admin")
    ) {
      return unauthorized();
    }

    const uid = payload.uid;
    const sessionId = payload.sessionId;
    const entityType: EntityType = payload.entityType;

    const session = await findActiveSession(entityType, uid, sessionId);

    if (!session) return unauthorized();

    const match = matchRefreshToken(refreshToken, session);

    if (match === "none") {
      return errorResponse("Session token is out of date.", 401);
    }

    if (match === "grace") {
      return jsonResponse({
        success: true,
        message: "Token was already refreshed.",
        rotated: false,
      });
    }

    const accountResult =
      entityType === "user"
        ? await pool.query(
            `SELECT 1 FROM users WHERE uid = $1 AND is_account_deleted = FALSE`,
            [uid],
          )
        : await pool.query(`SELECT 1 FROM admins WHERE email = $1`, [uid]);

    if (accountResult.rowCount !== 1) return unauthorized();

    const tokens = await issueTokens(uid, session.session_uid, entityType);

    const rotated = await rotateSessionToken(
      entityType,
      uid,
      session.session_uid,
      session.refresh_token_hash,
      hashToken(tokens.refreshToken),
    );

    if (!rotated) {
      return jsonResponse({
        success: true,
        message: "Token was already refreshed.",
        rotated: false,
      });
    }

    const response = jsonResponse({
      success: true,
      message: "Token refreshed successfully",
      rotated: true,
    });

    setSessionCookies(response, tokens);

    return response;
  } catch (error) {
    return handleRouteError(error, "Refresh token error");
  }
}
