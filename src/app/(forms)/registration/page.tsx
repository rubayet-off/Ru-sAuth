import { Suspense } from "react";

import AuthCard from "@/app/component/AuthCard";

import RegistrationClient from "./RegistrationClient";

export default function RegistrationPage() {
  return (
    <AuthCard>
      <p className="text-sm text-gray-300">
        Create an account with your credentials.
      </p>

      <Suspense
        fallback={<div className="py-8 text-center text-sm">Loading...</div>}
      >
        <RegistrationClient />
      </Suspense>
    </AuthCard>
  );
}
