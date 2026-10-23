"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon, Logout, Eye, Camera } from "@mynaui/icons-react";

import { broadcastAuth } from "@/lib/authChannel";
import { apiRequest } from "@/lib/clientApi";
import { useAuthStore } from "@/zustand/authStore";

import Avatar from "./Avatar";
import ImageModal from "./ImageModal";

interface HomeClientProps {
  authenticated: boolean;
  username: string | null;
  initialProfileImageUrl: string | null;
}

// হোম পেজের মূল অংশ: অতিথি ও লগইন করা ব্যবহারকারী, দুই অবস্থাই এখানে দেখানো হয়
export default function HomeClient({
  authenticated,
  username,
  initialProfileImageUrl,
}: HomeClientProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // store এর তথ্য সব পেজ ও ট্যাবে একই থাকে; store খালি থাকলে (প্রথম রেন্ডারে) সার্ভারের তথ্য ব্যবহার হয়
  const storeUser = useAuthStore((state) => state.user);

  const [showPhoto, setShowPhoto] = useState(false);

  const profileImageUrl = storeUser
    ? storeUser.profile_photo_url
    : initialProfileImageUrl;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // নাম না থাকলে "User" এবং ছবি না থাকলে নামের প্রথম অক্ষর দেখানো হয়
  const displayName = (storeUser?.username ?? username)?.trim() || "User";

  // লগআউট: সার্ভারে সেশন বাতিল করে ক্লায়েন্টের তথ্য মুছে হোমে ফেরা
  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError(null);

    const result = await apiRequest("/api/auth/logout");

    if (!result.ok || result.data.success !== true) {
      setLogoutError(result.message || "Unable to log out. Please try again.");
      setIsLoggingOut(false);
      return;
    }

    clearAuth();
    setShowPhoto(false);
    setIsLoggingOut(false);

    // অন্য সব ট্যাবকে সঙ্গে সঙ্গে লগআউট করানো হয়
    broadcastAuth({ type: "logout", reason: "logout" });

    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <div className="relative flex w-full max-w-2xl flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#15161a9e] p-3 text-center shadow-xl sm:p-6 md:gap-6 md:p-8">
        {/* হালকা নীল আভা */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-3/4 -translate-x-1/2 rounded-full bg-[#3B82F6] opacity-10 blur-[80px]" />

        {/* স্বাগত বার্তা */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
            Welcome to{" "}
            <span className="text-[#3B82F6]">
              Ru&apos;s<span className="text-white">Auth</span>
            </span>
          </div>

          <p className="text-sm text-gray-300 sm:text-base">
            A secured authentication system.
          </p>
        </div>

        {authenticated ? (
          <>
            {/* লগইন করা ব্যবহারকারী */}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="flex flex-col items-center gap-2.5">
                {/* প্রোফাইল ছবি বা নামের প্রথম অক্ষর */}
                <button
                  type="button"
                  aria-label={
                    profileImageUrl ? "View profile image" : "Add profile image"
                  }
                  onClick={() => setShowPhoto(true)}
                  className="group relative flex h-40 w-40 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-[#1f2026] bg-[#17181C] shadow-lg sm:h-50 sm:w-50 md:h-60 md:w-60"
                >
                  <Avatar
                    url={profileImageUrl}
                    name={displayName}
                    letterClassName="text-6xl text-[#60A5FA] sm:text-7xl"
                    sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 240px"
                    priority
                  />

                  {/* হোভার করলে দেখানো আবরণ */}
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                    {profileImageUrl ? (
                      <Eye size={24} stroke={1.5} className="text-white" />
                    ) : (
                      <Camera size={24} stroke={1.5} className="text-white" />
                    )}

                    <span className="mt-1 text-xs font-medium text-white">
                      {profileImageUrl ? "View" : "Add"}
                    </span>
                  </span>
                </button>

                {/* ছবি দেখা বা যোগ করার বাটন */}
                <button
                  type="button"
                  onClick={() => setShowPhoto(true)}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#2d2f36] bg-[#0E0F12] px-5 py-2.5 text-xs font-medium text-gray-300 transition-colors hover:border-[#3B82F6] hover:text-[#3B82F6]"
                >
                  {profileImageUrl ? (
                    <Eye size={18} stroke={1.5} />
                  ) : (
                    <Camera size={18} stroke={1.5} />
                  )}

                  <span className="mt-px leading-none">
                    {profileImageUrl ? "View Image" : "Add Image"}
                  </span>
                </button>
              </div>

              {/* ফিরে আসার বার্তা */}
              <div className="mt-2 flex flex-col gap-3">
                <p className="text-sm leading-none text-gray-300 sm:text-base">
                  Welcome back,
                </p>

                <p className="text-xl font-semibold leading-none text-white sm:text-2xl">
                  {displayName}
                </p>
              </div>
            </div>

            {/* প্রোফাইল ও লগআউট বাটন */}
            <div className="relative z-10 flex w-full flex-col gap-3 sm:flex-row">
              <Link
                href="/profile"
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#3B82F6]/50 bg-[#3B82F6]/10 py-3 text-sm font-medium text-white transition-colors hover:bg-transparent sm:py-3.5"
              >
                <UserIcon size={20} stroke={1.5} />
                <span className="leading-none">Profile</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-medium text-rose-400 transition-colors hover:border-rose-500/60 hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5"
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
          /* অতিথির জন্য লগইন বাটন */
          <Link
            href="/email"
            className="group relative z-10 mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#3B82F6]/50 bg-[#3B82F6]/10 py-3.5 text-base font-medium text-white transition-colors hover:bg-transparent hover:text-white sm:w-2/3"
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
