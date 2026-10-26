import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import OTPClient from "@/app/(forms)/otp-verification/OTPClient";
import { authMe } from "@/lib/authMe";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";

export default function PasswordVerifyPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <PasswordVerifyContent />
    </Suspense>
  );
}

async function PasswordVerifyContent() {
  const { user, entityType, clearCookies } = await authMe();

  if (clearCookies) redirect("/api/auth/clear-cookie");

  if (entityType !== "user" || !user) redirect("/email");

  const cookieStore = await cookies();

  const flow = await readFlowToken(cookieStore.get(COOKIE_NAMES.flow)?.value, [
    "verify-add-password",
    "verify-change-password",
  ]);

  if (
    !flow ||
    flow.uid !== user.uid ||
    flow.sessionId !== user.sessionId ||
    flow.email !== user.email.trim().toLowerCase()
  ) {
    redirect("/profile");
  }

  return (
    <AuthCard>
      <OTPClient
        email={user.email}
        purpose={
          flow.purpose === "verify-add-password"
            ? "verify-add-password"
            : "verify-change-password"
        }
      />
    </AuthCard>
  );
}
