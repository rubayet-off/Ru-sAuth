import { Suspense } from "react";
import { redirect } from "next/navigation";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import { authMe } from "@/lib/authMe";

import AdminLoginClient from "./AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <AdminLoginContent />
    </Suspense>
  );
}

// লগইন করা অ্যাডমিন সরাসরি ড্যাশবোর্ডে যায়; সাধারণ ব্যবহারকারী এই পেজে ঢুকতে পারে না
async function AdminLoginContent() {
  const { entityType, clearCookies } = await authMe();

  // অবৈধ কুকি থাকলে সেগুলো মুছে লগইন পেজে ফেরা হয়
  if (clearCookies) redirect("/api/auth/clear-cookie?next=%2Fadmin%2Flogin");

  if (entityType === "admin") redirect("/admin/dashboard");
  if (entityType === "user") redirect("/");

  return (
    <AuthCard>
      <AdminLoginClient />
    </AuthCard>
  );
}
