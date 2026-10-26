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
import { readRequestEntity } from "@/lib/requestEntity";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

interface UserEmailRow {
  uid: string;
  password_hash: string | null;
  provider: "CREDENTIALS" | "GOOGLE";
  is_account_deleted: boolean;
}

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }
  if (await readRequestEntity(request)) {
    return errorResponse("You are already signed in.", 409);
  }

  try {
    const body = await readJsonBody(request);
    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";

    if (!isValidEmail(email)) {
      return errorResponse("Please enter a valid email address.", 400, {
        clearFlow: true,
      });
    }

    const rateLimit = await checkUserRateLimit(email);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

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

    if (user?.is_account_deleted) {
      return errorResponse("This account is no longer available.", 403, {
        clearFlow: true,
      });
    }

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

    if (user && !user.password_hash) {
      return errorResponse(
        "Password sign-in is unavailable for this account.",
        409,
        { clearFlow: true },
      );
    }
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
