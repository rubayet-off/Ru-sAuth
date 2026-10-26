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
import { getOtpCooldownSeconds, sendOTP } from "@/lib/sendOTP";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

interface ResetUserRow {
  uid: string;
  email: string;
  provider: "CREDENTIALS" | "GOOGLE";
  password_hash: string | null;
  is_account_deleted: boolean;
}

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const body = await readJsonBody(request);
    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";

    if (!isValidEmail(email)) {
      return errorResponse("Please enter a valid email address.", 400);
    }

    const rateLimit = await checkUserRateLimit(email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const result = await pool.query<ResetUserRow>(
      `
        SELECT uid, email, provider, password_hash, is_account_deleted
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
      `,
      [email],
    );

    const user = result.rows[0];
    const eligibleUser =
      user &&
      !user.is_account_deleted &&
      user.password_hash
        ? user
        : null;

    if (eligibleUser) {
      const cooldown = await getOtpCooldownSeconds(eligibleUser.uid, "PASSWORD_RESET");

      if (cooldown === 0) {
        try {
          await sendOTP(eligibleUser.email, eligibleUser.uid, "PASSWORD_RESET");
        } catch (error) {
          console.error("Password reset OTP delivery error:", error);
        }
      }
    }

    const resetFlowToken = await createFlowToken({
      purpose: "password-reset",
      email,
      uid: eligibleUser?.uid ?? null,
    });

    const response = jsonResponse({
      success: true,
      message:
        "If an eligible account exists for this email, a password reset code will be sent. Check your inbox or spam folder.",
      redirect: "/otp-verification",
    });

    setFlowCookie(response, resetFlowToken);

    return response;
  } catch (error) {
    return handleRouteError(error, "Forgot-password error");
  }
}
