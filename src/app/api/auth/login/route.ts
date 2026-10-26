import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

import { withTransaction } from "@/database/transaction";
import {
  ApiError,
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/apiSecurity";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import {
  COOKIE_NAMES,
  clearFlowCookie,
  setFlowCookie,
  setSessionCookies,
} from "@/lib/cookies";
import { createFlowToken, readFlowToken } from "@/lib/flowToken";
import { createUserSession, type SessionTokens } from "@/lib/session";
import { getOtpCooldownSeconds, sendOTP } from "@/lib/sendOTP";
import { PASSWORD_MAX_BYTES, byteLength } from "@/lib/validation";

interface UserRow {
  uid: string;
  username: string;
  email: string;
  password_hash: string | null;
  provider: "CREDENTIALS" | "GOOGLE";
  is_verified: boolean;
  is_account_deleted: boolean;
  profile_image_public_url: string | null;
}

type LoginOutcome =
  | { kind: "wrong-password" }
  | { kind: "needs-verification"; user: UserRow }
  | { kind: "success"; user: UserRow; tokens: SessionTokens };

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const body = await readJsonBody(request);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) return errorResponse("Please enter your password.", 400);

    if (byteLength(password) > PASSWORD_MAX_BYTES) {
      return errorResponse("Invalid login credentials.", 401);
    }
    const flowToken = request.cookies.get(COOKIE_NAMES.flow)?.value;

    if (!flowToken) {
      return errorResponse(
        "Your login session expired. Please enter your email again.",
        401,
      );
    }

    const flow = await readFlowToken(flowToken, ["enter-password"]);

    if (!flow?.uid) {
      return errorResponse(
        "Your login session is invalid. Please enter your email again.",
        401,
        { clearFlow: true },
      );
    }

    const flowUid = flow.uid;
    const rateLimit = await checkUserRateLimit(flow.email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const outcome = await withTransaction<LoginOutcome>(async (client) => {
      const userResult = await client.query<UserRow>(
        `
          SELECT
            uid, username, email, password_hash, provider, is_verified,
            is_account_deleted, profile_image_public_url
          FROM users
          WHERE uid = $1
            AND LOWER(email) = $2
          LIMIT 1
          FOR UPDATE
        `,
        [flowUid, flow.email],
      );

      const user = userResult.rows[0];

      if (!user) throw new ApiError("Invalid login credentials.", 401);

      if (user.is_account_deleted) {
        throw new ApiError("This account is no longer available.", 403, {
          clearFlow: true,
        });
      }

      if (!user.password_hash) {
        throw new ApiError(
          "This account uses Google sign-in. Please continue with Google.",
          409,
        );
      }

      const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash,
      );

      if (!passwordMatches) return { kind: "wrong-password" };

      if (!user.is_verified) {
        return { kind: "needs-verification", user };
      }

      const tokens = await createUserSession(client, request, user.uid);

      const updateResult = await client.query(
        `UPDATE users SET last_login = NOW() WHERE uid = $1 AND is_account_deleted = FALSE`,
        [user.uid],
      );

      if (updateResult.rowCount !== 1) {
        throw new ApiError("This account cannot sign in right now.", 409);
      }

      return { kind: "success", user, tokens };
    });

    if (outcome.kind === "wrong-password") {
      return errorResponse("Invalid login credentials.", 401);
    }

    if (outcome.kind === "needs-verification") {
      const { user } = outcome;

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

      const message = otpSentRecently
        ? "Your password is correct. Check your email for the verification code, or resend it after the cooldown."
        : emailSent
          ? "Your password is correct. Please verify your email to finish signing in."
          : "Your password is correct, but we could not send the verification email. Please use Resend OTP.";

      const response = jsonResponse({
        success: true,
        is_verified: false,
        message,
        redirect: "/otp-verification",
      });

      setFlowCookie(response, verificationToken);

      return response;
    }

    const { user, tokens } = outcome;

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
    });

    setSessionCookies(response, tokens);
    clearFlowCookie(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Login error");
  }
}
