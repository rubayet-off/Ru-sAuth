"use client";

import { Password, Refresh } from "@mynaui/icons-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { IconField } from "@/app/component/FormFields";
import RestartFlowLink from "@/app/component/RestartFlowLink";
import {
  linkClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/app/component/formStyles";
import {
  apiRequest,
  parseAuthUser,
  UNEXPECTED_RESPONSE,
} from "@/lib/clientApi";
import { OTP_LENGTH, isValidOtp } from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

interface OTPClientProps {
  email: string;
  purpose:
    | "verify-account"
    | "password-reset"
    | "verify-add-password"
    | "verify-change-password";
}

export default function OTPClient({ email, purpose }: OTPClientProps) {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isPending, setIsPending] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const isPasswordUpdate =
    purpose === "verify-add-password" || purpose === "verify-change-password";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || isResending) return;

    const rawOtp = new FormData(event.currentTarget).get("otp");
    const otp = typeof rawOtp === "string" ? rawOtp.trim() : "";

    if (!isValidOtp(otp)) {
      addToast("Enter the six-digit verification code.", "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/otp-verification", {
        body: { otp },
      });

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      if (isPasswordUpdate) {
        if (result.data.redirect !== "/profile/password/set") {
          addToast(UNEXPECTED_RESPONSE, "error");
          return;
        }

        addToast(result.message, "success");
        router.replace("/profile/password/set");
        return;
      }

      if (purpose === "password-reset") {
        if (result.data.redirect !== "/new-password") {
          addToast(UNEXPECTED_RESPONSE, "error");
          return;
        }

        addToast(result.message, "success");
        router.replace("/new-password");
        return;
      }

      const user = parseAuthUser(result.data.user);

      if (result.data.redirect !== "/" || !user) {
        addToast(UNEXPECTED_RESPONSE, "error");
        return;
      }

      setAuth({ user, admin: null, entityType: "user" });
      addToast(result.message, "success");

      router.replace("/");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleResend() {
    if (isPending || isResending) return;

    setIsResending(true);

    try {
      const result = await apiRequest("/api/auth/resend-otp");

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      addToast(result.message || UNEXPECTED_RESPONSE, "success");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-gray-300">
        Verification code sent to{" "}
        <span className="break-all font-medium text-white">{email}</span>. Check
        your inbox or spam folder.
      </p>

      <IconField
        icon={Password}
        inputClassName="tracking-wider"
        type="text"
        name="otp"
        placeholder="Enter 6-digit code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={OTP_LENGTH}
        required
        onInput={(event) => {
          event.currentTarget.value = event.currentTarget.value
            .replace(/\D/g, "")
            .slice(0, OTP_LENGTH);
        }}
      />

      <button
        type="submit"
        disabled={isPending || isResending}
        className={`mt-1 ${primaryButtonClass}`}
      >
        <span className="leading-none">
          {isPending ? "Verifying..." : "Verify OTP"}
        </span>
      </button>

      <button
        type="button"
        onClick={handleResend}
        disabled={isPending || isResending}
        className={secondaryButtonClass}
      >
        <Refresh size={16} stroke={1.5} />

        <span className="leading-none">
          {isResending ? "Resending..." : "Resend OTP"}
        </span>
      </button>

      <div className="mt-2 flex justify-center">
        {isPasswordUpdate ? (
          <a
            href="/api/auth/clear-cookie?scope=flow&next=%2Fprofile"
            className={linkClass}
          >
            Cancel
          </a>
        ) : (
          <RestartFlowLink>Try with a different credential</RestartFlowLink>
        )}
      </div>
    </form>
  );
}
