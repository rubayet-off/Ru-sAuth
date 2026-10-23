import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { withTransaction } from "@/database/transaction";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
  readJsonBody,
} from "@/lib/apiSecurity";
import { checkAdminRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { AUTH_CONFIG } from "@/lib/authConfig";
import { clearFlowCookie, setSessionCookies } from "@/lib/cookies";
import { createAdminSession, type SessionTokens } from "@/lib/session";
import {
  PASSWORD_MAX_BYTES,
  byteLength,
  isValidEmail,
  normalizeEmail,
} from "@/lib/validation";

interface AdminRow {
  email: string;
  username: string;
  password_hash: string;
}

// ইমেইল না মিললেও bcrypt চালানো হয়, যাতে সময় দেখে অ্যাডমিনের ইমেইল আছে কিনা বোঝা না যায়
// এটি র‍্যান্ডম পাসওয়ার্ডের আসল হ্যাশ (প্রথম দরকারে একবার বানানো হয়); কোনো পাসওয়ার্ডই এর সাথে মেলে না
let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomUUID(), AUTH_CONFIG.bcryptRounds);

  return dummyHash;
}

// লগইনের ফলাফল
type LoginOutcome =
  | { kind: "invalid" }
  | { kind: "success"; admin: AdminRow; tokens: SessionTokens };

// POST /api/admin/login  { email, password }
// অ্যাডমিন লগইনে OTP লাগে না; ভুল পাসওয়ার্ডের গণনা ডাটাবেসে রাখা হয় না, সুরক্ষা দেয় ডিভাইস-ভিত্তিক rate limit
export async function POST(request: NextRequest) {
  // ব্রাউজার থেকে আসা বিশ্বস্ত রিকোয়েস্ট কিনা যাচাই
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    // অ্যাডমিন লগইনের সীমা: একই ডিভাইস থেকে সময়সীমার মধ্যে সীমার বেশি রিকোয়েস্ট এলে ডিভাইসটি সাময়িক ব্লক
    // এটি ডাটাবেসে অ্যাডমিন অ্যাকাউন্ট লক করে না, তাই আক্রমণকারী আসল অ্যাডমিনকে লগইনের বাইরে রাখতে পারে না
    const rateLimit = await checkAdminRateLimit(request);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await readJsonBody(request);

    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return errorResponse("Please enter your email and password.", 400);
    }

    // ভুল গঠনের ইমেইল বা ৭২ বাইটের বেশি পাসওয়ার্ড ডাটাবেসে না গিয়েই একই সাধারণ এরর পায়
    if (!isValidEmail(email) || byteLength(password) > PASSWORD_MAX_BYTES) {
      return errorResponse("Invalid login credentials.", 401);
    }

    const outcome = await withTransaction<LoginOutcome>(async (client) => {
      const result = await client.query<AdminRow>(
        `
          SELECT email, username, password_hash
          FROM admins
          WHERE email = $1
          LIMIT 1
        `,
        [email],
      );

      const admin = result.rows[0];

      // অ্যাডমিন না থাকলেও একই সময়ে একই উত্তর
      if (!admin) {
        await bcrypt.compare(password, await getDummyHash());

        return { kind: "invalid" };
      }

      const matches = await bcrypt.compare(password, admin.password_hash);

      if (!matches) return { kind: "invalid" };

      // সঠিক পাসওয়ার্ড: শেষ লগইনের সময় বসিয়ে নতুন অ্যাডমিন সেশন তৈরি
      await client.query(`UPDATE admins SET last_login = NOW() WHERE email = $1`, [
        admin.email,
      ]);

      const tokens = await createAdminSession(client, request, admin.email);

      return { kind: "success", admin, tokens };
    });

    if (outcome.kind === "invalid") {
      return errorResponse("Invalid login credentials.", 401);
    }

    const { admin, tokens } = outcome;

    const response = jsonResponse({
      success: true,
      message: "Login successful!",
      redirect: "/admin/dashboard",
      admin: {
        sessionId: tokens.sessionId,
        username: admin.username,
        email: admin.email,
      },
      entityType: "admin",
    });

    // অ্যাডমিন সেশনের কুকি বসে; পুরোনো অস্থায়ী flow কুকি থাকলে মুছে যায়
    setSessionCookies(response, tokens);
    clearFlowCookie(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Admin login error");
  }
}
