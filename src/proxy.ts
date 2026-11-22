import { NextResponse, type NextRequest } from "next/server";

import { readRequestEntity } from "@/lib/requestEntity";

type EntityType = "user" | "admin";

const USER_AUTH_ROUTES = [
  "/login",
  "/registration",
  "/forgot-password",
  "/otp-verification",
  "/new-password",
];

const USER_PROFILE_ROUTES = ["/profile"];
const ADMIN_LOGIN_ROUTES = ["/admin/login"];
const ADMIN_DASHBOARD_ROUTES = ["/admin/dashboard"];

function matchesAny(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function guardApiRequest(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const isReadOnly = request.method === "GET" || request.method === "HEAD";

  if (origin && origin !== request.nextUrl.origin && !isReadOnly) {
    return NextResponse.json(
      { message: "Cross-origin requests are not allowed." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  return null;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return guardApiRequest(request) ?? NextResponse.next();
  }

  const entityType: EntityType | null = await readRequestEntity(request);

  if (matchesAny(pathname, ADMIN_DASHBOARD_ROUTES)) {
    if (entityType === "admin") return NextResponse.next();
    if (entityType === "user") return redirectTo(request, "/");

    return redirectTo(request, "/admin/login");
  }

  if (matchesAny(pathname, ADMIN_LOGIN_ROUTES)) {
    if (entityType === "admin") return redirectTo(request, "/admin/dashboard");
    if (entityType === "user") return redirectTo(request, "/");

    return NextResponse.next();
  }

  if (matchesAny(pathname, USER_PROFILE_ROUTES)) {
    if (entityType === "user") return NextResponse.next();
    if (entityType === "admin") return redirectTo(request, "/admin/dashboard");

    return redirectTo(request, "/login");
  }

  if (matchesAny(pathname, USER_AUTH_ROUTES)) {
    if (entityType === "admin") return redirectTo(request, "/admin/dashboard");
    if (entityType === "user") return redirectTo(request, "/");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/login/:path*",
    "/registration/:path*",
    "/forgot-password/:path*",
    "/otp-verification/:path*",
    "/new-password/:path*",
  ],
};
