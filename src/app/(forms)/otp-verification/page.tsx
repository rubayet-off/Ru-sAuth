import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";

import OTPClient from "./OTPClient";

export default function OTPVerificationPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <OTPVerificationContent />
    </Suspense>
  );
}

// অ্যাকাউন্ট যাচাই এবং পাসওয়ার্ড রিসেট, দুই ধরনের টোকেনেই এই পেজ খোলে
// রিসেটে অস্তিত্বহীন ইমেইলের uid থাকে না, তবুও পেজ খোলে, যাতে অ্যাকাউন্ট আছে কিনা বোঝা না যায়
async function OTPVerificationContent() {
  const cookieStore = await cookies();

  const flow = await readFlowToken(cookieStore.get(COOKIE_NAMES.flow)?.value, [
    "verify-account",
    "password-reset",
  ]);

  if (!flow) redirect("/email");

  return (
    <AuthCard>
      <OTPClient
        email={flow.email}
        purpose={flow.purpose === "verify-account" ? "verify-account" : "password-reset"}
      />
    </AuthCard>
  );
}
