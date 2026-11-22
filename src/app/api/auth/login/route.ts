import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import { withTransaction } from "@/database/transaction";
import {
  ApiError,
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/apiSecurity";
import { AUTH_CONFIG } from "@/lib/authConfig";
import {
  checkUserIpRateLimit,
  checkUserRateLimit,
  firstBlocked,
  rateLimitResponse,
} from "@/lib/rateLimit";
import {
  clearFlowCookie,
  setFlowCookie,
  setSessionCookies,
} from "@/lib/cookies";
import { createFlowToken } from "@/lib/flowToken";
import { verifyPassword } from "@/lib/passwordHash";
import { readRequestEntity } from "@/lib/requestEntity";
import { createUserSession } from "@/lib/session";
import { getOtpCooldownSeconds, sendOTP } from "@/lib/sendOTP";
import {
  PASSWORD_MAX_BYTES,
  byteLength,
  isValidEmail,
  normalizeEmail,
} from "@/lib/validation";

interface UserRow {
  uid: string;
  username: string;
  email: string;
  password_hash: string | null;
  provider: "CREDENTIALS" | "GOOGLE";
  is_verified: boolean;
  profile_image_public_url: string | null;
}

const INVALID_CREDENTIALS = "Invalid email or password.";

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  if (await readRequestEntity(request)) {
    return errorResponse("You are already signed in.", 409);
  }

  try {
    const body = await readJsonBody(request);

    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return errorResponse("Please enter your email and password.", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Please enter a valid email address.", 400);
    }

    const blocked = await firstBlocked([
      checkUserRateLimit(email),
      checkUserIpRateLimit(request, "login"),
    ]);

    if (blocked) return rateLimitResponse(blocked);

    if (byteLength(password) > PASSWORD_MAX_BYTES) {
      await verifyPassword(password, null);
      return errorResponse(INVALID_CREDENTIALS, 401);
    }

    const result = await pool.query<UserRow>(
      `
        SELECT
          uid, username, email, password_hash, provider, is_verified,
          profile_image_public_url
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
      `,
      [email],
    );

    const user = result.rows[0];

    // bcrypt runs outside any transaction so no row lock or pooled connection
    // is held during the slow hash comparison.
    const passwordMatches = await verifyPassword(password, user?.password_hash);

    if (user && !user.password_hash && user.provider === "GOOGLE") {
      return errorResponse(
        "This account uses Google sign-in. Please continue with Google.",
        409,
      );
    }

    if (!user || !passwordMatches) {
      return errorResponse(INVALID_CREDENTIALS, 401);
    }

    if (!user.is_verified) {
      const verificationToken = await createFlowToken({
        purpose: "verify-account",
        email: user.email,
        uid: user.uid,
      });

      const cooldown = await getOtpCooldownSeconds(
        user.uid,
        "ACCOUNT_VERIFICATION",
      );
      const otpSentRecently = cooldown > 0;

      let emailSent = true;

      if (!otpSentRecently) {
        try {
          await sendOTP(user.email, user.uid, "ACCOUNT_VERIFICATION");
        } catch (error) {
          emailSent = false;
          console.error("Login verification OTP error:", error);
        }
      }

      const response = jsonResponse({
        success: true,
        is_verified: false,
        message: otpSentRecently
          ? "Please verify your email. Check your inbox for the code we sent, or resend it after the cooldown."
          : emailSent
            ? "Please verify your email to finish signing in. We sent you a code."
            : "Please verify your email. We could not send the code, so use Resend OTP.",
        redirect: "/otp-verification",
      });

      setFlowCookie(response, verificationToken);

      return response;
    }

    const tokens = await withTransaction(async (client) => {
      // Re-check inside the transaction: the password must still be the one we
      // just verified and the account must still be active.
      const updateResult = await client.query(
        `
          UPDATE users
          SET last_login = NOW()
          WHERE uid = $1
            AND password_hash = $2
            AND is_verified = TRUE
        `,
        [user.uid, user.password_hash],
      );

      if (updateResult.rowCount !== 1) {
        throw new ApiError(INVALID_CREDENTIALS, 401);
      }

      return createUserSession(client, request, user.uid);
    });

    const response = jsonResponse({
      success: true,
      is_verified: true,
      message: "Login successful!",
      redirect: "/",
      user: {
        uid: user.uid,
        sessionId: tokens.sessionId,
        username: user.username,
        email: user.email,
        is_verified: true,
        profile_photo_url: user.profile_image_public_url,
      },
      entityType: "user",
      accessExpiresAt: Date.now() + AUTH_CONFIG.accessTokenSeconds * 1000,
    });

    setSessionCookies(response, tokens);
    clearFlowCookie(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Login error");
  }
}
