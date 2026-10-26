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

async function AdminLoginContent() {
  const { entityType, clearCookies } = await authMe();

  if (clearCookies) redirect("/api/auth/clear-cookie?next=%2Fadmin%2Flogin");
  if (entityType === "admin") redirect("/admin/dashboard");
  if (entityType === "user") redirect("/");

  return (
    <AuthCard>
      <AdminLoginClient />
    </AuthCard>
  );
}
