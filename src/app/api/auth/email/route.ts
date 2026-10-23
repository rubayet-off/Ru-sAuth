import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/apiSecurity";
import { AUTH_CONFIG } from "@/lib/authConfig";
import { checkUserRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { clearFlowCookie, setFlowCookie } from "@/lib/cookies";
import { createFlowToken } from "@/lib/flowToken";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

interface UserEmailRow {
  uid: string;
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
    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";

    // নতুন ইমেইল দিলে আগের অসম্পূর্ণ flow এর কুকি যেন আটকে না থাকে, তাই এরর হলেও কুকি মোছা হয়
    if (!isValidEmail(email)) {
      return errorResponse("Please enter a valid email address.", 400, {
        clearFlow: true,
      });
    }

    // অথেন্টিকেশন রিকোয়েস্টের সীমা: একই ইমেইলের জন্য সীমা পেরোলে ব্যবহারকারী সাময়িক ব্লক
    const rateLimit = await checkUserRateLimit(email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    // যাচাই না হওয়া অ্যাকাউন্ট নির্ধারিত সময়ের বেশি পুরোনো হলে স্থায়ীভাবে মুছে ফেলা হয়
    // এরপর ইমেইলটি নতুন ধরা হয়, তাই ব্যবহারকারী সরাসরি অ্যাকাউন্ট তৈরির ধাপে (/proceed) যায়
    // সেশন, OTP ও অন্য সংশ্লিষ্ট সারি ON DELETE CASCADE এ নিজে থেকেই মুছে যায়
    await pool.query(
      `
        DELETE FROM users
        WHERE LOWER(email) = $1
          AND is_verified = FALSE
          AND created_at <= NOW() - ($2::int * INTERVAL '1 minute')
      `,
      [email, AUTH_CONFIG.unverifiedUserTtlMinutes],
    );

    const result = await pool.query<UserEmailRow>(
      `
        SELECT uid, password_hash, provider, is_account_deleted
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
      `,
      [email],
    );

    const user = result.rows[0];

    // মুছে ফেলা অ্যাকাউন্ট দিয়ে আর এগোনো যাবে না
    if (user?.is_account_deleted) {
      return errorResponse("This account is no longer available.", 403, {
        clearFlow: true,
      });
    }

    // পাসওয়ার্ডহীন Google অ্যাকাউন্টে Google দিয়েই লগইন করতে বলা হয়
    // (Google অ্যাকাউন্টে পরে পাসওয়ার্ড যোগ করা থাকলে নিচের ধাপে পাসওয়ার্ড দিয়েও ঢোকা যায়)
    if (user?.provider === "GOOGLE" && !user.password_hash) {
      const response = jsonResponse({
        success: true,
        exist: true,
        auth_type: "google",
        message: "Please continue with Google.",
      });

      clearFlowCookie(response);
      return response;
    }

    // credentials অ্যাকাউন্টে পাসওয়ার্ড থাকা বাধ্যতামূলক
    if (user && !user.password_hash) {
      return errorResponse(
        "Password sign-in is unavailable for this account.",
        409,
        { clearFlow: true },
      );
    }

    // ইমেইল আগে থেকে থাকলে পাসওয়ার্ড ধাপে, না থাকলে অ্যাকাউন্ট তৈরির ধাপে যাবে
    const flowToken = await createFlowToken(
      user
        ? { purpose: "enter-password", email, uid: user.uid }
        : { purpose: "create-account", email, uid: null },
    );

    const response = jsonResponse({
      success: true,
      exist: Boolean(user),
      auth_type: user ? "credentials" : "new",
      message: user
        ? "Continue with your password."
        : "Continue to create your account.",
      redirect: user ? "/password" : "/proceed",
    });

    setFlowCookie(response, flowToken);

    return response;
  } catch (error) {
    return handleRouteError(error, "Email check error");
  }
}
