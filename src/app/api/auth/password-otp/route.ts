import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/apiSecurity";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { setFlowCookie } from "@/lib/cookies";
import { createFlowToken } from "@/lib/flowToken";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";
import { getOtpCooldownSeconds, sendOTP } from "@/lib/sendOTP";

interface PasswordStateRow {
  has_password: boolean;
}

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const session = await requireActiveUserSession(request);

    if (!session) {
      return errorResponse("Your session has expired. Please sign in again.", 401);
    }

    const rateLimit = await checkUserRateLimit(session.email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await readJsonBody(request);
    const action = body?.action;

    if (action !== "add" && action !== "change") {
      return errorResponse("Invalid request.", 400);
    }

    const result = await pool.query<PasswordStateRow>(
      `
        SELECT (password_hash IS NOT NULL) AS has_password
        FROM users
        WHERE uid = $1
          AND is_verified = TRUE
          AND is_account_deleted = FALSE
        LIMIT 1
      `,
      [session.uid],
    );

    const state = result.rows[0];

    if (!state) {
      return errorResponse("Your session has expired. Please sign in again.", 401);
    }

    if (action === "add" && state.has_password) {
      return errorResponse(
        "A password is already set for this account. Use Change Password instead.",
        409,
      );
    }

    if (action === "change" && !state.has_password) {
      return errorResponse(
        "No password is set for this account yet. Use Add Password instead.",
        409,
      );
    }

    const purpose = action === "add" ? "ADD_PASSWORD" : "CHANGE_PASSWORD";

    const cooldown = await getOtpCooldownSeconds(session.uid, purpose);
    const otpSentRecently = cooldown > 0;

    let emailSent = true;

    if (!otpSentRecently) {
      try {
        await sendOTP(session.email, session.uid, purpose);
      } catch (error) {
        emailSent = false;
        console.error("Password OTP delivery error:", error);
      }
    }

    if (!otpSentRecently && !emailSent) {
      return errorResponse(
        "We could not send the verification email. Please try again.",
        502,
      );
    }

    const flowToken = await createFlowToken({
      purpose: action === "add" ? "verify-add-password" : "verify-change-password",
      email: session.email.trim().toLowerCase(),
      uid: session.uid,
      sessionId: session.sessionId,
    });

    const response = jsonResponse({
      success: true,
      message: otpSentRecently
        ? "A code was sent recently. Check your email, or resend it after the cooldown."
        : "A verification code has been sent to your email.",
      redirect: "/profile/password/verify",
    });

    setFlowCookie(response, flowToken);

    return response;
  } catch (error) {
    return handleRouteError(error, "Password OTP start error");
  }
}
