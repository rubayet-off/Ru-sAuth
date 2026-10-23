import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { userAgent, type NextRequest } from "next/server";
import type { PoolClient } from "pg";

import pool from "@/database/pool";

import { AUTH_CONFIG } from "./authConfig";
import { createJWT } from "./jwt";

export type EntityType = "user" | "admin";

export interface SessionTokens {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

export interface StoredSession {
  session_uid: string;
  refresh_token_hash: string;
}

// ব্যবহারকারী ও অ্যাডমিনের সেশন টেবিল আলাদা; এই তালিকা ছাড়া অন্য নাম SQL এ বসে না
const SESSION_SOURCES = {
  user: { table: "sessions", actorColumn: "user_id" },
  admin: { table: "admin_sessions", actorColumn: "admin_email" },
} as const;

// রিফ্রেশ টোকেনের SHA-256 হ্যাশ বানায়
// bcrypt ব্যবহার করা হয় না, কারণ bcrypt শুধু প্রথম ৭২ বাইট পড়ে আর JWT এর শুরুর অংশ সব টোকেনে একই থাকে
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// টোকেনের হ্যাশ ডাটাবেসের হ্যাশের সাথে নিরাপদভাবে মেলায়
export function tokenMatchesHash(token: string, storedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// access ও refresh টোকেন তৈরি করে; refresh এ jti থাকে যাতে প্রতিবার টোকেন আলাদা হয়
export async function issueTokens(
  uid: string,
  sessionId: string,
  entityType: EntityType,
): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = { uid, sessionId, entityType };

  const [accessToken, refreshToken] = await Promise.all([
    createJWT(payload, AUTH_CONFIG.accessTokenSeconds, "access"),
    createJWT(
      { ...payload, jti: randomUUID() },
      AUTH_CONFIG.refreshTokenSeconds,
      "refresh",
    ),
  ]);

  return { accessToken, refreshToken };
}

// রিকোয়েস্ট থেকে ডিভাইস, ব্রাউজার, IP ও fingerprint বের করে
export function getClientInfo(request: NextRequest) {
  const agent = userAgent(request);

  const userAgentString = request.headers.get("user-agent") ?? "";
  const language = request.headers.get("accept-language") ?? "";

  // forwarded header শুধু বিশ্বস্ত reverse proxy (যেমন Vercel) এর পেছনে ভরসাযোগ্য
  const forwardedIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";

  return {
    deviceType: agent.device.type ?? "Unknown",
    browserName: agent.browser.name ?? "Unknown",
    osName: agent.os.name ?? "Unknown",
    // inet কলামে অবৈধ IP ঢুকলে INSERT ব্যর্থ হয়, তাই যাচাই করে দেওয়া হয়
    ipAddress: isIP(forwardedIp) ? forwardedIp : null,
    deviceFingerprint: createHash("sha256")
      .update(`${userAgentString}|${language}`)
      .digest("hex"),
  };
}

// নতুন লগইন সেশন তৈরি করে ডাটাবেসে রাখে (বর্তমান transaction এর ভেতরে চলে)
// টেবিল ও কলামের নাম শুধু SESSION_SOURCES থেকে আসে, তাই SQL এ বাইরের কোনো মান বসে না
async function createSession(
  client: PoolClient,
  request: NextRequest,
  entityType: EntityType,
  actorId: string,
): Promise<SessionTokens> {
  const { table, actorColumn } = SESSION_SOURCES[entityType];

  const sessionId = randomUUID();
  const { accessToken, refreshToken } = await issueTokens(
    actorId,
    sessionId,
    entityType,
  );

  const info = getClientInfo(request);

  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.refreshTokenSeconds * 1000,
  );

  await client.query(
    `
      INSERT INTO ${table} (
        session_uid,
        ${actorColumn},
        refresh_token_hash,
        device_type,
        browser_name,
        os_name,
        ip_address,
        device_fingerprint,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      sessionId,
      actorId,
      hashToken(refreshToken),
      info.deviceType,
      info.browserName,
      info.osName,
      info.ipAddress,
      info.deviceFingerprint,
      expiresAt,
    ],
  );

  return { sessionId, accessToken, refreshToken };
}

// সাধারণ ব্যবহারকারীর নতুন সেশন
export function createUserSession(
  client: PoolClient,
  request: NextRequest,
  uid: string,
): Promise<SessionTokens> {
  return createSession(client, request, "user", uid);
}

// অ্যাডমিনের নতুন সেশন (uid হিসেবে অ্যাডমিনের ইমেইল থাকে)
export function createAdminSession(
  client: PoolClient,
  request: NextRequest,
  email: string,
): Promise<SessionTokens> {
  return createSession(client, request, "admin", email);
}

// বৈধ (revoke বা মেয়াদোত্তীর্ণ নয়) সেশন খুঁজে আনে
export async function findActiveSession(
  entityType: EntityType,
  uid: string,
  sessionId: string,
): Promise<StoredSession | null> {
  const { table, actorColumn } = SESSION_SOURCES[entityType];

  const result = await pool.query<StoredSession>(
    `
      SELECT session_uid, refresh_token_hash
      FROM ${table}
      WHERE session_uid = $1
        AND ${actorColumn} = $2
        AND is_revoked = FALSE
        AND expires_at > NOW()
    `,
    [sessionId, uid],
  );

  return result.rows[0] ?? null;
}

// টোকেন রোটেশনের সময় নতুন হ্যাশ বসায়; পুরোনো হ্যাশ না মিললে (দুই ট্যাবের race) false ফেরত দেয়
export async function rotateSessionToken(
  entityType: EntityType,
  uid: string,
  sessionId: string,
  oldHash: string,
  newHash: string,
): Promise<boolean> {
  const { table, actorColumn } = SESSION_SOURCES[entityType];

  const result = await pool.query(
    `
      UPDATE ${table}
      SET refresh_token_hash = $1,
          expires_at = NOW() + ($5 * INTERVAL '1 second'),
          last_used_at = NOW()
      WHERE session_uid = $2
        AND ${actorColumn} = $3
        AND refresh_token_hash = $4
        AND is_revoked = FALSE
        AND expires_at > NOW()
    `,
    [newHash, sessionId, uid, oldHash, AUTH_CONFIG.refreshTokenSeconds],
  );

  return result.rowCount === 1;
}

// একটি সেশন revoke করে (লগআউটের সময় ব্যবহার হয়)
export async function revokeSession(
  entityType: EntityType,
  uid: string,
  sessionId: string,
): Promise<void> {
  const { table, actorColumn } = SESSION_SOURCES[entityType];

  await pool.query(
    `
      UPDATE ${table}
      SET is_revoked = TRUE,
          revoked_at = COALESCE(revoked_at, NOW())
      WHERE session_uid = $1
        AND ${actorColumn} = $2
        AND is_revoked = FALSE
    `,
    [sessionId, uid],
  );
}
