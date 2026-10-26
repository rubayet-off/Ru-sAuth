"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordField } from "@/app/component/FormFields";
import RestartFlowLink from "@/app/component/RestartFlowLink";
import {
  emailBoxClass,
  linkClass,
  primaryButtonClass,
} from "@/app/component/formStyles";
import {
  apiRequest,
  parseAuthUser,
  UNEXPECTED_RESPONSE,
} from "@/lib/clientApi";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

interface PasswordClientProps {
  email: string;
}

export default function PasswordClient({ email }: PasswordClientProps) {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const rawPassword = new FormData(event.currentTarget).get("password");

    if (typeof rawPassword !== "string" || !rawPassword) {
      addToast("Please enter your password.", "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/login", {
        body: { password: rawPassword },
      });

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      const { is_verified: isVerified, redirect } = result.data;

      if (isVerified === false && redirect === "/otp-verification") {
        addToast(result.message, "success");
        router.replace("/otp-verification");
        return;
      }

      const user = parseAuthUser(result.data.user);

      if (isVerified !== true || redirect !== "/" || !user) {
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className={emailBoxClass}>
        <span className="break-all text-sm text-white">{email}</span>

        <RestartFlowLink className={`shrink-0 ${linkClass}`}>
          Change
        </RestartFlowLink>
      </div>

      <p className="text-sm text-gray-300">Enter your password to log in.</p>

      <div className="flex flex-col gap-2">
        <PasswordField
          name="password"
          placeholder="Enter password"
          autoComplete="current-password"
          required
        />

        <Link
          href="/forgot-password"
          className={`mt-2 self-center ${linkClass}`}
        >
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={isPending} className={primaryButtonClass}>
        <span className="leading-none">
          {isPending ? "Authenticating..." : "Login"}
        </span>
      </button>

      <div className="mt-2 flex justify-center">
        <RestartFlowLink>Try with another credential</RestartFlowLink>
      </div>
    </form>
  );
}
