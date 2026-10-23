import type { NextResponse } from "next/server";

import { AUTH_CONFIG } from "./authConfig";
import { isProduction } from "./env";

// প্রোডাকশনে "__Host-" প্রিফিক্স: ব্রাউজার শুধু Secure + path=/ + Domain ছাড়া কুকিই গ্রহণ করে, তাই সাবডোমেইন থেকে কুকি বসানো যায় না
const PREFIX = isProduction ? "__Host-" : "";

// সব কুকির নাম এক জায়গায়
export const COOKIE_NAMES = {
  access: `${PREFIX}access-token`,
  refresh: `${PREFIX}refresh-token`,
  flow: `${PREFIX}auth-token`,
  oauth: `${PREFIX}oauth_state`,
} as const;

// কুকি সেট ও মোছার সময় একই অপশন লাগে, নইলে ব্রাউজার কুকি মোছে না
const BASE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

// একটি কুকি সেট করে
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

// একটি কুকি সম্পূর্ণ মুছে দেয় (একই path ও অপশনসহ)
export function clearCookie(response: NextResponse, name: string): void {
  response.cookies.set(name, "", {
    ...BASE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  });
}

// ইমেইল / OTP / রিসেট ধাপের অস্থায়ী flow কুকি সেট করে
export function setFlowCookie(response: NextResponse, token: string): void {
  setCookie(response, COOKIE_NAMES.flow, token, AUTH_CONFIG.flowTokenSeconds);
}

// শুধু flow কুকি মোছে (ইমেইল পাল্টানোর সময় ব্যবহার হয়)
export function clearFlowCookie(response: NextResponse): void {
  clearCookie(response, COOKIE_NAMES.flow);
}

// লগইন সেশনের access ও refresh কুকি সেট করে
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

// লগইন সেশনের access ও refresh কুকি মোছে
export function clearSessionCookies(response: NextResponse): void {
  clearCookie(response, COOKIE_NAMES.access);
  clearCookie(response, COOKIE_NAMES.refresh);
}

// অথেন্টিকেশনের সব কুকি (flow + access + refresh) মোছে
export function clearAllAuthCookies(response: NextResponse): void {
  clearFlowCookie(response);
  clearSessionCookies(response);
}
