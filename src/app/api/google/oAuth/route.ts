import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_NAMES, setCookie } from "@/lib/cookies";
import { getGoogleCallbackUrl, requireEnv } from "@/lib/env";
import { AUTH_CONFIG } from "@/lib/authConfig";

// Google বাটন শুধু এই দুই পেজে আছে, ভুল হলে এখানেই ফিরে এসে এরর দেখানো হয়
const ALLOWED_RETURN_PATHS = new Set(["/email", "/registration"]);

// GET /api/google/oAuth?from=/email
// Google লগইন শুরু করে: state ও PKCE তৈরি করে কুকিতে রেখে Google এ পাঠায়
export async function GET(request: NextRequest) {
  // query আগেই পড়া হয়, যাতে Next.js এই রুটকে প্রতি রিকোয়েস্টে চালানোর (dynamic) রুট হিসেবে চিনে
  const fromParam = request.nextUrl.searchParams.get("from");

  try {
    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    requireEnv("GOOGLE_CLIENT_SECRET");

    const callbackUrl = getGoogleCallbackUrl();

    const from =
      fromParam && ALLOWED_RETURN_PATHS.has(fromParam) ? fromParam : "/email";

    // CSRF ঠেকাতে state এবং কোড চুরি ঠেকাতে PKCE verifier/challenge
    const state = randomBytes(32).toString("hex");
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

    googleUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();

    const response = NextResponse.redirect(googleUrl);

    setCookie(
      response,
      COOKIE_NAMES.oauth,
      JSON.stringify({ state, codeVerifier, from }),
      AUTH_CONFIG.oauthStateSeconds,
    );

    return response;
  } catch (error) {
    console.error("Google OAuth initiation error:", error);

    return NextResponse.redirect(
      new URL("/email?error=auth_failed", request.nextUrl.origin),
    );
  }
}
