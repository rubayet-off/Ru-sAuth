import { Suspense } from "react";
import { redirect } from "next/navigation";

import { authMe } from "@/lib/authMe";
import AuthStoreSetup from "@/zustand/authSetup";

import HomeClient from "./component/HomeClient";
import Navbar from "./component/Navbar";

export default function Homepage() {
  return (
    <Suspense fallback={null}>
      <AuthenticatedHomepage />
    </Suspense>
  );
}

async function AuthenticatedHomepage() {
  const { user, admin, entityType, clearCookies } = await authMe();

  if (clearCookies) {
    redirect("/api/auth/clear-cookie");
  }

  if (entityType === "admin" && admin) {
    redirect("/admin/dashboard");
  }

  const authenticated = entityType === "user" && !!user;

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden">
      <AuthStoreSetup user={user} admin={admin} entityType={entityType} />

      <div className="w-full shrink-0">
        <Navbar />
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6 lg:p-8">
        <HomeClient
          authenticated={authenticated}
          username={authenticated ? user.username : null}
          initialProfileImageUrl={
            authenticated ? (user.profile_photo_url ?? null) : null
          }
        />
      </div>
    </main>
  );
}
