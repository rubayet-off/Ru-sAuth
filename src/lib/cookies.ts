import type { NextResponse } from "next/server";

import { AUTH_CONFIG } from "./authConfig";
import { COOKIE_NAMES } from "./cookieNames";
import { isProduction } from "./env";
export { COOKIE_NAMES };

const BASE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export function setCookie(
  response: NextResponse,
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  response.cookies.set(name, value, {
    ...BASE_OPTIONS,
    maxAge: maxAgeSeconds,
  });
}

export function clearCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, "", {
    ...BASE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  });
}

export function setFlowCookie(response: NextResponse, token: string): void {
  setCookie(response, COOKIE_NAMES.flow, token, AUTH_CONFIG.flowTokenSeconds);
}

export function clearFlowCookie(response: NextResponse): void {
  clearCookie(response, COOKIE_NAMES.flow);
}

export function setSessionCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): void {
  setCookie(
    response,
    COOKIE_NAMES.access,
    tokens.accessToken,
    AUTH_CONFIG.accessTokenSeconds,
  );

  setCookie(
    response,
    COOKIE_NAMES.refresh,
    tokens.refreshToken,
    AUTH_CONFIG.refreshTokenSeconds,
  );
}

export function clearSessionCookies(response: NextResponse): void {
  clearCookie(response, COOKIE_NAMES.access);
  clearCookie(response, COOKIE_NAMES.refresh);
}

export function clearAllAuthCookies(response: NextResponse): void {
  clearFlowCookie(response);
  clearSessionCookies(response);
}
