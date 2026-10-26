"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useToastStore } from "@/toast/toastStore";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_session: "Your session expired. Please try again.",
  auth_failed: "Could not verify your Google account. Please try again.",
};

export function useOAuthError(): void {
  const router = useRouter();
  const pathname = usePathname();
  const addToast = useToastStore((state) => state.addToast);

  const oauthError = useSearchParams().get("error");

  useEffect(() => {
    if (!oauthError) return;

    addToast(
      OAUTH_ERROR_MESSAGES[oauthError] ?? "An unexpected error occurred.",
      "error",
    );

    router.replace(pathname, { scroll: false });
  }, [oauthError, pathname, addToast, router]);
}
