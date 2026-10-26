import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

import { isUniqueViolation, withTransaction } from "@/database/transaction";
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
import { COOKIE_NAMES, setFlowCookie } from "@/lib/cookies";
import { createFlowToken, readFlowToken } from "@/lib/flowToken";
import { sendOTP } from "@/lib/sendOTP";
import { getPasswordError, getUsernameError } from "@/lib/validation";

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const body = await readJsonBody(request);

    if (
      !body ||
      typeof body.username !== "string" ||
      typeof body.password !== "string"
    ) {
      return errorResponse("Username and password are required.", 400);
    }

    const username = body.username.trim();
    const password = body.password;

    const inputError = getUsernameError(username) ?? getPasswordError(password);

    if (inputError) return errorResponse(inputError, 400);

    const flowToken = request.cookies.get(COOKIE_NAMES.flow)?.value;

    if (!flowToken) {
      return errorResponse(
        "Your registration session expired. Start again.",
        401,
      );
    }

    const flow = await readFlowToken(flowToken, ["create-account"]);

    if (!flow) {
      return errorResponse(
        "Your registration session is invalid. Start again.",
        401,
        { clearFlow: true },
      );
    }

    const rateLimit = await checkUserRateLimit(flow.email);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const uid = randomUUID();
    const passwordHash = await bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);

    const verificationToken = await createFlowToken({
      purpose: "verify-account",
      email: flow.email,
      uid,
    });

    try {
      await withTransaction(async (client) => {
        const existingEmail = await client.query(
          `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
          [flow.email],
        );

        if (existingEmail.rowCount) {
          throw new ApiError(
            "An account already exists for this email. Please sign in.",
            409,
            { clearFlow: true },
          );
        }

        await client.query(
          `
            INSERT INTO users (uid, username, email, password_hash, provider, is_verified)
            VALUES ($1, $2, $3, $4, 'CREDENTIALS', FALSE)
          `,
          [uid, username, flow.email, passwordHash],
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const constraint = (error as { constraint?: string }).constraint;

        console.error("Registration unique violation:", constraint);
      }

      throw error;
    }

    let otpSent = true;

    try {
      await sendOTP(flow.email, uid, "ACCOUNT_VERIFICATION");
    } catch (error) {
      otpSent = false;
      console.error("Registration OTP delivery failed:", error);
    }

    const response = jsonResponse(
      {
        success: true,
        message: otpSent
          ? "Account created successfully. Check your email for the verification code."
          : "Your account was created, but the verification email could not be sent. Continue to verification and resend the code.",
        redirect: "/otp-verification",
      },
      { status: 201 },
    );

    setFlowCookie(response, verificationToken);

    return response;
  } catch (error) {
    return handleRouteError(error, "Registration error");
  }
}
