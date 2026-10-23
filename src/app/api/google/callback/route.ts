import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { withTransaction } from "@/database/transaction";
import {
  COOKIE_NAMES,
  clearCookie,
  clearFlowCookie,
  setSessionCookies,
} from "@/lib/cookies";
import { getGoogleCallbackUrl, requireEnv } from "@/lib/env";
import { createUserSession } from "@/lib/session";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

const ALLOWED_RETURN_PATHS = new Set(["/email", "/registration"]);

interface OAuthState {
  state: string;
  codeVerifier: string;
  from: string;
}

interface GoogleUserInfo {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
}

interface AppUserRow {
  uid: string;
  google_id: string | null;
  is_verified: boolean;
  is_account_deleted: boolean;
}

// Google লগইনের প্রত্যাশিত ব্যর্থতা বোঝাতে এই এরর ব্যবহার হয়
class OAuthError extends Error {}

// ফেরার পথ অনুমোদিত তালিকায় না থাকলে /email ধরা হয়
function safeReturnPath(value: unknown): string {
  return typeof value === "string" && ALLOWED_RETURN_PATHS.has(value)
    ? value
    : "/email";
}

// এরর কোডসহ আগের পেজে ফেরত পাঠায় এবং oauth কুকি মুছে দেয়
function redirectWithError(
  request: NextRequest,
  from: string,
  error: "invalid_session" | "auth_failed",
): NextResponse {
  const destination = new URL(from, request.nextUrl.origin);
  destination.searchParams.set("error", error);

  const response = NextResponse.redirect(destination);

  clearCookie(response, COOKIE_NAMES.oauth);

  return response;
}

// দুটি স্ট্রিং সমান কিনা নিরাপদভাবে (timing attack ছাড়া) মেলায়
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

// Google এর নাম হুবহু (শুধু আগে-পরের ফাঁকা বাদ দিয়ে) ইউজারনেম হয়; নাম না থাকলে ইমেইলের প্রথম অংশ
function makeGoogleUsername(name: string | null, email: string): string {
  return (name || email.split("@")[0]).slice(0, 255);
}

// GET /api/google/callback
// Google থেকে ফিরে এসে কোড যাচাই করে ব্যবহারকারী খুঁজে বা তৈরি করে লগইন সেশন দেয়
export async function GET(request: NextRequest) {
  // কুকি পড়া try ব্লকের বাইরে রাখা হয়েছে, যাতে Next.js এর dynamic রেন্ডারিং সংকেত আটকে না যায়
  const cookieValue = request.cookies.get(COOKIE_NAMES.oauth)?.value;

  let from = "/email";

  try {
    if (!cookieValue) {
      return redirectWithError(request, "/email", "invalid_session");
    }

    let saved: OAuthState;

    try {
      saved = JSON.parse(cookieValue) as OAuthState;
      from = safeReturnPath(saved.from);
    } catch {
      return redirectWithError(request, "/email", "invalid_session");
    }

    const returnedState = request.nextUrl.searchParams.get("state");

    // state না মিললে এই রিকোয়েস্ট আমাদের শুরু করা নয়
    if (
      typeof saved.state !== "string" ||
      typeof saved.codeVerifier !== "string" ||
      !returnedState ||
      !safeEqual(returnedState, saved.state)
    ) {
      return redirectWithError(request, from, "invalid_session");
    }

    // ব্যবহারকারী অনুমতি না দিলে কোড থাকে না
    const code = request.nextUrl.searchParams.get("code");

    if (request.nextUrl.searchParams.get("error") || !code) {
      return redirectWithError(request, from, "auth_failed");
    }

    // ১. কোডের বদলে Google এর access token নেওয়া
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requireEnv("GOOGLE_CLIENT_ID"),
        client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
        redirect_uri: getGoogleCallbackUrl(),
        grant_type: "authorization_code",
        code_verifier: saved.codeVerifier,
      }),
      cache: "no-store",
    });

    const tokenData: { access_token?: unknown } | null = await tokenResponse
      .json()
      .catch(() => null);

    if (!tokenResponse.ok || typeof tokenData?.access_token !== "string") {
      throw new OAuthError("Google token exchange failed.");
    }

    // ২. Google প্রোফাইল তথ্য নেওয়া
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
        cache: "no-store",
      },
    );

    const googleUser: GoogleUserInfo | null = await profileResponse
      .json()
      .catch(() => null);

    // যাচাই করা ইমেইল ছাড়া লগইন গ্রহণযোগ্য নয়
    if (
      !profileResponse.ok ||
      typeof googleUser?.sub !== "string" ||
      typeof googleUser.email !== "string" ||
      googleUser.email_verified !== true
    ) {
      throw new OAuthError("Google did not return a verified email.");
    }

    const googleId = googleUser.sub;
    const email = normalizeEmail(googleUser.email);

    if (!isValidEmail(email)) {
      throw new OAuthError("Google returned an invalid email.");
    }

    const name =
      typeof googleUser.name === "string" ? googleUser.name.trim() : null;

    // ৩. ডাটাবেসে ব্যবহারকারী খুঁজে বা তৈরি করে সেশন বানানো
    const { tokens } = await withTransaction(async (client) => {
      let user: AppUserRow | undefined;

      // আগে Google পরিচয় (google_id) দিয়ে খোঁজা
      const byGoogleId = await client.query<AppUserRow>(
        `
          SELECT uid, google_id, is_verified, is_account_deleted
          FROM users
          WHERE google_id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [googleId],
      );

      user = byGoogleId.rows[0];

      if (user?.is_account_deleted) {
        throw new OAuthError("This account is unavailable.");
      }

      if (user) {
        // আগের সংস্করণে নামের পেছনে র‍্যান্ডম কোড (_ab12cd34) বসত; সেই নাম থাকলে Google এর আসল নাম বসানো হয়
        // ছবি এখানে আর বসানো হয় না, নইলে ব্যবহারকারী ছবি মুছে ফেললেও লগইনে Google এর ছবি ফিরে আসত
        await client.query(
          `
            UPDATE users
            SET is_verified = TRUE,
                last_login = NOW(),
                username = CASE
                  WHEN provider = 'GOOGLE'
                   AND $1::text IS NOT NULL
                   AND username ~ '_[0-9a-f]{8}$'
                  THEN $1::text
                  ELSE username
                END
            WHERE uid = $2
          `,
          [name ? makeGoogleUsername(name, email) : null, user.uid],
        );
      } else {
        // না পেলে একই ইমেইলের অ্যাকাউন্ট খোঁজা
        const byEmail = await client.query<AppUserRow>(
          `
            SELECT uid, google_id, is_verified, is_account_deleted
            FROM users
            WHERE LOWER(email) = $1
            LIMIT 1
            FOR UPDATE
          `,
          [email],
        );

        user = byEmail.rows[0];

        if (user) {
          if (
            user.is_account_deleted ||
            (user.google_id && user.google_id !== googleId)
          ) {
            throw new OAuthError(
              "This email is already associated with another account.",
            );
          }

          // যাচাই না হওয়া অ্যাকাউন্টের পাসওয়ার্ড অন্য কেউ আগে বসিয়ে রাখতে পারে
          // তাই আসল ইমেইল মালিক (Google) অ্যাকাউন্ট নিলে সেই পাসওয়ার্ড মুছে দেওয়া হয়
          const takeOver = !user.is_verified;

          await client.query(
            `
              UPDATE users
              SET google_id = $1,
                  is_verified = TRUE,
                  last_login = NOW(),
                  provider = CASE WHEN $3::boolean THEN 'GOOGLE'::provider_type ELSE provider END,
                  password_hash = CASE WHEN $3::boolean THEN NULL ELSE password_hash END
              WHERE uid = $2
            `,
            [googleId, user.uid, takeOver],
          );

          if (takeOver) {
            await client.query(`DELETE FROM otp_tokens WHERE user_id = $1`, [user.uid]);
          }
        } else {
          // কোনোটিই না পেলে নতুন Google অ্যাকাউন্ট তৈরি
          const uid = randomUUID();

          await client.query(
            `
              INSERT INTO users (
                uid, username, email, google_id, provider,
                password_hash, is_verified, last_login
              )
              VALUES ($1, $2, $3, $4, 'GOOGLE', NULL, TRUE, NOW())
            `,
            [uid, makeGoogleUsername(name, email), email, googleId],
          );

          user = {
            uid,
            google_id: googleId,
            is_verified: true,
            is_account_deleted: false,
          };
        }
      }

      // Ru'sAuth এর নিজস্ব সেশন (Google এর টোকেন নয়)
      const sessionTokens = await createUserSession(client, request, user.uid);

      return { tokens: sessionTokens };
    });

    // সফল: হোমে পাঠানো, সেশন কুকি বসানো, অস্থায়ী কুকি মোছা
    const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));

    response.headers.set("Cache-Control", "no-store");

    setSessionCookies(response, tokens);
    clearFlowCookie(response);
    clearCookie(response, COOKIE_NAMES.oauth);

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);

    return redirectWithError(request, from, "auth_failed");
  }
}
