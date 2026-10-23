"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Calendar,
  Clock4,
  Logout,
  Trash,
  Eye,
  Camera,
  X,
  User,
  CogFour,
} from "@mynaui/icons-react";

import { broadcastAuth } from "@/lib/authChannel";
import { apiRequest } from "@/lib/clientApi";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

import Avatar from "./Avatar";
import ImageModal from "./ImageModal";
import { emailBoxClass } from "./formStyles";

interface ProfileOverviewProps {
  profile: {
    uid: string;
    sessionId: string;
    username: string;
    email: string;
    provider: "CREDENTIALS" | "GOOGLE";
    profileImageUrl: string | null;
    // পাসওয়ার্ড আছে কিনা; সার্ভার ডাটাবেস থেকে জানায়
    hasPassword: boolean;
    createdAt: string | null;
    lastLogin: string | null;
  };
}

// তারিখ ঢাকার সময় অনুযায়ী সাজিয়ে দেখায়; তারিখ না থাকলে "Not available"
function formatDate(value: string | null, includeTime = false): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Dhaka",
  }).format(date);
}

// প্রোফাইল কার্ড: ছবি, তথ্য, লগআউট ও অ্যাকাউন্ট মোছার অংশ
export default function ProfileOverview({ profile }: ProfileOverviewProps) {
  const router = useRouter();

  const addToast = useToastStore((state) => state.addToast);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // store এর তথ্য সব পেজ ও ট্যাবে একই থাকে; store খালি থাকলে (প্রথম রেন্ডারে) সার্ভারের তথ্য ব্যবহার হয়
  const storeUser = useAuthStore((state) => state.user);

  const [showPhoto, setShowPhoto] = useState(false);

  const profileImageUrl = storeUser
    ? storeUser.profile_photo_url
    : profile.profileImageUrl;
  const username = storeUser?.username ?? profile.username;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // পাসওয়ার্ড যোগ/বদলের ডায়ালগ
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isStartingPassword, setIsStartingPassword] = useState(false);

  // পাসওয়ার্ড থাকলে "Change", না থাকলে "Add"
  const passwordAction = profile.hasPassword ? "change" : "add";
  const passwordLabel = profile.hasPassword
    ? "Change Password"
    : "Add Password";

  // "Continue" চাপলে OTP পাঠিয়ে যাচাইয়ের পেজে যাওয়া
  async function handleContinuePassword() {
    if (isStartingPassword) return;

    setIsStartingPassword(true);

    const result = await apiRequest("/api/auth/password-otp", {
      body: { action: passwordAction },
    });

    if (!result.ok || result.data.redirect !== "/profile/password/verify") {
      addToast(
        result.message || "Could not send the verification code.",
        "error",
      );

      // পাসওয়ার্ডের অবস্থা বদলে থাকলে (অন্য ট্যাবে) ডায়ালগ বন্ধ করে তথ্য নতুন করে আনা হয়
      if (result.status === 409) {
        setShowPasswordDialog(false);
        router.refresh();
      }

      setIsStartingPassword(false);
      return;
    }

    addToast(result.message, "success");

    // OTP পাঠানো হয়ে গেছে: ডায়ালগ বন্ধ করে যাচাইয়ের পেজে যাওয়া হয়
    setShowPasswordDialog(false);
    setIsStartingPassword(false);

    router.push("/profile/password/verify");
  }

  // লগআউট করা ও ইমেইল পেজে ফেরা
  async function handleLogout() {
    if (isLoggingOut || isDeleting) return;

    setIsLoggingOut(true);

    const result = await apiRequest("/api/auth/logout");

    if (!result.ok || result.data.success !== true) {
      addToast(
        result.message || "Could not log out. Please try again.",
        "error",
      );
      setIsLoggingOut(false);
      return;
    }

    clearAuth();

    // অন্য সব ট্যাবকে সঙ্গে সঙ্গে লগআউট করানো হয়
    broadcastAuth({ type: "logout", reason: "logout" });

    addToast(result.message || "You have been logged out.", "success");

    router.replace("/email");
    router.refresh();
    setIsLoggingOut(false);
  }

  // "Yes" চাপলে অ্যাকাউন্ট মুছে ফেলা
  async function handleDeleteAccount() {
    if (isDeleting || isLoggingOut) return;

    setIsDeleting(true);

    const result = await apiRequest("/api/auth/delete-account", {
      body: { confirm: true },
    });

    if (!result.ok || result.data.success !== true) {
      addToast(
        result.message || "Could not delete your account. Please try again.",
        "error",
      );
      setIsDeleting(false);
      return;
    }

    setShowDeleteDialog(false);
    setShowPhoto(false);

    clearAuth();

    // অন্য সব ট্যাবকে সঙ্গে সঙ্গে জানানো হয় যে অ্যাকাউন্ট মুছে গেছে
    broadcastAuth({ type: "logout", reason: "deleted" });

    addToast(result.message || "Your account has been deleted.", "success");

    router.replace("/email");
    router.refresh();
    setIsDeleting(false);
  }

  return (
    <>
      {/* প্রোফাইলের মূল কার্ড */}
      <section className="relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-xl border border-[#2d2f36] bg-[#15161a9f] p-6 shadow-lg sm:p-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-3/4 -translate-x-1/2 rounded-full bg-[#3B82F6] opacity-10 blur-[80px]" />

        {/* প্রোফাইল ছবি */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <button
            type="button"
            aria-label={
              profileImageUrl ? "View profile image" : "Add profile image"
            }
            onClick={() => setShowPhoto(true)}
            className="group relative h-50 w-50 shrink-0 cursor-pointer overflow-hidden rounded-full border-4 border-[#1f2026] bg-[#1f2026] shadow-lg sm:h-60 sm:w-60 md:h-72 md:w-72"
          >
            <Avatar
              url={profileImageUrl}
              name={username}
              letterClassName="text-7xl text-[#60A5FA]"
              sizes="(max-width: 640px) 200px, (max-width: 768px) 240px, 288px"
              priority
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              {profileImageUrl ? (
                <Eye size={28} stroke={1.5} className="text-white" />
              ) : (
                <Camera size={28} stroke={1.5} className="text-white" />
              )}
              <span className="mt-1 text-xs font-medium text-white">
                {profileImageUrl ? "View" : "Add"}
              </span>
            </div>
          </button>
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

        {/* User Details Header - full width & left-aligned */}
        <div className="w-full border-b border-[#2d2f36] pb-4 text-center">
          <h2 className="text-lg leading-none font-semibold text-white">
            User Details
          </h2>
          <p className="mt-1.5 leading-none  text-sm text-[#787878]">
            Your account information.
          </p>
        </div>

        {/* User Details Grid - full width & left-aligned */}
        <div className="grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
          {/* Username */}
          <div className="flex min-w-0 items-stretch gap-3 rounded-lg border border-[#2d2f36] bg-[#0E0F12]/70 p-3.5 sm:p-4">
            <div className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-[#2d2f36] bg-[#17181C] px-3 text-[#3B82F6]">
              <User size={20} stroke={1.5} />
            </div>
            <div className="min-w-0 self-start">
              <p className="text-xs font-medium text-[#787878]">User Name</p>
              <p className="mt-1 wrap-break-word text-sm font-medium leading-5 text-[#EAEAEA]">
                {username}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex min-w-0 items-stretch gap-3 rounded-lg border border-[#2d2f36] bg-[#0E0F12]/70 p-3.5 sm:p-4">
            <div className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-[#2d2f36] bg-[#17181C] px-3 text-[#3B82F6]">
              <Mail size={20} stroke={1.5} />
            </div>
            <div className="min-w-0 self-start">
              <p className="text-xs font-medium text-[#787878]">
                Email Address
              </p>
              <p className="mt-1 break-all text-sm font-medium leading-5 text-[#EAEAEA]">
                {profile.email}
              </p>
            </div>
          </div>

          {/* Last login */}
          <div className="flex min-w-0 items-stretch gap-3 rounded-lg border border-[#2d2f36] bg-[#0E0F12]/70 p-3.5 sm:p-4">
            <div className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-[#2d2f36] bg-[#17181C] px-3 text-[#3B82F6]">
              <Clock4 size={20} stroke={1.5} />
            </div>
            <div className="min-w-0 self-center">
              <p className="text-xs font-medium text-[#787878]">Last Login</p>
              <p className="mt-1 wrap-break-word text-sm font-medium leading-5 text-[#EAEAEA]">
                {formatDate(profile.lastLogin, true)}
              </p>
            </div>
          </div>

          {/* Account creation */}
          <div className="flex min-w-0 items-stretch gap-3 rounded-lg border border-[#2d2f36] bg-[#0E0F12]/70 p-3.5 sm:p-4">
            <div className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-[#2d2f36] bg-[#17181C] px-3 text-[#3B82F6]">
              <Calendar size={20} stroke={1.5} />
            </div>
            <div className="min-w-0 self-center">
              <p className="text-xs font-medium text-[#787878]">
                Account Created
              </p>
              <p className="mt-1 wrap-break-word text-sm font-medium leading-5 text-[#EAEAEA]">
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* লগআউট ও অ্যাকাউন্ট মোছার বাটন */}
        <div className="relative z-10 mt-2 flex w-full flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isLoggingOut || isDeleting}
            onClick={handleLogout}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#2d2f36] bg-[#0E0F12] py-3 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5"
          >
            <Logout size={20} stroke={1.5} />
            <span className="leading-none">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </span>
          </button>
          <button
            type="button"
            disabled={isLoggingOut || isDeleting}
            onClick={() => setShowDeleteDialog(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-medium text-rose-400 transition-colors hover:border-rose-500/60 hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5"
          >
            <Trash size={20} stroke={1.5} />
            <span className="leading-none">Delete Account</span>
          </button>
        </div>

        {/* পাসওয়ার্ড আছে হলে "Change Password", না থাকলে "Add Password" */}
        <button
          type="button"
          disabled={isLoggingOut || isDeleting}
          onClick={() => setShowPasswordDialog(true)}
          className="mt-2 flex cursor-pointer items-center justify-center gap-2 text-[#3B82F6] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CogFour size={20} />
          <p className="leading-none mb-px">{passwordLabel}</p>
        </button>
      </section>

      {/* ImageModal সেকশনের বাইরে রাখা হয়েছে, নইলে overflow-hidden এ কেটে যায় */}
      {showPhoto && (
        <ImageModal
          imageSrc={profileImageUrl}
          username={username}
          onClose={() => setShowPhoto(false)}
        />
      )}

      {/* পাসওয়ার্ড যোগ/বদলের আগে OTP পাঠানোর নিশ্চিতকরণ ডায়ালগ */}
      {showPasswordDialog && (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isStartingPassword) {
              setShowPasswordDialog(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="password-dialog-title"
            className="w-full max-w-sm rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="password-dialog-title"
                className="text-lg font-semibold text-white"
              >
                {passwordLabel}
              </h2>

              <button
                type="button"
                disabled={isStartingPassword}
                onClick={() => setShowPasswordDialog(false)}
                aria-label="Close confirmation"
                className="shrink-0 cursor-pointer text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={20} stroke={1.5} />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              We will send an OTP to your email{" "}
              <span className="whitespace-nowrap font-semibold text-white">
                "{profile.email}"
              </span>{" "}
              to verify that it&apos;s you.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={isStartingPassword}
                onClick={handleContinuePassword}
                className="w-full cursor-pointer rounded-lg border border-[#3B82F6] bg-[#3B82F6] px-4 py-2.5 text-sm text-white transition-colors hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStartingPassword ? "Sending..." : "Continue"}
              </button>

              <button
                type="button"
                disabled={isStartingPassword}
                onClick={() => setShowPasswordDialog(false)}
                className="w-full cursor-pointer rounded-lg border border-[#2d2f36] bg-[#0E0F12] px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* অ্যাকাউন্ট মোছার Yes / No নিশ্চিতকরণ ডায়ালগ */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setShowDeleteDialog(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-sm rounded-xl border border-[#2d2f36] bg-[#15161A] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="delete-account-title"
                className="text-lg font-semibold text-white"
              >
                Delete Account
              </h2>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteDialog(false)}
                aria-label="Close confirmation"
                className="cursor-pointer text-gray-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={20} stroke={1.5} />
              </button>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              Are you sure you want to delete this account?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteDialog(false)}
                className="min-w-20 cursor-pointer rounded-lg border border-[#2d2f36] bg-[#0E0F12] px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                No
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="flex min-w-20 cursor-pointer items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-400 transition-colors hover:border-rose-500/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
