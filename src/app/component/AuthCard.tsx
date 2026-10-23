import type { ReactNode } from "react";

import Logo from "./Logo";

// সব ফর্ম পেজের একই বাইরের কার্ড (লোগোসহ)
export default function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh w-full justify-center p-4">
      <div className="mt-12 flex h-fit w-full max-w-md flex-col gap-4 rounded-xl bg-[#15161A] p-6">
        <Logo />

        {children}
      </div>
    </main>
  );
}

// Suspense চলাকালীন দেখানো "Loading..." কার্ড
export function AuthCardFallback() {
  return (
    <AuthCard>
      <p className="text-sm text-gray-300">Loading...</p>
    </AuthCard>
  );
}
