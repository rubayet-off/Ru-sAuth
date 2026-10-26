import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_NAMES, setCookie } from "@/lib/cookies";
import { getGoogleCallbackUrl, requireEnv } from "@/lib/env";
import { readRequestEntity } from "@/lib/requestEntity";
import { AUTH_CONFIG } from "@/lib/authConfig";

const ALLOWED_RETURN_PATHS = new Set(["/email", "/registration"]);

export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const signedInAs = await readRequestEntity(request);

  if (signedInAs) {
    return NextResponse.redirect(
      new URL(
        signedInAs === "admin" ? "/admin/dashboard" : "/",
        request.nextUrl.origin,
      ),
    );
  }

  try {
    const clientId = requireEnv("GOOGLE_CLIENT_ID");
    requireEnv("GOOGLE_CLIENT_SECRET");

    const callbackUrl = getGoogleCallbackUrl();

    const from =
      fromParam && ALLOWED_RETURN_PATHS.has(fromParam) ? fromParam : "/email";

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
