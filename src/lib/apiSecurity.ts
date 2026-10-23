import { NextResponse, type NextRequest } from "next/server";

import { clearFlowCookie } from "./cookies";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

// শুধু আমাদের নিজের ওয়েবসাইট থেকে আসা fetch রিকোয়েস্ট বিশ্বস্ত ধরা হয়
export function isTrustedBrowserRequest(request: NextRequest | Request): boolean {
  if (request.headers.get("x-requested-with") !== "XMLHttpRequest") {
    return false;
  }

  // আধুনিক ব্রাউজার Sec-Fetch-Site পাঠায় (বদলানো যায় না); অন্য সাইট থেকে আসা রিকোয়েস্ট এখানেই আটকায়
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && fetchSite !== "same-origin") return false;

  const origin = request.headers.get("origin");

  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

// JSON বডি পড়ে; Content-Type ভুল বা বডি অবৈধ হলে null ফেরত দেয়
export async function readJsonBody(
  request: NextRequest | Request,
): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim();

  if (contentType !== "application/json") return null;

  const body: unknown = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  return body as Record<string, unknown>;
}

// সফল JSON রেসপন্স (ক্যাশ বন্ধ থাকে)
export function jsonResponse(
  body: Record<string, unknown>,
  init: { status?: number; headers?: Record<string, string> } = {},
): NextResponse {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { ...NO_STORE_HEADERS, ...init.headers },
  });
}

// এরর JSON রেসপন্স (ক্যাশ বন্ধ থাকে)
export function errorResponse(
  message: string,
  status: number,
  options: { clearFlow?: boolean; headers?: Record<string, string> } = {},
): NextResponse {
  const response = jsonResponse(
    { message },
    { status, headers: options.headers },
  );

  // flow টোকেন অবৈধ হলে কুকিও মুছে দেওয়া হয়
  if (options.clearFlow) {
    clearFlowCookie(response);
  }

  return response;
}

// প্রত্যাশিত ব্যর্থতা বোঝাতে এই এরর throw করা হয়; transaction এর ভেতরে থ্রো করলে ROLLBACK হয়
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly options: {
      clearFlow?: boolean;
      headers?: Record<string, string>;
    } = {},
  ) {
    super(message);
  }
}

// route এর catch ব্লকে ব্যবহার হয়: ApiError হলে সেটির রেসপন্স, নইলে লগ করে ৫০০ রেসপন্স
export function handleRouteError(error: unknown, label: string): NextResponse {
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.status, error.options);
  }

  console.error(`${label}:`, error);

  return errorResponse("Something went wrong. Please try again.", 500);
}
