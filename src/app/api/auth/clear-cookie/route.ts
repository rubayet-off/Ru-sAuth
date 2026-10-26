import { NextResponse, type NextRequest } from "next/server";
import { clearAllAuthCookies, clearFlowCookie } from "@/lib/cookies";

const ALLOWED_NEXT_PATHS = new Set(["/", "/email", "/profile", "/admin/login"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const next = searchParams.get("next");
  const destination = next && ALLOWED_NEXT_PATHS.has(next) ? next : "/";

  const response = NextResponse.redirect(new URL(destination, origin));

  response.headers.set("Cache-Control", "no-store");

  if (searchParams.get("scope") === "flow") {
    clearFlowCookie(response);
  } else {
    clearAllAuthCookies(response);
  }

  return response;
}
