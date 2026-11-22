import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  isTrustedBrowserRequest,
  jsonResponse,
} from "@/lib/apiSecurity";
import { AUTH_CONFIG } from "@/lib/authConfig";
import { requireActiveAdminSession } from "@/lib/requireActiveAdminSession";

interface CleanupRow {
  unverified_users: number;
  expired_otps: number;
  expired_grants: number;
  old_rate_limits: number;
}

export async function POST(request: NextRequest) {
  if (!isTrustedBrowserRequest(request)) {
    return errorResponse("Invalid request.", 403);
  }

  try {
    const admin = await requireActiveAdminSession(request);

    if (!admin) {
      return errorResponse(
        "Your session has expired. Please sign in again.",
        401,
      );
    }

    const result = await pool.query<CleanupRow>(
      `
        WITH removed_users AS (
          DELETE FROM users
          WHERE is_verified = FALSE
            AND created_at <= NOW() - ($1::int * INTERVAL '1 minute')
          RETURNING uid
        ), removed_otps AS (
          DELETE FROM otp_tokens
          WHERE expires_at < NOW()
          RETURNING otp_uid
        ), removed_grants AS (
          DELETE FROM password_update_grants
          WHERE expires_at < NOW()
          RETURNING grant_uid
        ), removed_limits AS (
          DELETE FROM rate_limits
          WHERE (blocked_until IS NULL OR blocked_until < NOW())
            AND window_started_at < NOW() - INTERVAL '1 day'
          RETURNING key_hash
        )
        SELECT
          (SELECT COUNT(*) FROM removed_users)::int AS unverified_users,
          (SELECT COUNT(*) FROM removed_otps)::int AS expired_otps,
          (SELECT COUNT(*) FROM removed_grants)::int AS expired_grants,
          (SELECT COUNT(*) FROM removed_limits)::int AS old_rate_limits
      `,
      [AUTH_CONFIG.unverifiedUserTtlMinutes],
    );

    const row = result.rows[0];
    const unverifiedUsers = row?.unverified_users ?? 0;
    const otherRows =
      (row?.expired_otps ?? 0) +
      (row?.expired_grants ?? 0) +
      (row?.old_rate_limits ?? 0);

    return jsonResponse({
      success: true,
      removedUnverifiedUsers: unverifiedUsers,
      removedOtherRows: otherRows,
      message:
        unverifiedUsers === 0 && otherRows === 0
          ? "Nothing to clean up. The database is already tidy."
          : `Cleanup complete: removed ${unverifiedUsers} unverified user${unverifiedUsers === 1 ? "" : "s"} and ${otherRows} expired record${otherRows === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    return handleRouteError(error, "Admin data cleanup error");
  }
}
