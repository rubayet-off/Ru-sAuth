import { randomUUID, timingSafeEqual } from "node:crypto";
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
import {
  COOKIE_NAMES,
  clearFlowCookie,
  setFlowCookie,
  setSessionCookies,
} from "@/lib/cookies";
import { createFlowToken, readFlowToken } from "@/lib/flowToken";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";
import { hashOtp, type OtpPurpose } from "@/lib/sendOTP";
import { createUserSession, type SessionTokens } from "@/lib/session";
import { isValidOtp } from "@/lib/validation";

interface OtpRow {
  otp_uid: string;
  code_hash: string;
  attempts: number;
  expires_at: Date | string;
  uid: string;
  username: string;
  email: string;
  provider: "CREDENTIALS" | "GOOGLE";
  password_hash: string | null;
  is_verified: boolean;
  is_account_deleted: boolean;
  profile_image_public_url: string | null;
}

// transaction শেষে কী ঘটেছে তার সারাংশ
type OtpOutcome =
  | { kind: "rejected"; message: string; status: number; clearFlow?: boolean }
  | { kind: "account-verified"; row: OtpRow; tokens: SessionTokens }
  | { kind: "reset-verified"; row: OtpRow }
  // লগইন করা ব্যবহারকারীর পাসওয়ার্ড যোগ/বদলের OTP ঠিক হয়েছে; এখন নতুন পাসওয়ার্ড দেওয়া যাবে
  | {
      kind: "password-verified";
      row: OtpRow;
      action: "add" | "change";
      grantUid: string;
    };

// flow টোকেনের purpose থেকে ডাটাবেসের OTP ধরন
const OTP_PURPOSE_BY_FLOW = {
  "verify-account": "ACCOUNT_VERIFICATION",
  "password-reset": "PASSWORD_RESET",
  "verify-add-password": "ADD_PASSWORD",
  "verify-change-password": "CHANGE_PASSWORD",
} as const satisfies Record<string, OtpPurpose>;

// ইনপুট OTP এর হ্যাশ ডাটাবেসের হ্যাশের সাথে নিরাপদভাবে মেলায়
function matchesOtp(otp: string, storedHash: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(storedHash)) return false;

  const actual = Buffer.from(hashOtp(otp), "hex");
  const expected = Buffer.from(storedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest) {
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const body = await readJsonBody(request);
    const otp = typeof body?.otp === "string" ? body.otp : "";

    if (!isValidOtp(otp)) {
      return errorResponse("Enter a valid six-digit OTP.", 400);
    }

    // ব্যবহারকারী ও উদ্দেশ্য সই করা flow কুকি থেকেই জানা যায়
    const flowToken = request.cookies.get(COOKIE_NAMES.flow)?.value;

    if (!flowToken) {
      return errorResponse("Your verification session expired. Start again.", 401);
    }

    const flow = await readFlowToken(flowToken, [
      "verify-account",
      "password-reset",
      "verify-add-password",
      "verify-change-password",
    ]);

    if (!flow) {
      return errorResponse(
        "Your verification session is invalid. Start again.",
        401,
        { clearFlow: true },
      );
    }

    // অথেন্টিকেশন রিকোয়েস্টের সীমা: একই ইমেইলের জন্য সীমা পেরোলে ব্যবহারকারী সাময়িক ব্লক
    const rateLimit = await checkUserRateLimit(flow.email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    // অস্তিত্বহীন বা অযোগ্য ইমেইলের জন্য রিসেট flow এ uid থাকে না; সেটি সাধারণ এরর দেয়
    if (!flow.uid) {
      return errorResponse(
        "The code is invalid or expired. Request a new code and try again.",
        400,
        { clearFlow: true },
      );
    }

    const flowUid = flow.uid;

    const otpPurpose: OtpPurpose =
      OTP_PURPOSE_BY_FLOW[flow.purpose as keyof typeof OTP_PURPOSE_BY_FLOW];

    // পাসওয়ার্ড যোগ/বদলের flow শুধু সেই লগইন সেশনেই চলে যার জন্য টোকেন বানানো হয়েছিল
    // ব্যবহারকারী, সেশন ও ইমেইল সবই সার্ভারের সচল সেশন থেকে মেলানো হয়; ক্লায়েন্টের পাঠানো কোনো মান বিশ্বাস করা হয় না
    const isPasswordUpdate =
      otpPurpose === "ADD_PASSWORD" || otpPurpose === "CHANGE_PASSWORD";

    if (isPasswordUpdate) {
      const session = await requireActiveUserSession(request);

      if (
        !session ||
        session.uid !== flowUid ||
        session.sessionId !== flow.sessionId ||
        session.email.trim().toLowerCase() !== flow.email
      ) {
        return errorResponse(
          "Your verification session is invalid. Start again.",
          401,
          { clearFlow: true },
        );
      }
    }

    const outcome = await withTransaction<OtpOutcome>(async (client) => {
      // OTP ও ব্যবহারকারীর সারি লক করা হয়, যাতে একই OTP দুইবার ব্যবহার না হয়
      const otpResult = await client.query<OtpRow>(
        `
          SELECT
            o.otp_uid, o.code_hash, o.attempts, o.expires_at,
            u.uid, u.username, u.email, u.provider, u.password_hash,
            u.is_verified, u.is_account_deleted, u.profile_image_public_url
          FROM otp_tokens AS o
          JOIN users AS u ON u.uid = o.user_id
          WHERE o.user_id = $1
            AND LOWER(o.email) = $2
            AND o.type = $3
          ORDER BY o.created_at DESC
          LIMIT 1
          FOR UPDATE OF o, u
        `,
        [flowUid, flow.email, otpPurpose],
      );

      const row = otpResult.rows[0];

      if (!row) {
        return {
          kind: "rejected",
          message: "The code is invalid or expired. Request a new code and try again.",
          status: 400,
        };
      }

      if (row.is_account_deleted) {
        return {
          kind: "rejected",
          message: "This account is no longer available.",
          status: 403,
          clearFlow: true,
        };
      }

      // পাসওয়ার্ড যোগ/বদল: অ্যাকাউন্ট যাচাই করা থাকতে হবে এবং পাসওয়ার্ডের অবস্থা অপারেশনের সাথে মিলতে হবে
      // (যোগ করা যায় শুধু পাসওয়ার্ডহীন অ্যাকাউন্টে, বদলানো যায় শুধু পাসওয়ার্ডওয়ালা অ্যাকাউন্টে)
      if (isPasswordUpdate) {
        const hasPassword = row.password_hash !== null;

        if (
          !row.is_verified ||
          (otpPurpose === "ADD_PASSWORD" && hasPassword) ||
          (otpPurpose === "CHANGE_PASSWORD" && !hasPassword)
        ) {
          return {
            kind: "rejected",
            message: "This request is no longer valid. Please start again.",
            status: 409,
            clearFlow: true,
          };
        }
      } else if (!row.password_hash) {
        // অ্যাকাউন্ট যাচাই ও রিসেটের OTP শুধু পাসওয়ার্ড আছে এমন অ্যাকাউন্টের জন্য
        return {
          kind: "rejected",
          message:
            otpPurpose === "ACCOUNT_VERIFICATION"
              ? "This verification request is invalid. Start again."
              : "The code is invalid or expired. Request a new code and try again.",
          status: 400,
          clearFlow: true,
        };
      }

      // আগেই যাচাই হয়ে থাকলে বাড়তি OTP মুছে সাইন ইন করতে বলা হয়
      if (otpPurpose === "ACCOUNT_VERIFICATION" && row.is_verified) {
        await client.query(`DELETE FROM otp_tokens WHERE otp_uid = $1`, [row.otp_uid]);

        return {
          kind: "rejected",
          message: "This account is already verified. Please sign in.",
          status: 409,
          clearFlow: true,
        };
      }

      // মেয়াদোত্তীর্ণ OTP মুছে ফেলা হয়, যাতে আর চেষ্টা করা না যায়
      const expiresAt = new Date(row.expires_at).getTime();

      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        await client.query(`DELETE FROM otp_tokens WHERE otp_uid = $1`, [row.otp_uid]);

        return {
          kind: "rejected",
          message: "The OTP has expired. Request a new code.",
          status: 410,
        };
      }

      if (row.attempts >= AUTH_CONFIG.maxOtpAttempts) {
        return {
          kind: "rejected",
          message: "Too many incorrect attempts. Request a new code.",
          status: 429,
        };
      }

      // ভুল OTP: চেষ্টার গণনা বাড়ে (এটি COMMIT হতে হবে)
      if (!matchesOtp(otp, row.code_hash)) {
        await client.query(
          `UPDATE otp_tokens SET attempts = attempts + 1 WHERE otp_uid = $1`,
          [row.otp_uid],
        );

        const remaining = AUTH_CONFIG.maxOtpAttempts - (row.attempts + 1);

        return remaining <= 0
          ? {
              kind: "rejected",
              message: "Too many incorrect attempts. Request a new code.",
              status: 429,
            }
          : {
              kind: "rejected",
              message: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
              status: 400,
            };
      }

      // পাসওয়ার্ড যোগ/বদলের OTP ঠিক: ব্যবহৃত OTP সঙ্গে সঙ্গে মুছে ফেলা হয় (আবার ব্যবহার সম্ভব নয়)
      // একই transaction এ ছোট মেয়াদের একটি একবার-ব্যবহারযোগ্য অনুমতি বসে, যা এই লগইন সেশনের সাথে বাঁধা
      if (isPasswordUpdate) {
        const deleted = await client.query(
          `DELETE FROM otp_tokens WHERE otp_uid = $1`,
          [row.otp_uid],
        );

        if (deleted.rowCount !== 1) {
          throw new ApiError(
            "The code is invalid or expired. Request a new code and try again.",
            400,
          );
        }

        const grantUid = randomUUID();
        const action = otpPurpose === "ADD_PASSWORD" ? "add" : "change";

        // একই ব্যবহারকারীর আগের অনুমতি থাকলে নতুনটি সেটি বদলে দেয়
        await client.query(
          `
            INSERT INTO password_update_grants
              (grant_uid, user_id, action, session_uid, expires_at)
            VALUES ($1, $2, $3, $4, NOW() + ($5::int * INTERVAL '1 second'))
            ON CONFLICT (user_id) DO UPDATE
            SET grant_uid = EXCLUDED.grant_uid,
                action = EXCLUDED.action,
                session_uid = EXCLUDED.session_uid,
                created_at = NOW(),
                expires_at = EXCLUDED.expires_at
          `,
          [
            grantUid,
            row.uid,
            action.toUpperCase(),
            flow.sessionId,
            AUTH_CONFIG.passwordUpdateSeconds,
          ],
        );

        return { kind: "password-verified", row, action, grantUid };
      }

      // পাসওয়ার্ড রিসেটের OTP ঠিক: এই ব্যবহারকারীর সব রিসেট OTP মুছে ফেলা হয়
      if (otpPurpose === "PASSWORD_RESET") {
        await client.query(
          `DELETE FROM otp_tokens WHERE user_id = $1 AND type = 'PASSWORD_RESET'`,
          [row.uid],
        );

        return { kind: "reset-verified", row };
      }

      // অ্যাকাউন্ট যাচাইয়ের OTP ঠিক: অ্যাকাউন্ট যাচাই হয় এবং সরাসরি লগইন সেশন তৈরি হয়
      const updateUser = await client.query(
        `
          UPDATE users
          SET is_verified = TRUE,
              last_login = NOW()
          WHERE uid = $1
            AND is_verified = FALSE
            AND is_account_deleted = FALSE
        `,
        [row.uid],
      );

      if (updateUser.rowCount !== 1) {
        throw new ApiError("The account could not be verified. Please try again.", 409);
      }

      await client.query(`DELETE FROM otp_tokens WHERE otp_uid = $1`, [row.otp_uid]);

      const tokens = await createUserSession(client, request, row.uid);

      return { kind: "account-verified", row, tokens };
    });

    // প্রত্যাখ্যাত হলে কারণসহ এরর রেসপন্স
    if (outcome.kind === "rejected") {
      return errorResponse(outcome.message, outcome.status, {
        clearFlow: outcome.clearFlow,
      });
    }

    // পাসওয়ার্ড যোগ/বদল: ছোট মেয়াদের "set-*" টোকেন বসে, যা এই OTP রেকর্ড ও এই সেশনের সাথে বাঁধা
    if (outcome.kind === "password-verified") {
      const setToken = await createFlowToken({
        purpose:
          outcome.action === "add" ? "set-add-password" : "set-change-password",
        email: outcome.row.email,
        uid: outcome.row.uid,
        sessionId: flow.sessionId ?? undefined,
        verificationId: outcome.grantUid,
        expiresInSeconds: AUTH_CONFIG.passwordUpdateSeconds,
      });

      const response = jsonResponse({
        success: true,
        purpose: outcome.action === "add" ? "add-password" : "change-password",
        message: "OTP verified successfully. You can now set your password.",
        redirect: "/profile/password/set",
      });

      setFlowCookie(response, setToken);

      return response;
    }

    // পাসওয়ার্ড রিসেট: নতুন পাসওয়ার্ড দেওয়ার flow কুকি বসে
    if (outcome.kind === "reset-verified") {
      const resetToken = await createFlowToken({
        purpose: "new-password",
        email: outcome.row.email,
        uid: outcome.row.uid,
      });

      const response = jsonResponse({
        success: true,
        purpose: "password-reset",
        message: "OTP verified successfully. You can now set a new password.",
        redirect: "/new-password",
      });

      setFlowCookie(response, resetToken);

      return response;
    }

    // অ্যাকাউন্ট যাচাই: সেশন কুকি বসে, flow কুকি মুছে যায়
    const { row, tokens } = outcome;

    const response = jsonResponse({
      success: true,
      purpose: "account-verification",
      is_verified: true,
      message: "Account verified successfully. You are now signed in.",
      redirect: "/",
      user: {
        uid: row.uid,
        sessionId: tokens.sessionId,
        username: row.username,
        email: row.email,
        is_verified: true,
        profile_photo_url: row.profile_image_public_url,
      },
      entityType: "user",
    });

    setSessionCookies(response, tokens);
    clearFlowCookie(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "OTP verification error");
  }
}
