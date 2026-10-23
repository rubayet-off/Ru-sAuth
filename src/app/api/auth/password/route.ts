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
import { COOKIE_NAMES, clearFlowCookie } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";
import { getPasswordError } from "@/lib/validation";

interface PasswordUserRow {
  password_hash: string | null;
  is_verified: boolean;
  is_account_deleted: boolean;
}

interface GrantRow {
  grant_uid: string;
}

// POST /api/auth/password  { newPassword, confirmPassword }
// OTP যাচাইয়ের পর লগইন করা ব্যবহারকারীর পাসওয়ার্ড যোগ বা বদলায়
// কোনটি হবে তা ঠিক করে সার্ভারে সই করা "set-*" টোকেন, ক্লায়েন্টের কোনো ক্ষেত্র নয়
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

    // OTP যাচাইয়ের পর পাওয়া টোকেন ছাড়া পাসওয়ার্ড বদলানো যায় না
    const flowToken = request.cookies.get(COOKIE_NAMES.flow)?.value;

    if (!flowToken) {
      return errorResponse("Your verification expired. Start again.", 401);
    }

    const flow = await readFlowToken(flowToken, [
      "set-add-password",
      "set-change-password",
    ]);

    // টোকেন অবৈধ, মেয়াদোত্তীর্ণ, অন্য ধরনের বা অন্য ব্যবহারকারী/সেশনের হলে প্রত্যাখ্যান
    if (
      !flow?.uid ||
      !flow.verificationId ||
      flow.uid !== session.uid ||
      flow.sessionId !== session.sessionId ||
      flow.email !== session.email.trim().toLowerCase()
    ) {
      return errorResponse(
        "Your verification is invalid. Start again.",
        401,
        { clearFlow: true },
      );
    }

    const uid = flow.uid;
    const verificationId = flow.verificationId;
    const isAdd = flow.purpose === "set-add-password";

    await withTransaction(async (client) => {
      // ব্যবহারকারীর সারি লক করা হয়, যাতে একসাথে দুটি অনুরোধ যোগ/বদলের শর্ত এড়াতে না পারে
      const userResult = await client.query<PasswordUserRow>(
        `
          SELECT password_hash, is_verified, is_account_deleted
          FROM users
          WHERE uid = $1 AND LOWER(email) = $2
          LIMIT 1
          FOR UPDATE
        `,
        [uid, flow.email],
      );

      const user = userResult.rows[0];

      if (!user || user.is_account_deleted || !user.is_verified) {
        throw new ApiError("This request is no longer valid. Start again.", 401, {
          clearFlow: true,
        });
      }

      // যোগ করা যায় শুধু পাসওয়ার্ডহীন অ্যাকাউন্টে, বদলানো যায় শুধু পাসওয়ার্ডওয়ালা অ্যাকাউন্টে
      if (isAdd && user.password_hash) {
        throw new ApiError(
          "A password is already set for this account. Use Change Password instead.",
          409,
          { clearFlow: true },
        );
      }

      if (!isAdd && !user.password_hash) {
        throw new ApiError(
          "No password is set for this account yet. Use Add Password instead.",
          409,
          { clearFlow: true },
        );
      }

      // এই টোকেনের সাথে বাঁধা অনুমতি লক করে দেখা হয়: ঠিক এই ব্যবহারকারী, এই অপারেশন ও এই সেশনের জন্য, মেয়াদ শেষ হয়নি
      // OTP আবার পাঠানো বা আবার যাচাই করা হলে অনুমতির grant_uid বদলে যায়, তাই পুরোনো টোকেন এখানে আটকে যায়
      const grantResult = await client.query<GrantRow>(
        `
          SELECT grant_uid
          FROM password_update_grants
          WHERE user_id = $1
            AND grant_uid = $2
            AND action = $3
            AND session_uid = $4
            AND expires_at > NOW()
          FOR UPDATE
        `,
        [uid, verificationId, isAdd ? "ADD" : "CHANGE", session.sessionId],
      );

      if (grantResult.rowCount !== 1) {
        throw new ApiError(
          "Your verification has expired or was already used. Start again.",
          401,
          { clearFlow: true },
        );
      }

      // আগের পাসওয়ার্ড আবার দেওয়া যাবে না
      if (
        user.password_hash &&
        (await bcrypt.compare(newPassword, user.password_hash))
      ) {
        throw new ApiError(
          "Choose a password different from your current password.",
          400,
        );
      }

      const newHash = await bcrypt.hash(newPassword, AUTH_CONFIG.bcryptRounds);

      // শর্তসহ UPDATE: পাসওয়ার্ডের অবস্থা বদলে গেলে কোনো সারি বদলায় না
      // সেশন, ইমেইল ও বাকি ক্ষেত্রে হাত দেওয়া হয় না
      const updateResult = await client.query(
        isAdd
          ? `
              UPDATE users
              SET password_hash = $1
              WHERE uid = $2
                AND password_hash IS NULL
                AND is_account_deleted = FALSE
            `
          : `
              UPDATE users
              SET password_hash = $1
              WHERE uid = $2
                AND password_hash IS NOT NULL
                AND is_account_deleted = FALSE
            `,
        [newHash, uid],
      );

      if (updateResult.rowCount !== 1) {
        throw new ApiError("This request is no longer valid. Start again.", 409, {
          clearFlow: true,
        });
      }

      // অনুমতি মুছে ফেলা হয়, তাই একই যাচাই দিয়ে দ্বিতীয়বার কিছু করা যায় না; বাকি পাসওয়ার্ড-সংক্রান্ত OTP-ও মুছে যায়
      await client.query(`DELETE FROM password_update_grants WHERE user_id = $1`, [uid]);
      await client.query(
        `DELETE FROM otp_tokens WHERE user_id = $1 AND type IN ('ADD_PASSWORD', 'CHANGE_PASSWORD')`,
        [uid],
      );
    });

    const response = jsonResponse({
      success: true,
      message: isAdd
        ? "Password added successfully."
        : "Password changed successfully.",
      redirect: "/profile",
    });

    // কাজ শেষ: flow কুকি মুছে যায় (লগইন সেশন অপরিবর্তিত থাকে)
    clearFlowCookie(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Password update error");
  }
}
