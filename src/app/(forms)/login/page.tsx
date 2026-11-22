import { Suspense } from "react";

import AuthCard from "@/app/component/AuthCard";

import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <AuthCard>
      <Suspense
        fallback={<div className="py-8 text-center text-sm">Loading...</div>}
      >
        <LoginClient />
      </Suspense>
    </AuthCard>
  );
}
