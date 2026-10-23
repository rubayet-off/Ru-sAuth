import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";
import {
  getOtpCooldownSeconds,
  sendOTP,
  type OtpPurpose,
} from "@/lib/sendOTP";

interface UserRow {
  uid: string;
  email: string;
  provider: "CREDENTIALS" | "GOOGLE";
  password_hash: string | null;
  is_verified: boolean;
  is_account_deleted: boolean;
}

export async function POST(request: NextRequest) {
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const flowToken = request.cookies.get(COOKIE_NAMES.flow)?.value;

    if (!flowToken) {
      return errorResponse("Your verification session expired. Start again.", 401);
    }

    // অ্যাকাউন্ট যাচাই ও পাসওয়ার্ড রিসেট, দুই ধরনের flow এ OTP আবার পাঠানো যায়
    const flow = await readFlowToken(flowToken, [
      "verify-account",
      "password-reset",
      "verify-add-password",
      "verify-change-password",
    ]);

    if (!flow) {
      return errorResponse("Invalid verification session. Start again.", 401, {
        clearFlow: true,
      });
    }

    // অথেন্টিকেশন রিকোয়েস্টের সীমা: একই ইমেইলের জন্য সীমা পেরোলে ব্যবহারকারী সাময়িক ব্লক
    const rateLimit = await checkUserRateLimit(flow.email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const isReset = flow.purpose === "password-reset";
    const isPasswordUpdate =
      flow.purpose === "verify-add-password" ||
      flow.purpose === "verify-change-password";

    const purpose: OtpPurpose = isReset
      ? "PASSWORD_RESET"
      : flow.purpose === "verify-add-password"
        ? "ADD_PASSWORD"
        : flow.purpose === "verify-change-password"
          ? "CHANGE_PASSWORD"
          : "ACCOUNT_VERIFICATION";

    // পাসওয়ার্ড যোগ/বদলের flow শুধু সেই লগইন সেশনেই চলে যার জন্য টোকেন বানানো হয়েছিল
    if (isPasswordUpdate) {
      const session = await requireActiveUserSession(request);

      if (
        !session ||
        session.uid !== flow.uid ||
        session.sessionId !== flow.sessionId ||
        session.email.trim().toLowerCase() !== flow.email
      ) {
        return errorResponse("Invalid verification session. Start again.", 401, {
          clearFlow: true,
        });
      }
    }

    const genericMessage =
      "If an eligible account exists for this email, a new code has been sent.";

    // রিসেটে অস্তিত্বহীন ইমেইলের uid থাকে না; অ্যাকাউন্ট আছে কিনা না জানিয়ে একই উত্তর দেওয়া হয়
    if (!flow.uid) {
      return jsonResponse({ success: true, message: genericMessage });
    }

    const userResult = await pool.query<UserRow>(
      `
        SELECT uid, email, provider, password_hash, is_verified, is_account_deleted
        FROM users
        WHERE uid = $1 AND LOWER(email) = $2
        LIMIT 1
      `,
      [flow.uid, flow.email],
    );

    const user = userResult.rows[0];

    if (!user || user.is_account_deleted) {
      if (isReset) return jsonResponse({ success: true, message: genericMessage });

      return errorResponse("This account is no longer available.", 404, {
        clearFlow: true,
      });
    }

    if (isPasswordUpdate) {
      // যোগ করা যায় শুধু পাসওয়ার্ডহীন অ্যাকাউন্টে, বদলানো যায় শুধু পাসওয়ার্ডওয়ালা অ্যাকাউন্টে
      const hasPassword = user.password_hash !== null;

      if (
        !user.is_verified ||
        (purpose === "ADD_PASSWORD" && hasPassword) ||
        (purpose === "CHANGE_PASSWORD" && !hasPassword)
      ) {
        return errorResponse(
          "This request is no longer valid. Please start again.",
          409,
          { clearFlow: true },
        );
      }
    } else if (isReset) {
      // রিসেট শুধু পাসওয়ার্ড আছে এমন অ্যাকাউন্টের জন্য
      if (!user.password_hash) {
        return jsonResponse({ success: true, message: genericMessage });
      }
    } else if (user.is_verified) {
      return errorResponse("This account is already verified. Please sign in.", 409, {
        clearFlow: true,
      });
    }

    // কুলডাউন চলতে থাকলে এখনই আবার পাঠানো হয় না
    const retryAfter = await getOtpCooldownSeconds(user.uid, purpose);

    if (retryAfter > 0) {
      return jsonResponse(
        {
          message: `Please wait ${retryAfter} second(s) before requesting another code.`,
          retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    await sendOTP(user.email, user.uid, purpose);

    return jsonResponse({
      success: true,
      message: isReset
        ? genericMessage
        : "A new verification code has been sent to your email.",
    });
  } catch (error) {
    return handleRouteError(error, "Resend OTP error");
  }
}
