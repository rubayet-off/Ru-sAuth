import { cookies } from "next/headers";
import { cache } from "react";

import pool from "@/database/pool";
import type { User, Admin } from "@/zustand/authStore";

import { AUTH_CONFIG } from "./authConfig";
import { COOKIE_NAMES } from "./cookieNames";
import { verifyJWT } from "./jwt";
import {
  findActiveSession,
  matchRefreshToken,
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
  previous_refresh_token_hash: string | null;
  in_grace: boolean;
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

const EMPTY_RESULT: AuthMeResult = {
  user: null,
  admin: null,
  entityType: null,
  clearCookies: false,
};

const INVALID_RESULT: AuthMeResult = {
  user: null,
  admin: null,
  entityType: null,
  clearCookies: true,
};

function isAuthPayload(payload: unknown): payload is AuthPayload {
  if (typeof payload !== "object" || payload === null) return false;

  const value = payload as Record<string, unknown>;

  return (
    typeof value.uid === "string" &&
    typeof value.sessionId === "string" &&
    (value.entityType === "user" || value.entityType === "admin")
  );
}

export const authMe = cache(async (): Promise<AuthMeResult> => {
  const cookieStore = await cookies();

  const accessToken = cookieStore.get(COOKIE_NAMES.access)?.value;
  const refreshToken = cookieStore.get(COOKIE_NAMES.refresh)?.value;

  if (!accessToken && !refreshToken) return EMPTY_RESULT;

  let payload: AuthPayload | null = null;
  let needsRefresh = false;

  if (accessToken) {
    const verified = await verifyJWT(accessToken, "access");
    if (isAuthPayload(verified)) payload = verified;
  }

  if (!payload && refreshToken) {
    const verified = await verifyJWT(refreshToken, "refresh");

    if (isAuthPayload(verified)) {
      payload = verified;
      needsRefresh = true;
    }
  }

  if (!payload) return INVALID_RESULT;

  const { uid, sessionId, entityType } = payload;

  if (entityType === "user") {
    const result = await pool.query<UserSessionRow>(
      `
        SELECT
          s.session_uid,
          s.refresh_token_hash,
          s.previous_refresh_token_hash,
          COALESCE(s.rotated_at > NOW() - ($3::int * INTERVAL '1 second'), FALSE) AS in_grace,
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
      [sessionId, uid, AUTH_CONFIG.refreshGraceSeconds],
    );

    const row = result.rows[0];
    if (!row) return INVALID_RESULT;

    if (
      needsRefresh &&
      (!refreshToken || matchRefreshToken(refreshToken, row) === "none")
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

  const session = await findActiveSession(entityType, uid, sessionId);
  if (!session) return INVALID_RESULT;

  if (
    needsRefresh &&
    (!refreshToken || matchRefreshToken(refreshToken, session) === "none")
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
