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
import { readRequestEntity } from "@/lib/requestEntity";
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

let dummyHash: Promise<string> | undefined;

function getDummyHash(): Promise<string> {
  dummyHash ??= bcrypt.hash(randomUUID(), AUTH_CONFIG.bcryptRounds);

  return dummyHash;
}

type LoginOutcome =
  | { kind: "invalid" }
  | { kind: "success"; admin: AdminRow; tokens: SessionTokens };

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  if ((await readRequestEntity(request)) === "user") {
    return errorResponse(
      "A user account is signed in on this browser. Sign out of it first.",
      409,
    );
  }

  try {
    const rateLimit = await checkAdminRateLimit(request);

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await readJsonBody(request);

    const email =
      typeof body?.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return errorResponse("Please enter your email and password.", 400);
    }

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

      if (!admin) {
        await bcrypt.compare(password, await getDummyHash());

        return { kind: "invalid" };
      }

      const matches = await bcrypt.compare(password, admin.password_hash);

      if (!matches) return { kind: "invalid" };

      await client.query(
        `UPDATE admins SET last_login = NOW() WHERE email = $1`,
        [admin.email],
      );

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

    setSessionCookies(response, tokens);
    clearFlowCookie(response);

    return response;
  } catch (error) {
    return handleRouteError(error, "Admin login error");
  }
}
