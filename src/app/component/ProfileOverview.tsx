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

interface ProfileOverviewProps {
  profile: {
    uid: string;
    sessionId: string;
    username: string;
    email: string;
    provider: "CREDENTIALS" | "GOOGLE";
    profileImageUrl: string | null;
    hasPassword: boolean;
    createdAt: string | null;
    lastLogin: string | null;
  };
}

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

export default function ProfileOverview({ profile }: ProfileOverviewProps) {
  const router = useRouter();

  const addToast = useToastStore((state) => state.addToast);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const storeUser = useAuthStore((state) => state.user);
  const [showPhoto, setShowPhoto] = useState(false);

  const profileImageUrl = storeUser
    ? storeUser.profile_photo_url
    : profile.profileImageUrl;
  const username = storeUser?.username ?? profile.username;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isStartingPassword, setIsStartingPassword] = useState(false);

  const passwordAction = profile.hasPassword ? "change" : "add";
  const passwordLabel = profile.hasPassword
    ? "Change Password"
    : "Add Password";

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

      if (result.status === 409) {
        setShowPasswordDialog(false);
        router.refresh();
      }

      setIsStartingPassword(false);
      return;
    }

    addToast(result.message, "success");
    setShowPasswordDialog(false);
    setIsStartingPassword(false);

    router.push("/profile/password/verify");
  }

  async function handleLogout() {
    if (isLoggingOut || isDeleting) return;
    setIsLoggingOut(true);
    useAuthStore.getState().setSigningOut(true);
    const result = await apiRequest("/api/auth/logout");

    if (!result.ok || result.data.success !== true) {
      useAuthStore.getState().setSigningOut(false);

      addToast(
        result.message || "Could not log out. Please try again.",
        "error",
      );
      setIsLoggingOut(false);
      return;
    }

    clearAuth();
    broadcastAuth({ type: "logout", reason: "logout" });
    addToast(result.message || "You have been logged out.", "success");

    router.replace("/");
    router.refresh();
    setIsLoggingOut(false);
  }

  async function handleDeleteAccount() {
    if (isDeleting || isLoggingOut) return;
    setIsDeleting(true);
    useAuthStore.getState().setSigningOut(true);

    const result = await apiRequest("/api/auth/delete-account", {
      body: { confirm: true },
    });

    if (!result.ok || result.data.success !== true) {
      useAuthStore.getState().setSigningOut(false);

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
    broadcastAuth({ type: "logout", reason: "deleted" });
    addToast(result.message || "Your account has been deleted.", "success");

    router.replace("/");
    router.refresh();
    setIsDeleting(false);
  }

  return (
    <>
      <section className="relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-xl border border-[#2d2f36] bg-[#15161a9f] p-6 shadow-lg sm:p-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-3/4 -translate-x-1/2 rounded-full bg-[#3B82F6] opacity-10 blur-[80px]" />
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

        <div className="w-full border-b border-[#2d2f36] pb-4 text-center">
          <h2 className="text-lg leading-none font-semibold text-white">
            User Details
          </h2>
          <p className="mt-1.5 leading-none  text-sm text-[#787878]">
            Your account information.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
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

      {showPhoto && (
        <ImageModal
          imageSrc={profileImageUrl}
          username={username}
          onClose={() => setShowPhoto(false)}
        />
      )}

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
              <span className="inline-block max-w-full font-semibold text-white wrap-anywhere">
                &quot;{profile.email}&quot;
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
