"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordField } from "@/app/component/FormFields";
import { primaryButtonClass } from "@/app/component/formStyles";
import { apiRequest, UNEXPECTED_RESPONSE } from "@/lib/clientApi";
import { PASSWORD_MIN_LENGTH, getPasswordError } from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

export default function NewClient() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [isPending, setIsPending] = useState(false);

  // নতুন পাসওয়ার্ড জমা
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !newPassword ||
      !confirmPassword
    ) {
      addToast("Both password fields are required.", "error");
      return;
    }

    const passwordError = getPasswordError(newPassword);

    if (passwordError) {
      addToast(passwordError, "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast("The passwords do not match.", "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/new-password", {
        body: { newPassword, confirmPassword },
      });

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      if (result.data.redirect !== "/email") {
        addToast(UNEXPECTED_RESPONSE, "error");
        return;
      }

      // সব সেশন বাতিল হয়েছে, তাই ক্লায়েন্টের তথ্যও মুছে ইমেইল পেজে পাঠানো হয়
      clearAuth();
      addToast(result.message, "success");

      router.replace("/email");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-300">Enter your new password here.</p>

      <div className="flex flex-col gap-4">
        {/* নতুন পাসওয়ার্ড */}
        <PasswordField
          name="newPassword"
          placeholder="Enter new password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          showLabel="Show new password"
          hideLabel="Hide new password"
          required
        />

        {/* পাসওয়ার্ড নিশ্চিত করা */}
        <PasswordField
          name="confirmPassword"
          placeholder="Confirm new password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          showLabel="Show confirmation password"
          hideLabel="Hide confirmation password"
          required
        />
      </div>

      <button type="submit" disabled={isPending} className={`mt-2 ${primaryButtonClass}`}>
        <span className="leading-none">
          {isPending ? "Changing password..." : "Change password"}
        </span>
      </button>

      <p className="mt-1 text-center text-xs leading-relaxed text-gray-400">
        Note: You will be logged out from all active sessions after changing your
        password.
      </p>
    </form>
  );
}
