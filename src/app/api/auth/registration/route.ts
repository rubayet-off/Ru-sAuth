import { randomUUID } from "node:crypto";
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
import {
  checkUserIpRateLimit,
  checkUserRateLimit,
  firstBlocked,
  rateLimitResponse,
} from "@/lib/rateLimit";
import { setFlowCookie } from "@/lib/cookies";
import { createFlowToken } from "@/lib/flowToken";
import { hashPassword } from "@/lib/passwordHash";
import { readRequestEntity } from "@/lib/requestEntity";
import { getOtpCooldownSeconds, sendOTP } from "@/lib/sendOTP";
import {
  getPasswordError,
  getUsernameError,
  isValidEmail,
  normalizeEmail,
} from "@/lib/validation";

interface ExistingUserRow {
  uid: string;
  is_verified: boolean;
}

const ACCOUNT_EXISTS =
  "An account already exists for this email. Please log in instead.";

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  if (await readRequestEntity(request)) {
    return errorResponse("You are already signed in.", 409);
  }

  try {
    const body = await readJsonBody(request);

    if (
      !body ||
      typeof body.username !== "string" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return errorResponse("Username, email and password are required.", 400);
    }

    const username = body.username.trim();
    const email = normalizeEmail(body.email);
    const password = body.password;

    const usernameError = getUsernameError(username);
    if (usernameError) return errorResponse(usernameError, 400);

    if (!isValidEmail(email)) {
      return errorResponse("Please enter a valid email address.", 400);
    }

    const passwordError = getPasswordError(password);
    if (passwordError) return errorResponse(passwordError, 400);

    const blocked = await firstBlocked([
      checkUserRateLimit(email),
      checkUserIpRateLimit(request, "register"),
    ]);

    if (blocked) return rateLimitResponse(blocked);

    const uid = randomUUID();
    const passwordHash = await hashPassword(password);

    try {
      await withTransaction(async (client) => {
        const existing = await client.query<ExistingUserRow>(
          `
            SELECT uid, is_verified
            FROM users
            WHERE LOWER(email) = $1
            LIMIT 1
            FOR UPDATE
          `,
          [email],
        );

        const row = existing.rows[0];

        if (row?.is_verified) {
          throw new ApiError(ACCOUNT_EXISTS, 409);
        }

        if (row) {
          // An unverified sign-up for this email already exists (an earlier
          // attempt, or someone who does not own the address). Replace it with
          // a brand-new user id: any OTP page still open for the old attempt
          // is bound to the old id and stops working, so nobody can get the
          // owner to verify an account whose password they chose.
          const cooldown = await getOtpCooldownSeconds(
            row.uid,
            "ACCOUNT_VERIFICATION",
          );

          if (cooldown > 0) {
            throw new ApiError(
              `Please wait ${cooldown} second(s) before trying again.`,
              429,
              { headers: { "Retry-After": String(cooldown) } },
            );
          }

          await client.query(`DELETE FROM users WHERE uid = $1`, [row.uid]);
        }

        await client.query(
          `
            INSERT INTO users (uid, username, email, password_hash, provider, is_verified)
            VALUES ($1, $2, $3, $4, 'CREDENTIALS', FALSE)
          `,
          [uid, username, email, passwordHash],
        );
      });
    } catch (error) {
      // Two sign-ups for the same email at the same moment.
      if (isUniqueViolation(error)) {
        return errorResponse(ACCOUNT_EXISTS, 409);
      }

      throw error;
    }

    let otpSent = true;

    try {
      await sendOTP(email, uid, "ACCOUNT_VERIFICATION");
    } catch (error) {
      otpSent = false;
      console.error("Registration OTP delivery failed:", error);
    }

    const verificationToken = await createFlowToken({
      purpose: "verify-account",
      email,
      uid,
    });

    const response = jsonResponse(
      {
        success: true,
        message: otpSent
          ? "Account created. Check your email for the verification code."
          : "Your account was created, but the verification email could not be sent. Use Resend OTP on the next page.",
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
