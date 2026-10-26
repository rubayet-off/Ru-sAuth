"use client";

import { Mail } from "@mynaui/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { IconField } from "@/app/component/FormFields";
import { linkClass, primaryButtonClass } from "@/app/component/formStyles";
import { apiRequest, UNEXPECTED_RESPONSE } from "@/lib/clientApi";
import { EMAIL_MAX_LENGTH } from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";

export default function ForgotClient() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);

  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const rawEmail = new FormData(event.currentTarget).get("email");
    const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

    if (!email) {
      addToast("Please enter your email address.", "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/forgot-password", {
        body: { email },
      });

      if (!result.ok || result.data.redirect !== "/otp-verification") {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      addToast(result.message, "success");
      router.replace("/otp-verification");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-white">
          No worries, reset your password.
        </p>

        <p className="text-sm text-gray-300">
          Enter your email to receive a password reset code.
        </p>
      </div>

      <IconField
        icon={Mail}
        type="email"
        name="email"
        placeholder="Enter email"
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
        required
      />

      <button
        type="submit"
        disabled={isPending}
        className={`mt-2 ${primaryButtonClass}`}
      >
        <span className="leading-none">
          {isPending ? "Sending OTP..." : "Send OTP"}
        </span>
      </button>

      <div className="mt-2 flex justify-center">
        <Link href="/password" className={linkClass}>
          Login with password
        </Link>
      </div>
    </form>
  );
}
