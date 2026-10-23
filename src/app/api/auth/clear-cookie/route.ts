import { NextResponse, type NextRequest } from "next/server";

import { clearAllAuthCookies, clearFlowCookie } from "@/lib/cookies";

// রিডাইরেক্টের জন্য শুধু এই পথগুলো অনুমোদিত (open redirect ঠেকাতে)
const ALLOWED_NEXT_PATHS = new Set(["/", "/email", "/profile", "/admin/login"]);

// GET /api/auth/clear-cookie
//   ?scope=flow  -> শুধু অস্থায়ী flow কুকি মোছে (ইমেইল "Change" লিংকে ব্যবহার হয়)
//   (scope ছাড়া) -> flow + access + refresh সব কুকি মোছে (অবৈধ সেশনে ব্যবহার হয়)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const next = searchParams.get("next");
  const destination = next && ALLOWED_NEXT_PATHS.has(next) ? next : "/";

  // রিডাইরেক্ট করার URL রিকোয়েস্টের নিজের origin থেকে নেওয়া হয়, তাই dev ও production দুই জায়গায় ঠিক চলে
  const response = NextResponse.redirect(new URL(destination, origin));

  response.headers.set("Cache-Control", "no-store");

  if (searchParams.get("scope") === "flow") {
    clearFlowCookie(response);
  } else {
    clearAllAuthCookies(response);
  }

  return response;
}
