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
import { AUTH_CONFIG } from "@/lib/authConfig";
import { COOKIE_NAMES, clearAllAuthCookies } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";
import { getPasswordError } from "@/lib/validation";

interface ResetUserRow {
  password_hash: string | null;
  provider: "CREDENTIALS" | "GOOGLE";
  is_account_deleted: boolean;
}

export async function POST(request: NextRequest) {
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const body = await readJsonBody(request);

    if (
      !body ||
      typeof body.newPassword !== "string" ||
      typeof body.confirmPassword !== "string" ||
      !body.newPassword ||
      !body.confirmPassword
    ) {
      return errorResponse("Both password fields are required.", 400);
    }

    const { newPassword, confirmPassword } = body;

    const passwordError = getPasswordError(newPassword);

    if (passwordError) return errorResponse(passwordError, 400);

    if (newPassword !== confirmPassword) {
      return errorResponse("The passwords do not match.", 400);
    }

    // শুধু রিসেট OTP যাচাইয়ের পরে দেওয়া টোকেনই পাসওয়ার্ড বদলাতে পারে
    const resetToken = request.cookies.get(COOKIE_NAMES.flow)?.value;

    if (!resetToken) {
      return errorResponse("Your password-reset session expired. Start again.", 401);
    }

    const flow = await readFlowToken(resetToken, ["new-password"]);

    if (!flow?.uid) {
      return errorResponse(
        "Your password-reset session is invalid. Verify your OTP again.",
        401,
        { clearFlow: true },
      );
    }

    const uid = flow.uid;

    // অথেন্টিকেশন রিকোয়েস্টের সীমা: একই ইমেইলের জন্য সীমা পেরোলে ব্যবহারকারী সাময়িক ব্লক
    const rateLimit = await checkUserRateLimit(flow.email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    await withTransaction(async (client) => {
      // সারি লক করা হয়, যাতে একসাথে দুটি রিসেট একই অ্যাকাউন্ট না বদলায়
      const userResult = await client.query<ResetUserRow>(
        `
          SELECT password_hash, provider, is_account_deleted
          FROM users
          WHERE uid = $1 AND LOWER(email) = $2
          LIMIT 1
          FOR UPDATE
        `,
        [uid, flow.email],
      );

      const user = userResult.rows[0];

      if (
        !user ||
        user.is_account_deleted ||
        !user.password_hash
      ) {
        throw new ApiError(
          "This password-reset request is no longer valid. Please start again.",
          401,
          { clearFlow: true },
        );
      }

      // আগের পাসওয়ার্ড আবার দেওয়া যাবে না
      if (await bcrypt.compare(newPassword, user.password_hash)) {
        throw new ApiError(
          "Choose a password different from your current password.",
          400,
        );
      }

      const newHash = await bcrypt.hash(newPassword, AUTH_CONFIG.bcryptRounds);

      await client.query(
        `
          UPDATE users
          SET password_hash = $1
          WHERE uid = $2
        `,
        [newHash, uid],
      );

      // অন্য সব ব্রাউজার ও ডিভাইসের সেশন বাতিল করা হয়
      await client.query(
        `
          UPDATE sessions
          SET is_revoked = TRUE, revoked_at = NOW()
          WHERE user_id = $1 AND is_revoked = FALSE
        `,
        [uid],
      );

      // বাকি থাকা রিসেট OTP মুছে ফেলা হয়
      await client.query(
        `DELETE FROM otp_tokens WHERE user_id = $1 AND type = 'PASSWORD_RESET'`,
        [uid],
      );
    });

    const response = jsonResponse({
      success: true,
      message: "Password changed successfully. Please log in with your new password.",
      redirect: "/email",
    });

    // সব অথেন্টিকেশন কুকি মুছে দেওয়া হয়
    clearAllAuthCookies(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Change-password error");
  }
}
