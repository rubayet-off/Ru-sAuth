import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";

import PasswordClient from "./PasswordClient";

export default function PasswordPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <PasswordContent />
    </Suspense>
  );
}

// ইমেইল ধাপের টোকেন না থাকলে ইমেইল পেজে ফেরত পাঠানো হয়
async function PasswordContent() {
  const cookieStore = await cookies();

  const flow = await readFlowToken(cookieStore.get(COOKIE_NAMES.flow)?.value, [
    "enter-password",
  ]);

  if (!flow) redirect("/email");

  return (
    <AuthCard>
      <PasswordClient email={flow.email} />
    </AuthCard>
  );
}
