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
        purpose={
          flow.purpose === "verify-account"
            ? "verify-account"
            : "password-reset"
        }
      />
    </AuthCard>
  );
}
