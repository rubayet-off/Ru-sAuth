import { Suspense } from "react";
import { redirect } from "next/navigation";

import pool from "@/database/pool";
import { authMe } from "@/lib/authMe";
import AuthStoreSetup from "@/zustand/authSetup";

import Navbar from "../component/Navbar";
import ProfileOverview from "../component/ProfileOverview";
import SessionHistory from "../component/SessionHistory";

interface ProfileRow {
  uid: string;
  username: string;
  email: string;
  provider: "CREDENTIALS" | "GOOGLE";
  profile_image_public_url: string | null;
  has_password: boolean;
  created_at: Date | string;
  last_login: Date | string | null;
}

function toISOStringOrNull(value: Date | string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function Profile() {
  return (
    <Suspense
      fallback={
        <main className="flex h-dvh w-full items-center justify-center bg-[#0E0F12]">
          <p className="text-sm text-gray-300">Loading profile...</p>
        </main>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const { user, admin, entityType, clearCookies } = await authMe();

  if (clearCookies) {
    redirect("/api/auth/clear-cookie");
  }
  if (entityType === "admin" && admin) {
    redirect("/admin/dashboard");
  }
  if (entityType !== "user" || !user) {
    redirect("/email");
  }

  const result = await pool.query<ProfileRow>(
    `
      SELECT
        uid,
        username,
        email,
        provider,
        profile_image_public_url,
        (password_hash IS NOT NULL) AS has_password,
        created_at,
        last_login
      FROM users
      WHERE uid = $1
        AND is_verified = TRUE
        AND is_account_deleted = FALSE
      LIMIT 1
    `,
    [user.uid],
  );

  const row = result.rows[0];

  if (!row) {
    redirect("/email");
  }

  const profile = {
    uid: row.uid,
    sessionId: user.sessionId,
    username: row.username,
    email: row.email,
    provider: row.provider,
    profileImageUrl: row.profile_image_public_url,
    hasPassword: row.has_password,
    createdAt: toISOStringOrNull(row.created_at),
    lastLogin: toISOStringOrNull(row.last_login),
  };

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#0E0F12]">
      <AuthStoreSetup user={user} admin={admin} entityType={entityType} />

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden">
        <Navbar />

        <div className="hide-scrollbar flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="flex w-full max-w-2xl flex-col gap-6 pb-12">
            <ProfileOverview profile={profile} />
            <SessionHistory />
          </div>
        </div>
      </div>
    </main>
  );
}
