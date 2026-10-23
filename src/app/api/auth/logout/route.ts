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
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const accessToken = request.cookies.get(COOKIE_NAMES.access)?.value;
    const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

    // access টোকেন বৈধ থাকলে সেটি দিয়েই সেশন চেনা যায়, নইলে refresh টোকেন দিয়ে
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

    // টোকেন অবৈধ হলেও লগআউট সফল ধরা হয়, কুকি সবসময় মুছে যায়
    clearAllAuthCookies(response);

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // ডাটাবেসে সমস্যা হলেও ব্রাউজারের কুকি মুছে দেওয়া হয়
    const response = errorResponse(
      "Could not complete logout. Please try again.",
      500,
    );

    clearAllAuthCookies(response);

    return response;
  }
}

