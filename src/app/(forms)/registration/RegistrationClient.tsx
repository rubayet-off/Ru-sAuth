"use client";

import { User } from "@mynaui/icons-react";
import { useRouter } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { IconField, PasswordField } from "@/app/component/FormFields";
import GoogleButton from "@/app/component/GoogleButton";
import OrDivider from "@/app/component/OrDivider";
import RestartFlowLink from "@/app/component/RestartFlowLink";
import { emailBoxClass, linkClass, primaryButtonClass } from "@/app/component/formStyles";
import { apiRequest, UNEXPECTED_RESPONSE } from "@/lib/clientApi";
import { useOAuthError } from "@/lib/useOAuthError";
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  getPasswordError,
  getUsernameError,
} from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";

interface RegistrationClientProps {
  email: string;
}

// useSearchParams ব্যবহারের জন্য আলাদা কম্পোনেন্ট, যাতে Suspense এর ভেতরে থাকে
function OAuthErrorWatcher() {
  useOAuthError();

  return null;
}

export default function RegistrationClient({ email }: RegistrationClientProps) {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);

  const [isPending, setIsPending] = useState(false);

  // রেজিস্ট্রেশন ফর্ম জমা
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    const rawUsername = formData.get("username");
    const rawPassword = formData.get("password");

    const username = typeof rawUsername === "string" ? rawUsername.trim() : "";
    const password = typeof rawPassword === "string" ? rawPassword : "";

    if (!username || !password) {
      addToast("Username and password are required.", "error");
      return;
    }

    // সার্ভারে পাঠানোর আগেই একই নিয়মে যাচাই
    const inputError = getUsernameError(username) ?? getPasswordError(password);

    if (inputError) {
      addToast(inputError, "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/registration", {
        body: { username, password },
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
      <Suspense fallback={null}>
        <OAuthErrorWatcher />
      </Suspense>

      {/* নির্বাচিত ইমেইল ও পরিবর্তনের লিংক */}
      <div className={emailBoxClass}>
        <span className="break-all text-sm text-white">{email}</span>

        <RestartFlowLink className={`shrink-0 ${linkClass}`}>Change</RestartFlowLink>
      </div>

      <p className="text-sm text-gray-300">Enter your information to register.</p>

      {/* ইউজারনেম */}
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

      {/* পাসওয়ার্ড */}
      <PasswordField
        name="password"
        placeholder="Enter password (minimum 8 characters)"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        maxLength={PASSWORD_MAX_BYTES}
        required
      />

      <button type="submit" disabled={isPending} className={`mt-2 ${primaryButtonClass}`}>
        <span className="leading-none">
          {isPending ? "Creating account..." : "Create account"}
        </span>
      </button>

      <OrDivider className="mt-2" />

      <GoogleButton disabled={isPending} />

      <div className="mt-2 flex justify-center">
        <RestartFlowLink>Try with a different email</RestartFlowLink>
      </div>
    </form>
  );
}
