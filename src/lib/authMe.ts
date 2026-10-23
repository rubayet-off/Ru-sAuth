import { cookies } from "next/headers";
import { cache } from "react";

import pool from "@/database/pool";
import type { User, Admin } from "@/zustand/authStore";

import { COOKIE_NAMES } from "./cookies";
import { verifyJWT } from "./jwt";
import {
  findActiveSession,
  tokenMatchesHash,
  type EntityType,
} from "./session";

export type AuthMeResult = {
  user: User | null;
  admin: Admin | null;
  entityType: EntityType | null;
  clearCookies: boolean;
};

type AuthPayload = {
  uid: string;
  sessionId: string;
  entityType: EntityType;
};

type UserSessionRow = {
  session_uid: string;
  refresh_token_hash: string;
  uid: string;
  username: string;
  email: string;
  is_verified: boolean;
  profile_image_public_url: string | null;
};

type AdminRow = {
  email: string;
  username: string;
};

// কুকি নেই: লগইন করা নেই, মোছার কিছু নেই
const EMPTY_RESULT: AuthMeResult = {
  user: null,
  admin: null,
  entityType: null,
  clearCookies: false,
};

// কুকি আছে কিন্তু অবৈধ: কুকি মুছে ফেলতে হবে
const INVALID_RESULT: AuthMeResult = {
  user: null,
  admin: null,
  entityType: null,
  clearCookies: true,
};

// টোকেনের payload আমাদের প্রত্যাশিত গঠনের কিনা যাচাই
function isAuthPayload(payload: unknown): payload is AuthPayload {
  if (typeof payload !== "object" || payload === null) return false;

  const value = payload as Record<string, unknown>;

  return (
    typeof value.uid === "string" &&
    typeof value.sessionId === "string" &&
    (value.entityType === "user" || value.entityType === "admin")
  );
}

// বর্তমান রিকোয়েস্টের কুকি থেকে লগইন করা ব্যবহারকারী বা অ্যাডমিন বের করে (একই রিকোয়েস্টে একবারই চলে)
export const authMe = cache(async (): Promise<AuthMeResult> => {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(COOKIE_NAMES.access)?.value;
  const refreshToken = cookieStore.get(COOKIE_NAMES.refresh)?.value;

  if (!accessToken && !refreshToken) return EMPTY_RESULT;

  let payload: AuthPayload | null = null;
  let needsRefresh = false;

  // ১. আগে access টোকেন যাচাই
  if (accessToken) {
    const verified = await verifyJWT(accessToken, "access");

    if (isAuthPayload(verified)) payload = verified;
  }

  // ২. access টোকেন কাজ না করলে refresh টোকেনে ফিরে যাওয়া
  if (!payload && refreshToken) {
    const verified = await verifyJWT(refreshToken, "refresh");

    if (isAuthPayload(verified)) {
      payload = verified;
      needsRefresh = true;
    }
  }

  if (!payload) return INVALID_RESULT;

  const { uid, sessionId, entityType } = payload;

  // ৩. সাধারণ ব্যবহারকারী: সেশন ও ব্যবহারকারীর তথ্য একটি মাত্র কুয়েরিতে আনা হয় (দ্রুত করার জন্য)
  if (entityType === "user") {
    const result = await pool.query<UserSessionRow>(
      `
        SELECT
          s.session_uid,
          s.refresh_token_hash,
          u.uid,
          u.username,
          u.email,
          u.is_verified,
          u.profile_image_public_url
        FROM sessions AS s
        JOIN users AS u ON u.uid = s.user_id
        WHERE s.session_uid = $1
          AND s.user_id = $2
          AND s.is_revoked = FALSE
          AND s.expires_at > NOW()
          AND u.is_account_deleted = FALSE
        LIMIT 1
      `,
      [sessionId, uid],
    );

    const row = result.rows[0];

    if (!row) return INVALID_RESULT;

    // refresh টোকেন ব্যবহার করলে তার হ্যাশ ডাটাবেসের সাথে মেলানো
    if (
      needsRefresh &&
      (!refreshToken || !tokenMatchesHash(refreshToken, row.refresh_token_hash))
    ) {
      return INVALID_RESULT;
    }

    const user: User = {
      uid: row.uid,
      sessionId: row.session_uid,
      username: row.username,
      email: row.email,
      is_verified: row.is_verified,
      profile_photo_url: row.profile_image_public_url,
      need_refresh: needsRefresh,
    };

    return { user, admin: null, entityType: "user", clearCookies: false };
  }

  // ৪. অ্যাডমিন: সেশন যাচাই করে অ্যাডমিনের তথ্য লোড
  const session = await findActiveSession(entityType, uid, sessionId);

  if (!session) return INVALID_RESULT;

  if (
    needsRefresh &&
    (!refreshToken || !tokenMatchesHash(refreshToken, session.refresh_token_hash))
  ) {
    return INVALID_RESULT;
  }

  const result = await pool.query<AdminRow>(
    `SELECT email, username FROM admins WHERE email = $1`,
    [uid],
  );

  const row = result.rows[0];

  if (!row) return INVALID_RESULT;

  const admin: Admin = {
    email: row.email,
    username: row.username,
    sessionId: session.session_uid,
    need_refresh: needsRefresh,
  };

  return { user: null, admin, entityType: "admin", clearCookies: false };
});
