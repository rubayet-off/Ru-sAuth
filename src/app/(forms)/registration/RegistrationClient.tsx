"use client";

import { Mail, User } from "@mynaui/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { IconField, PasswordField } from "@/app/component/FormFields";
import GoogleButton from "@/app/component/GoogleButton";
import OrDivider from "@/app/component/OrDivider";
import { linkClass, primaryButtonClass } from "@/app/component/formStyles";
import { apiRequest, UNEXPECTED_RESPONSE } from "@/lib/clientApi";
import { useOAuthError } from "@/lib/useOAuthError";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  getPasswordError,
  getUsernameError,
  isValidEmail,
  normalizeEmail,
} from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";

export default function RegistrationClient() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);

  const [isPending, setIsPending] = useState(false);

  useOAuthError();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    const rawUsername = formData.get("username");
    const rawEmail = formData.get("email");
    const rawPassword = formData.get("password");

    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
    const email = typeof rawEmail === "string" ? normalizeEmail(rawEmail) : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";

    if (!username || !email || !password) {
      addToast("Username, email and password are required.", "error");
      return;
    }

    const usernameError = getUsernameError(username);

    if (usernameError) {
      addToast(usernameError, "error");
      return;
    }

    if (!isValidEmail(email)) {
      addToast("Please enter a valid email address.", "error");
      return;
    }

    const passwordError = getPasswordError(password);

    if (passwordError) {
      addToast(passwordError, "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/registration", {
        body: { username, email, password },
      });

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      if (result.data.redirect !== "/otp-verification") {
        addToast(UNEXPECTED_RESPONSE, "error");
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
      <p className="text-sm text-gray-300">
        Enter your information to register.
      </p>

      <IconField
        icon={User}
        type="text"
        name="username"
        placeholder="Enter username"
        autoComplete="username"
        minLength={USERNAME_MIN_LENGTH}
        maxLength={USERNAME_MAX_LENGTH}
        required
      />

      <IconField
        icon={Mail}
        type="email"
        name="email"
        placeholder="Enter email"
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
        required
      />

      <PasswordField
        name="password"
        placeholder="Enter password (minimum 8 characters)"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_BYTES}
        required
      />

      <button
        type="submit"
        disabled={isPending}
        className={`mt-2 ${primaryButtonClass}`}
      >
        <span className="leading-none">
          {isPending ? "Creating account..." : "Sign up"}
        </span>
      </button>

      <OrDivider className="mt-2" />

      <GoogleButton disabled={isPending} />

      <p className="mt-2 text-center text-sm text-[#A7B8C2]">
        Already have an account?{" "}
        <Link href="/login" className={linkClass}>
          Login
        </Link>
      </p>
    </form>
  );
}
