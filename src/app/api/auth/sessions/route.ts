import type { NextRequest } from "next/server";

import pool from "@/database/pool";
import {
  errorResponse,
  handleRouteError,
  jsonResponse,
} from "@/lib/apiSecurity";
import { requireActiveUserSession } from "@/lib/requireActiveUserSession";

interface SessionHistoryRow {
  session_uid: string;
  browser_name: string | null;
  device_type: string | null;
  ip_address: string | null;
  created_at: Date | string;
  expires_at: Date | string;
  is_revoked: boolean;
}

export async function GET(request: NextRequest) {
  // কুকি আগেই পড়া হয়, যাতে Next.js এই রুটকে প্রতি রিকোয়েস্টে চালানোর (dynamic) রুট হিসেবে চিনে
  request.cookies.getAll();

  try {
    const current = await requireActiveUserSession(request);

    if (!current) {
      return errorResponse("Your session has expired. Please sign in again.", 401);
    }

    const result = await pool.query<SessionHistoryRow>(
      `
        SELECT
          session_uid, browser_name, device_type, ip_address,
          created_at, expires_at, is_revoked
        FROM sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [current.uid],
    );

    const now = Date.now();

    const sessions = result.rows.map((row) => {
      const expiry = new Date(row.expires_at).getTime();
      const isExpired = !Number.isFinite(expiry) || expiry <= now;

      const deviceType = row.device_type?.toLowerCase();

      return {
        sessionUid: row.session_uid,
        browser: row.browser_name || "Unknown browser",
        device:
          deviceType === "mobile" || deviceType === "tablet"
            ? "mobile"
            : "desktop",
        ip: row.ip_address || "Unknown IP",
        startedAt: new Date(row.created_at).toISOString(),
        current: row.session_uid === current.sessionId,
        revoked: row.is_revoked || isExpired,
      };
    });

    return jsonResponse({ success: true, sessions });
  } catch (error) {
    return handleRouteError(error, "Session-history error");
  }
}
