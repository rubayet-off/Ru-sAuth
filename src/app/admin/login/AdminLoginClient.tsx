"use client";

import { Mail } from "@mynaui/icons-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { IconField, PasswordField } from "@/app/component/FormFields";
import { primaryButtonClass } from "@/app/component/formStyles";
import { apiRequest, UNEXPECTED_RESPONSE } from "@/lib/clientApi";
import { isValidEmail, normalizeEmail } from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore, type Admin } from "@/zustand/authStore";

// সার্ভারের পাঠানো admin অবজেক্ট যাচাই করে Admin টাইপে বদলায়; ভুল হলে null
function parseAdmin(value: unknown): Admin | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Record<string, unknown>;

  if (
    typeof raw.sessionId !== "string" ||
    typeof raw.username !== "string" ||
    typeof raw.email !== "string"
  ) {
    return null;
  }

  return { sessionId: raw.sessionId, username: raw.username, email: raw.email };
}

export default function AdminLoginClient() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isPending, setIsPending] = useState(false);

  // অ্যাডমিন লগইন ফর্ম জমা
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    const rawEmail = formData.get("email");
    const password = formData.get("password");

    if (typeof rawEmail !== "string" || typeof password !== "string") {
      addToast("Please enter your email and password.", "error");
      return;
    }

    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email)) {
      addToast("Please enter a valid email address.", "error");
      return;
    }

    if (!password) {
      addToast("Please enter your password.", "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/admin/login", {
        body: { email, password },
      });

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      const admin = parseAdmin(result.data.admin);

      if (result.data.redirect !== "/admin/dashboard" || !admin) {
        addToast(UNEXPECTED_RESPONSE, "error");
        return;
      }

      // লগইন সফল: store এ তথ্য রেখে ড্যাশবোর্ডে নেওয়া হয়
      setAuth({ user: null, admin, entityType: "admin" });
      addToast(result.message, "success");

      router.replace("/admin/dashboard");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-300">Enter your admin credentials to log in.</p>

      <div className="flex flex-col gap-4">
        <IconField
          icon={Mail}
          type="email"
          name="email"
          placeholder="Enter admin email"
          autoComplete="username"
          maxLength={254}
          required
        />

        <PasswordField
          name="password"
          placeholder="Enter password"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" disabled={isPending} className={`mt-2 ${primaryButtonClass}`}>
        <span className="leading-none">{isPending ? "Authenticating..." : "Login"}</span>
      </button>
    </form>
  );
}
