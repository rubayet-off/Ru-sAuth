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
  rotateSessionToken,
  tokenMatchesHash,
  type EntityType,
} from "@/lib/session";

// টোকেন বা সেশন সত্যিই অবৈধ হলে কুকি মুছে ৪০১ দেওয়া হয়
function unauthorized() {
  const response = errorResponse("Unauthorized", 401);

  clearSessionCookies(response);

  return response;
}

export async function POST(request: NextRequest) {
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
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

    // হ্যাশ না মিললে অন্য ট্যাব এইমাত্র টোকেন বদলে ফেলেছে হতে পারে
    // এ অবস্থায় কুকি মুছলে নতুন কুকিও মুছে যাবে, তাই শুধু ৪০১ দেওয়া হয়
    if (!tokenMatchesHash(refreshToken, session.refresh_token_hash)) {
      return errorResponse("Session token is out of date.", 401);
    }

    // অ্যাকাউন্ট এখনো বহাল আছে কিনা দেখা
    const accountResult =
      entityType === "user"
        ? await pool.query(
            `SELECT 1 FROM users WHERE uid = $1 AND is_account_deleted = FALSE`,
            [uid],
          )
        : await pool.query(`SELECT 1 FROM admins WHERE email = $1`, [uid]);

    if (accountResult.rowCount !== 1) return unauthorized();

    const tokens = await issueTokens(uid, session.session_uid, entityType);

    // পুরোনো হ্যাশ থাকলেই নতুনটি বসে; একসাথে দুটি রিফ্রেশে একটিই জেতে
    const rotated = await rotateSessionToken(
      entityType,
      uid,
      session.session_uid,
      session.refresh_token_hash,
      hashToken(tokens.refreshToken),
    );

    if (!rotated) return errorResponse("Session token is out of date.", 401);

    const response = jsonResponse({
      success: true,
      message: "Token refreshed successfully",
    });

    setSessionCookies(response, tokens);

    return response;
  } catch (error) {
    return handleRouteError(error, "Refresh token error");
  }
}
