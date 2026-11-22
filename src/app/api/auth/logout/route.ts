import type { NextRequest } from "next/server";

import {
  errorResponse,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import { COOKIE_NAMES, clearAllAuthCookies } from "@/lib/cookies";
import { verifyJWT } from "@/lib/jwt";
import { revokeSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const accessToken = request.cookies.get(COOKIE_NAMES.access)?.value;
    const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;
    let payload = accessToken ? await verifyJWT(accessToken, "access") : null;

    if (!payload && refreshToken) {
      payload = await verifyJWT(refreshToken, "refresh");
    }

    if (
      payload &&
      typeof payload.uid === "string" &&
      typeof payload.sessionId === "string" &&
      (payload.entityType === "user" || payload.entityType === "admin")
    ) {
      await revokeSession(payload.entityType, payload.uid, payload.sessionId);
    }

    const response = jsonResponse({
      success: true,
      message: "You have been logged out.",
    });
    clearAllAuthCookies(response);

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    const response = errorResponse(
      "Could not complete logout. Please try again.",
      500,
    );

    clearAllAuthCookies(response);

    return response;
  }
}
