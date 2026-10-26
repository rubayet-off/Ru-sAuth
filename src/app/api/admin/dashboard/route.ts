import type { NextRequest } from "next/server";

import { handleRouteError, jsonResponse } from "@/lib/apiSecurity";
import { loadDashboardSnapshot } from "@/lib/adminDashboardData";
import { COOKIE_NAMES, clearAllAuthCookies } from "@/lib/cookies";
import { inspectAdminSession } from "@/lib/requireActiveAdminSession";

function signedOut(reason: "missing" | "revoked" | "foreign") {
  const response = jsonResponse(
    { message: "This session is no longer active.", reason },
    { status: 401 },
  );

  if (reason !== "foreign") clearAllAuthCookies(response);

  return response;
}

export async function GET(request: NextRequest) {
  request.cookies.get(COOKIE_NAMES.refresh);

  try {
    const inspection = await inspectAdminSession(request);

    if (
      inspection.state === "missing" ||
      inspection.state === "revoked" ||
      inspection.state === "foreign"
    ) {
      return signedOut(inspection.state);
    }

    if (inspection.state === "stale") {
      return jsonResponse(
        { message: "Session token is out of date.", reason: "stale" },
        { status: 409 },
      );
    }

    const { session } = inspection;

    const snapshot = await loadDashboardSnapshot(
      session.email,
      session.sessionId,
    );

    if (!snapshot) return signedOut("revoked");

    return jsonResponse({ success: true, ...snapshot });
  } catch (error) {
    return handleRouteError(error, "Admin dashboard snapshot error");
  }
}
