import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail } from "@mynaui/icons-react";

import AuthCard, { AuthCardFallback } from "@/app/component/AuthCard";
import RestartFlowLink from "@/app/component/RestartFlowLink";
import { emailBoxClass, linkClass } from "@/app/component/formStyles";
import { COOKIE_NAMES } from "@/lib/cookies";
import { readFlowToken } from "@/lib/flowToken";

export default function ProceedPage() {
  return (
    <Suspense fallback={<AuthCardFallback />}>
      <ProceedContent />
    </Suspense>
  );
}

async function ProceedContent() {
  const cookieStore = await cookies();

  const flow = await readFlowToken(cookieStore.get(COOKIE_NAMES.flow)?.value, [
    "create-account",
  ]);

  if (!flow) redirect("/email");

  return (
    <AuthCard>
      <p className="text-sm text-gray-300">
        Seems like you are new to Ru&apos;sAuth.
      </p>

      <div className={emailBoxClass}>
        <div className="flex min-w-0 items-center gap-2">
          <Mail size={20} stroke={1.5} className="shrink-0 text-gray-300" />

          <span className="break-all text-sm text-white">{flow.email}</span>
        </div>

        <RestartFlowLink className={`shrink-0 ${linkClass}`}>
          Change
        </RestartFlowLink>
      </div>

      <p className="text-sm text-gray-300">
        Continue to create your Ru&apos;sAuth account.
      </p>

      <Link
        href="/registration"
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 border border-[#3B82F6] bg-[#3B82F6] py-2.5 text-sm text-white transition-colors hover:bg-transparent"
      >
        <span className="leading-none">Proceed to create an account</span>
      </Link>

      <div className="mt-2 flex justify-center">
        <RestartFlowLink>Try with a different email</RestartFlowLink>
      </div>
    </AuthCard>
  );
}
