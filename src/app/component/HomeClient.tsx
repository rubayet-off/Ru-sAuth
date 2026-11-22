"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon, Logout, Eye, Camera } from "@mynaui/icons-react";

import { broadcastAuth } from "@/lib/authChannel";
import { apiRequest } from "@/lib/clientApi";
import { clearAccessExpiry } from "@/lib/sessionRefresh";
import { useAuthStore } from "@/zustand/authStore";

import Avatar from "./Avatar";
import ImageModal from "./ImageModal";

interface HomeClientProps {
  authenticated: boolean;
  username: string | null;
  initialProfileImageUrl: string | null;
}

export default function HomeClient({
  authenticated,
  username,
  initialProfileImageUrl,
}: HomeClientProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const storeUser = useAuthStore((state) => state.user);
  const [showPhoto, setShowPhoto] = useState(false);

  const profileImageUrl = storeUser
    ? storeUser.profile_photo_url
    : initialProfileImageUrl;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const displayName = (storeUser?.username ?? username)?.trim() || "User";

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError(null);
    useAuthStore.getState().setSigningOut(true);

    const result = await apiRequest("/api/auth/logout");

    if (!result.ok || result.data.success !== true) {
      useAuthStore.getState().setSigningOut(false);

      setLogoutError(result.message || "Unable to log out. Please try again.");
      setIsLoggingOut(false);
      return;
    }

    clearAuth();
    clearAccessExpiry();
    setShowPhoto(false);
    setIsLoggingOut(false);
    broadcastAuth({ type: "logout", reason: "logout" });

    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <div className="relative flex w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden text-center md:gap-6">
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            Welcome to{" "}
            <span className="text-[#0567E3]">
              Ru&apos;s<span className="text-[#FBFDFC]">Auth</span>
            </span>
          </div>

          <p className="text-sm text-[#A7B8C2] sm:text-base">
            A secured authentication system.
          </p>
        </div>

        {authenticated ? (
          <>
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  aria-label={
                    profileImageUrl ? "View profile image" : "Add profile image"
                  }
                  onClick={() => setShowPhoto(true)}
                  className="group relative flex h-40 w-40 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-[#1f2026] bg-[##11111B] shadow-lg sm:h-50 sm:w-50 md:h-60 md:w-60"
                >
                  <Avatar
                    url={profileImageUrl}
                    name={displayName}
                    letterClassName="text-8xl text-[#0567E3] sm:text-9xl"
                    sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 240px"
                    priority
                  />
                  <span
                    className={`absolute inset-0 flex flex-col items-center justify-center
    ${profileImageUrl ? "bg-[#11111B]/60" : "bg-[#11111B]"}
    opacity-0 transition-opacity duration-300
    group-hover:opacity-100 group-focus-visible:opacity-100`}
                  >
                    {" "}
                    {profileImageUrl ? (
                      <Eye size={30} stroke={1.5} className="text-white" />
                    ) : (
                      <Camera size={30} stroke={1.5} className="text-white" />
                    )}
                    <span className="mt-1 text-lg font-medium text-white">
                      {profileImageUrl ? "View Image" : "Add Image"}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPhoto(true)}
                  className="flex cursor-pointer items-center justify-center gap-1.5 border-2 border-[#2d2f36] bg-[#0E0F12] px-5 py-2.5 text-xs font-medium transition-colors hover:border-[#0567E3] hover:text-[#0567E3]"
                >
                  {profileImageUrl ? (
                    <Eye size={18} stroke={2} />
                  ) : (
                    <Camera size={18} stroke={2} />
                  )}

                  <span className="mt-px leading-none">
                    {profileImageUrl ? "View Image" : "Add Image"}
                  </span>
                </button>
              </div>

              <div className="mt-2 flex flex-col gap-3">
                <p className="text-sm leading-none text-gray-300 sm:text-base">
                  Welcome back,
                </p>

                <p className="text-xl font-semibold leading-none text-white sm:text-2xl">
                  {displayName}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex w-full flex-col gap-3 sm:flex-row">
              <Link
                href="/profile"
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 border border-[#0567E3] bg-[#0567E3]/20 py-3 text-sm font-medium transition-colors hover:bg-transparent sm:py-3.5"
              >
                <UserIcon size={20} stroke={1.5} />
                <span className="leading-none">Profile</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 border border-[#691919] bg-[#691919]/20 py-3 text-sm font-medium transition-colors hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5"
              >
                <Logout size={20} stroke={1.5} />
                <span className="leading-none">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </span>
              </button>
            </div>

            {logoutError && (
              <p role="alert" className="relative z-10 text-xs text-rose-400">
                {logoutError}
              </p>
            )}
          </>
        ) : (
          <Link
            href="/login"
            className="group relative z-10 mt-3 flex w-full cursor-pointer items-center justify-center gap-2 border border-[#0567E3] bg-[#0567E3]/20 hover:bg-transparent py-3.5 text-base font-medium transition-colors sm:w-2/3"
          >
            <UserIcon size={22} stroke={1.5} />
            <span className="leading-none">Login | Signup</span>
          </Link>
        )}
      </div>

      {authenticated && showPhoto && (
        <ImageModal
          imageSrc={profileImageUrl}
          username={displayName}
          onClose={() => setShowPhoto(false)}
        />
      )}
    </>
  );
}
