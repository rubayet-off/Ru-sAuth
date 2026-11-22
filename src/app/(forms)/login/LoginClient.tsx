"use client";

import { Mail } from "@mynaui/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { IconField, PasswordField } from "@/app/component/FormFields";
import GoogleButton from "@/app/component/GoogleButton";
import OrDivider from "@/app/component/OrDivider";
import { linkClass, primaryButtonClass } from "@/app/component/formStyles";
import {
  apiRequest,
  parseAuthUser,
  UNEXPECTED_RESPONSE,
} from "@/lib/clientApi";
import { writeAccessExpiry } from "@/lib/sessionRefresh";
import { useOAuthError } from "@/lib/useOAuthError";
import { EMAIL_MAX_LENGTH, isValidEmail, normalizeEmail } from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

export default function LoginClient() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isPending, setIsPending] = useState(false);

  useOAuthError();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    const rawEmail = formData.get("email");
    const rawPassword = formData.get("password");

    const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";

    if (!email || !password) {
      addToast("Please enter your email and password.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      addToast("Please enter a valid email address.", "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/login", {
        body: { email, password },
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

      writeAccessExpiry(Number(result.data.accessExpiresAt));
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
      <p className="text-sm text-[#A7B8C2]">
        Enter your email and password to log in.
      </p>

      <div className="flex flex-col gap-4">
        <IconField
          icon={Mail}
          type="email"
          name="email"
          placeholder="Enter email"
          autoComplete="email"
          maxLength={EMAIL_MAX_LENGTH}
          required
        />

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
      </div>

      <button type="submit" disabled={isPending} className={primaryButtonClass}>
        <span className="leading-none">
          {isPending ? "Authenticating..." : "Login"}
        </span>
      </button>

      <OrDivider />

      <GoogleButton disabled={isPending} />

      <p className="mt-2 text-center text-sm text-[#A7B8C2]">
        Don&apos;t have an account?{" "}
        <Link href="/registration" className={linkClass}>
          Sign up
        </Link>
      </p>
    </form>
  );
}
