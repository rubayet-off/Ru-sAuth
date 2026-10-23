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

// POST /api/auth/password-otp  { action: "add" | "change" }
// লগইন করা ব্যবহারকারীর পাসওয়ার্ড যোগ বা বদলানোর OTP পাঠায় এবং সেশনের সাথে বাঁধা flow কুকি বসায়
// OTP যায় সবসময় সার্ভারের সেশন থেকে পাওয়া ইমেইলে; ক্লায়েন্ট কোনো ইমেইল পাঠাতে পারে না
export async function POST(request: NextRequest) {
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const session = await requireActiveUserSession(request);

    if (!session) {
      return errorResponse("Your session has expired. Please sign in again.", 401);
    }

    // অথেন্টিকেশন রিকোয়েস্টের সীমা: একই ইমেইলের জন্য সীমা পেরোলে ব্যবহারকারী সাময়িক ব্লক
    const rateLimit = await checkUserRateLimit(session.email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await readJsonBody(request);
    const action = body?.action;

    if (action !== "add" && action !== "change") {
      return errorResponse("Invalid request.", 400);
    }

    // পাসওয়ার্ড আছে কিনা ডাটাবেস থেকে জানা হয়; ক্লায়েন্টের কথায় ভরসা করা হয় না
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

    // প্রতিবার OTP না পাঠিয়ে কুলডাউন মেনে চলা হয়; কুলডাউনে থাকলে আগের OTP-ই বহাল থাকে
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
