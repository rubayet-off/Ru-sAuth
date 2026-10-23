import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";

import NewClient from "./NewClient";

export default function NewPasswordPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <NewPasswordContent />
    </Suspense>
  );
}

// OTP যাচাইয়ের পর পাওয়া টোকেন ছাড়া এই পেজে ঢোকা যায় না
async function NewPasswordContent() {
  const cookieStore = await cookies();

  const flow = await readFlowToken(cookieStore.get(COOKIE_NAMES.flow)?.value, [
    "new-password",
  ]);

  if (!flow) redirect("/email");

  return (
    <AuthCard>
      <p className="text-sm text-gray-300">Set a new password for your account.</p>

      <NewClient />
    </AuthCard>
  );
}
