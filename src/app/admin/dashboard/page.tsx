import { Suspense } from "react";
import { redirect } from "next/navigation";

import { loadDashboardSnapshot } from "@/lib/adminDashboardData";
import { authMe } from "@/lib/authMe";
import AuthStoreSetup from "@/zustand/authSetup";

import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex h-dvh w-full items-center justify-center bg-[#0E0F12]">
          <p className="text-sm text-gray-300">Loading dashboard...</p>
        </main>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

// অ্যাডমিন সেশন যাচাই করে ডাটাবেস থেকে ড্যাশবোর্ডের সব তথ্য এনে দেখায়
async function AdminDashboardContent() {
  const { user, admin, entityType, clearCookies } = await authMe();

  // অবৈধ কুকি থাকলে সেগুলো মুছে অ্যাডমিন লগইনে পাঠানো হয়
  if (clearCookies) redirect("/api/auth/clear-cookie?next=%2Fadmin%2Flogin");

  // শুধু সার্ভারে যাচাই করা অ্যাডমিন সেশনই ঢুকতে পারে; সাধারণ ব্যবহারকারী ও অতিথি ঢুকতে পারে না
  if (entityType === "user") redirect("/");
  if (entityType !== "admin" || !admin) redirect("/admin/login");

  const snapshot = await loadDashboardSnapshot(admin.email, admin.sessionId);

  if (!snapshot) redirect("/api/auth/clear-cookie?next=%2Fadmin%2Flogin");

  return (
    <>
      {/* লগইন তথ্য store এ বসায় এবং প্রয়োজনে টোকেন রিফ্রেশ করে */}
      <AuthStoreSetup user={user} admin={admin} entityType={entityType} />

      <AdminDashboardClient initialSnapshot={snapshot} />
    </>
  );
}
