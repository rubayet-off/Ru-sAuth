import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";

import RegistrationClient from "./RegistrationClient";

export default function RegistrationPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <RegistrationContent />
    </Suspense>
  );
}

// অ্যাকাউন্ট তৈরির টোকেন না থাকলে ইমেইল পেজে ফেরত পাঠানো হয়
async function RegistrationContent() {
  const cookieStore = await cookies();

  const flow = await readFlowToken(cookieStore.get(COOKIE_NAMES.flow)?.value, [
    "create-account",
  ]);

  if (!flow) redirect("/email");

  return (
    <AuthCard>
      <p className="text-sm text-gray-300">Create an account with your credentials.</p>

      <RegistrationClient email={flow.email} />
    </AuthCard>
  );
}
