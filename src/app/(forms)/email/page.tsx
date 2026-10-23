import { Suspense } from "react";

import AuthCard from "@/app/component/AuthCard";

import EmailClient from "./EmailClient";

// প্রথম ধাপ: ইমেইল দিয়ে শুরু; এই পেজে কোনো টোকেন বাধা দেয় না
export default function EmailPage() {
  return (
    <AuthCard>
      <Suspense
        fallback={
          <div className="py-8 text-center text-sm text-gray-300">Loading...</div>
        }
      >
        <EmailClient />
      </Suspense>
    </AuthCard>
  );
}
