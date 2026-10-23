import type { NextRequest } from "next/server";

import {
  errorResponse,
  handleRouteError,
  jsonResponse,
} from "@/lib/apiSecurity";
import { loadDashboardSnapshot } from "@/lib/adminDashboardData";
import { COOKIE_NAMES, clearAllAuthCookies } from "@/lib/cookies";
import { requireActiveAdminSession } from "@/lib/requireActiveAdminSession";

// GET /api/admin/dashboard
// খোলা ড্যাশবোর্ড কয়েক সেকেন্ড পরপর এটি ডাকে; সেশন বাতিল, ব্যবহারকারীর ছবি/নাম বদল, নতুন ব্যবহারকারী সবই এখান থেকে ধরা পড়ে
export async function GET(request: NextRequest) {
  // কুকি আগেই পড়া হয়, যাতে Next.js এই রুটকে প্রতি রিকোয়েস্টে চালানোর (dynamic) রুট হিসেবে চেনে
  request.cookies.get(COOKIE_NAMES.refresh);

  try {
    const admin = await requireActiveAdminSession(request);

    // সেশন বাতিল বা মেয়াদোত্তীর্ণ: কুকিও মুছে দেওয়া হয়, যাতে প্রক্সি আর লগইন করা ধরে না নেয়
    if (!admin) {
      const response = errorResponse("This session is no longer active.", 401);

      clearAllAuthCookies(response);

      return response;
    }

    const snapshot = await loadDashboardSnapshot(admin.email, admin.sessionId);

    if (!snapshot) return errorResponse("This session is no longer active.", 401);

    return jsonResponse({ success: true, ...snapshot });
  } catch (error) {
    return handleRouteError(error, "Admin dashboard snapshot error");
  }
}
