import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import { AUTH_CONFIG } from "@/lib/authConfig";
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
  revokeSession,
  rotateSessionToken,
  type EntityType,
} from "@/lib/session";

const MAX_ROTATION_ATTEMPTS = 2;

function unauthorized(message = "Unauthorized") {
  const response = errorResponse(message, 401);

  clearSessionCookies(response);

  return response;
}

/*
 * Refresh-token rotation
 *
 * - Current token presented  -> rotate (current becomes "previous").
 * - Previous token presented within the grace window -> the browser never
 *   received the last rotation (aborted fetch, closed tab, network drop).
 *   Rotate again and send fresh cookies, so the browser recovers instead of
 *   being stuck with an old cookie and logged out a few seconds later.
 *   (The old code answered "already refreshed" without cookies here, which is
 *   what broke sessions.)
 * - Any other token for a live session -> reuse of an old token, which is a
 *   sign of theft. The session is revoked.
 */
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

    const accountResult =
      entityType === "user"
        ? await pool.query(
            `SELECT 1 FROM users WHERE uid = $1 AND is_verified = TRUE`,
            [uid],
          )
        : await pool.query(`SELECT 1 FROM admins WHERE email = $1`, [uid]);

    if (accountResult.rowCount !== 1) return unauthorized();

    for (let attempt = 0; attempt < MAX_ROTATION_ATTEMPTS; attempt += 1) {
      const session = await findActiveSession(entityType, uid, sessionId);

      if (!session) return unauthorized();

      const match = matchRefreshToken(refreshToken, session);

      if (match === "none") {
        await revokeSession(entityType, uid, sessionId);

        return unauthorized("This session is no longer valid. Please sign in again.");
      }

      const tokens = await issueTokens(uid, session.session_uid, entityType);

      const rotated = await rotateSessionToken(
        entityType,
        uid,
        session.session_uid,
        session.refresh_token_hash,
        hashToken(tokens.refreshToken),
      );

      // Another request rotated between our read and write: read again.
      if (!rotated) continue;

      const response = jsonResponse({
        success: true,
        message: "Token refreshed successfully",
        rotated: true,
        accessExpiresAt: Date.now() + AUTH_CONFIG.accessTokenSeconds * 1000,
      });

      setSessionCookies(response, tokens);

      return response;
    }

    return errorResponse("The session is being refreshed. Please try again.", 409);
  } catch (error) {
    return handleRouteError(error, "Refresh token error");
  }
}
