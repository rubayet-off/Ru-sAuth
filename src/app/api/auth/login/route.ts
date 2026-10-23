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

// transaction শেষে কী ঘটেছে তার সারাংশ; এর ভিত্তিতে রেসপন্স বানানো হয়
type LoginOutcome =
  | { kind: "wrong-password" }
  | { kind: "needs-verification"; user: UserRow }
  | { kind: "success"; user: UserRow; tokens: SessionTokens };

export async function POST(request: NextRequest) {
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const body = await readJsonBody(request);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) return errorResponse("Please enter your password.", 400);

    // রেজিস্ট্রেশনের মতো এখানেও bcrypt এর ৭২ বাইট সীমা মানা হয়
    if (byteLength(password) > PASSWORD_MAX_BYTES) {
      return errorResponse("Invalid login credentials.", 401);
    }

    // কার লগইন হচ্ছে তা সই করা flow কুকি থেকে জানা যায়
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

    // অথেন্টিকেশন রিকোয়েস্টের সীমা: একই ইমেইলের জন্য সীমা পেরোলে ব্যবহারকারী সাময়িক ব্লক
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

      // পাসওয়ার্ড না থাকলে (শুধু Google অ্যাকাউন্ট) পাসওয়ার্ড দিয়ে লগইন চলে না
      if (!user.password_hash) {
        throw new ApiError(
          "This account uses Google sign-in. Please continue with Google.",
          409,
        );
      }

      // ভুল পাসওয়ার্ডে অ্যাকাউন্ট লক করা হয় না; বারবার চেষ্টা ঠেকায় rate limit (ওপরে ইমেইল ধরে গোনা হয়)
      const passwordMatches = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatches) return { kind: "wrong-password" };

      // ইমেইল যাচাই না হলে সেশন নয়, শুধু যাচাইয়ের ধাপে পাঠানো হয়
      if (!user.is_verified) {
        return { kind: "needs-verification", user };
      }

      // যাচাই করা অ্যাকাউন্ট: নতুন সেশন তৈরি
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

    // ভুল পাসওয়ার্ডের রেসপন্স
    if (outcome.kind === "wrong-password") {
      return errorResponse("Invalid login credentials.", 401);
    }

    // যাচাই না হওয়া অ্যাকাউন্ট: OTP পাঠিয়ে যাচাইয়ের ধাপে নেওয়া হয়
    if (outcome.kind === "needs-verification") {
      const { user } = outcome;

      const verificationToken = await createFlowToken({
        purpose: "verify-account",
        email: user.email,
        uid: user.uid,
      });

      // প্রতি লগইনে OTP না পাঠিয়ে কুলডাউন মেনে চলা হয়
      const cooldown = await getOtpCooldownSeconds(user.uid, "ACCOUNT_VERIFICATION");
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

    // সফল লগইন: সেশন কুকি বসে, flow কুকি মুছে যায়
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
