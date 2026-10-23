"use client";

import { Mail } from "@mynaui/icons-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { IconField } from "@/app/component/FormFields";
import GoogleButton from "@/app/component/GoogleButton";
import OrDivider from "@/app/component/OrDivider";
import { primaryButtonClass } from "@/app/component/formStyles";
import { apiRequest, UNEXPECTED_RESPONSE } from "@/lib/clientApi";
import { useOAuthError } from "@/lib/useOAuthError";
import { EMAIL_MAX_LENGTH } from "@/lib/validation";
import { useToastStore } from "@/toast/toastStore";

// ইমেইলের ফলাফল অনুযায়ী পরের ধাপের পথ
const NEXT_STEP = { credentials: "/password", new: "/proceed" } as const;

export default function EmailClient() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);

  const [isPending, setIsPending] = useState(false);

  // Google লগইন ব্যর্থ হলে টোস্ট দেখায়
  useOAuthError();

  // ফর্ম জমা: সার্ভারে ইমেইল যাচাই করে পরের ধাপে নেয়
  // রিডাইরেক্ট এখানেই হয়, state এর effect এ নয়, তাই পেজে ফিরে এলে আবার নিজে নিজে সরে যায় না
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) return;

    const rawEmail = new FormData(event.currentTarget).get("email");
    const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

    if (!email) {
      addToast("Email is required.", "error");
      return;
    }

    setIsPending(true);

    try {
      const result = await apiRequest("/api/auth/email", { body: { email } });

      if (!result.ok) {
        addToast(result.message || UNEXPECTED_RESPONSE, "error");
        return;
      }

      const { auth_type: authType, redirect } = result.data;

      // Google অ্যাকাউন্ট হলে শুধু বার্তা দেখানো হয়
      if (authType === "google") {
        addToast(result.message, "success");
        return;
      }

      if (authType !== "credentials" && authType !== "new") {
        addToast(UNEXPECTED_RESPONSE, "error");
        return;
      }

      // সার্ভারের দেওয়া পথ প্রত্যাশিত পথের সাথে না মিললে এগোনো হয় না
      const expectedPath = NEXT_STEP[authType];

      if (redirect !== expectedPath) {
        addToast(UNEXPECTED_RESPONSE, "error");
        return;
      }

      router.push(expectedPath);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-gray-300">Enter your email to continue.</p>

      {/* ইমেইল ইনপুট */}
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
        className={`mt-5 ${primaryButtonClass}`}
      >
        <span className="leading-none">
          {isPending ? "Checking email..." : "Continue"}
        </span>
      </button>

      <OrDivider />

      <GoogleButton disabled={isPending} />
    </form>
  );
}
