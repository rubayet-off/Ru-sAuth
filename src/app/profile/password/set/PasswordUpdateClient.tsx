"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PasswordField } from "@/app/component/FormFields";
import { linkClass, primaryButtonClass } from "@/app/component/formStyles";
import { apiRequest, UNEXPECTED_RESPONSE } from "@/lib/clientApi";
import { PASSWORD_MIN_LENGTH, getPasswordError } from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";

interface PasswordUpdateClientProps {
  mode: "add" | "change";
}

export default function PasswordUpdateClient({
  mode,
}: PasswordUpdateClientProps) {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const [isPending, setIsPending] = useState(false);
  const isAdd = mode === "add";

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
      const result = await apiRequest("/api/auth/password", {
        body: { newPassword, confirmPassword },
      });

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");

        if (result.status === 401 || result.status === 409) {
          router.replace("/profile");
          router.refresh();
        }

        return;
      }

      if (result.data.redirect !== "/profile") {
        addToast(UNEXPECTED_RESPONSE, "error");
        return;
      }

      addToast(result.message, "success");

      router.replace("/profile");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <PasswordField
          name="newPassword"
          placeholder={isAdd ? "Add a new password" : "Set a new password"}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          showLabel="Show new password"
          hideLabel="Hide new password"
          required
        />

        <PasswordField
          name="confirmPassword"
          placeholder="Confirm your new password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          showLabel="Show confirmation password"
          hideLabel="Hide confirmation password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-2 ${primaryButtonClass}`}
      >
        <span className="leading-none">
          {isPending
            ? isAdd
              ? "Adding password..."
              : "Changing password..."
            : isAdd
              ? "Add password"
              : "Change password"}
        </span>
      </button>

      <div className="mt-2 flex justify-center">
        <a
          href="/api/auth/clear-cookie?scope=flow&next=%2Fprofile"
          className={linkClass}
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
