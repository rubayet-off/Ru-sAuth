import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  jsonResponse,
} from "@/lib/apiSecurity";
import { COOKIE_NAMES, clearAllAuthCookies } from "@/lib/cookies";
import { verifyJWT } from "@/lib/jwt";
import { tokenMatchesHash } from "@/lib/session";

interface StatusRow {
  refresh_token_hash: string;
  uid: string;
  username: string;
  email: string;
  profile_image_public_url: string | null;
  revision: string;
}

// সেশন আর বৈধ নয়: কুকিও মুছে দেওয়া হয়, যাতে প্রক্সি ও পেজ আর লগইন করা ধরে না নেয়
function signedOut(reason: "missing" | "revoked") {
  const response = errorResponse("This session is no longer active.", 401);

  response.headers.set("X-Auth-Reason", reason);
  clearAllAuthCookies(response);

  return response;
}

// GET /api/auth/status
// খোলা ট্যাব কয়েক সেকেন্ড পরপর এটি ডাকে; সেশন বাতিল, অ্যাকাউন্ট মোছা, ছবি বা নাম বদল সবই এখান থেকে ধরা পড়ে
export async function GET(request: NextRequest) {
  // কুকি আগেই পড়া হয়, যাতে Next.js এই রুটকে প্রতি রিকোয়েস্টে চালানোর (dynamic) রুট হিসেবে চিনে
  const refreshToken = request.cookies.get(COOKIE_NAMES.refresh)?.value;

  try {
    if (!refreshToken) return signedOut("missing");

    const payload = await verifyJWT(refreshToken, "refresh");

    if (
      !payload ||
      payload.entityType !== "user" ||
      typeof payload.uid !== "string" ||
      typeof payload.sessionId !== "string"
    ) {
      return signedOut("missing");
    }

    // সেশন, ব্যবহারকারী ও সেশন-তালিকার পরিবর্তন-চিহ্ন একটি মাত্র কুয়েরিতে আসে
    const result = await pool.query<StatusRow>(
      `
        SELECT
          s.refresh_token_hash,
          u.uid,
          u.username,
          u.email,
          u.profile_image_public_url,
          (
            SELECT CONCAT(
              COUNT(*) FILTER (WHERE x.is_revoked = FALSE AND x.expires_at > NOW()),
              ':',
              COALESCE(
                EXTRACT(EPOCH FROM MAX(GREATEST(x.created_at, COALESCE(x.revoked_at, x.created_at))))::bigint,
                0
              )
            )
            FROM sessions AS x
            WHERE x.user_id = s.user_id
          ) AS revision
        FROM sessions AS s
        JOIN users AS u ON u.uid = s.user_id
        WHERE s.session_uid = $1
          AND s.user_id = $2
          AND s.is_revoked = FALSE
          AND s.expires_at > NOW()
          AND u.is_account_deleted = FALSE
          AND u.is_verified = TRUE
        LIMIT 1
      `,
      [payload.sessionId, payload.uid],
    );

    const row = result.rows[0];

    if (!row) return signedOut("revoked");

    // অন্য ট্যাব এইমাত্র টোকেন বদলালে হ্যাশ মেলে না; এটি লগআউট নয়, তাই কুকি না মুছে ৪০৯ দেওয়া হয়
    if (!tokenMatchesHash(refreshToken, row.refresh_token_hash)) {
      return errorResponse("Session token is being rotated.", 409);
    }

    return jsonResponse({
      success: true,
      user: {
        uid: row.uid,
        username: row.username,
        email: row.email,
        profile_photo_url: row.profile_image_public_url,
      },
      sessionsRevision: row.revision,
    });
  } catch (error) {
    return handleRouteError(error, "Auth status error");
  }
}
