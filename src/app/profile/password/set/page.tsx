import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import { authMe } from "@/lib/authMe";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";

import PasswordUpdateClient from "./PasswordUpdateClient";

export default function PasswordSetPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <PasswordSetContent />
    </Suspense>
  );
}

// OTP যাচাইয়ের পর পাওয়া সঠিক টোকেন ছাড়া এই পেজে ঢোকা যায় না
// টোকেনের purpose ঠিক করে ফর্মটি "যোগ" নাকি "বদল" হবে; ক্লায়েন্ট এটি বদলাতে পারে না
async function PasswordSetContent() {
  const { user, entityType, clearCookies } = await authMe();

  if (clearCookies) redirect("/api/auth/clear-cookie");

  if (entityType !== "user" || !user) redirect("/email");

  const cookieStore = await cookies();

  const flow = await readFlowToken(cookieStore.get(COOKIE_NAMES.flow)?.value, [
    "set-add-password",
    "set-change-password",
  ]);

  if (
    !flow ||
    flow.uid !== user.uid ||
    flow.sessionId !== user.sessionId ||
    flow.email !== user.email.trim().toLowerCase()
  ) {
    redirect("/profile");
  }

  const mode = flow.purpose === "set-add-password" ? "add" : "change";

  return (
    <AuthCard>
      <p className="text-sm text-gray-300">
        {mode === "add"
          ? "Add a password to your account."
          : "Set a new password for your account."}
      </p>

      <PasswordUpdateClient mode={mode} />
    </AuthCard>
  );
}
