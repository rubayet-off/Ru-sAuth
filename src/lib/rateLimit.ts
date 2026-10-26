import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import pool from "@/database/pool";

import { errorResponse } from "./apiSecurity";
import { RATE_LIMIT_CONFIG } from "./authConfig";
import { getClientInfo } from "./session";
import { normalizeEmail } from "./validation";

export type RateLimitScope = "ADMIN" | "USER";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateLimitRow {
  blocked: boolean;
  retry_after: number;
}

function hashKey(scope: RateLimitScope, rawKey: string): string {
  return createHash("sha256").update(`${scope}|${rawKey}`).digest("hex");
}

function maybeCleanup(): void {
  if (Math.random() >= 0.02) return;

  void pool
    .query(
      `
        WITH expired_limits AS (
          DELETE FROM rate_limits
          WHERE (blocked_until IS NULL OR blocked_until < NOW())
            AND window_started_at < NOW() - INTERVAL '1 day'
        ), expired_otps AS (
          DELETE FROM otp_tokens WHERE expires_at < NOW()
        )
        DELETE FROM password_update_grants WHERE expires_at < NOW()
      `,
    )
    .catch((error) => console.error("Expired data cleanup error:", error));
}

export async function checkRateLimit(
  scope: RateLimitScope,
  rawKey: string,
): Promise<RateLimitResult> {
  const config =
    scope === "ADMIN" ? RATE_LIMIT_CONFIG.admin : RATE_LIMIT_CONFIG.user;

  const result = await pool.query<RateLimitRow>(
    `
      INSERT INTO rate_limits (scope, key_hash, request_count, window_started_at, blocked_until)
      VALUES ($1, $2, 1, NOW(), NULL)
      ON CONFLICT (scope, key_hash) DO UPDATE
      SET request_count = CASE
            WHEN rate_limits.blocked_until > NOW() THEN rate_limits.request_count
            WHEN rate_limits.blocked_until <= NOW()
              OR rate_limits.window_started_at <= NOW() - ($3::int * INTERVAL '1 minute') THEN 1
            ELSE rate_limits.request_count + 1
          END,
          window_started_at = CASE
            WHEN rate_limits.blocked_until > NOW() THEN rate_limits.window_started_at
            WHEN rate_limits.blocked_until <= NOW()
              OR rate_limits.window_started_at <= NOW() - ($3::int * INTERVAL '1 minute') THEN NOW()
            ELSE rate_limits.window_started_at
          END,
          blocked_until = CASE
            WHEN rate_limits.blocked_until > NOW() THEN rate_limits.blocked_until
            WHEN rate_limits.blocked_until <= NOW()
              OR rate_limits.window_started_at <= NOW() - ($3::int * INTERVAL '1 minute') THEN NULL
            WHEN rate_limits.request_count + 1 > $4::int THEN NOW() + ($5::int * INTERVAL '1 minute')
            ELSE NULL
          END
      RETURNING
        (blocked_until IS NOT NULL AND blocked_until > NOW()) AS blocked,
        COALESCE(CEIL(EXTRACT(EPOCH FROM (blocked_until - NOW()))), 0)::int AS retry_after
    `,
    [
      scope,
      hashKey(scope, rawKey),
      config.windowMinutes,
      config.maxRequests,
      config.blockMinutes,
    ],
  );

  maybeCleanup();

  const row = result.rows[0];

  return {
    allowed: !row?.blocked,
    retryAfterSeconds: row?.retry_after ?? 0,
  };
}

export function checkAdminRateLimit(
  request: NextRequest,
): Promise<RateLimitResult> {
  const { ipAddress } = getClientInfo(request);

  return checkRateLimit("ADMIN", ipAddress ?? "unknown");
}

export function checkUserRateLimit(email: string): Promise<RateLimitResult> {
  return checkRateLimit("USER", normalizeEmail(email));
}

export function rateLimitResponse(result: RateLimitResult) {
  const minutes = Math.max(1, Math.ceil(result.retryAfterSeconds / 60));

  return errorResponse(
    `Too many requests. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    429,
    {
      headers: { "Retry-After": String(Math.max(1, result.retryAfterSeconds)) },
    },
  );
}
