"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Calendar,
  Clock4,
  Database,
  Globe,
  Logout,
  Mail,
  Mobile,
  Monitor,
  User,
} from "@mynaui/icons-react";

import Avatar from "@/app/component/Avatar";
import Navbar from "@/app/component/Navbar";
import type { DashboardSnapshot } from "@/lib/adminDashboardData";
import { broadcastAuth, subscribeAuth } from "@/lib/authChannel";
import { apiRequest } from "@/lib/clientApi";
import { MAX_CONSECUTIVE_STALE, probeSession } from "@/lib/sessionProbe";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

type Tab = "users" | "sessions";

type AdminDashboardClientProps = {
  initialSnapshot: DashboardSnapshot;
};

const POLL_INTERVAL_MS = 3000;

function formatDateTime(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

function AdminDetail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-stretch gap-3 rounded-lg border border-[#2d2f36] bg-[#0E0F12]/70 p-3.5 sm:p-4">
      <div className="flex min-h-9 w-9 shrink-0 self-stretch items-center justify-center rounded-lg border border-[#2d2f36] bg-[#17181C] text-[#3B82F6]">
        {icon}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-xs font-medium text-[#787878]">{label}</p>
        <p className="mt-1 wrap-break-word text-sm font-medium leading-5 text-[#EAEAEA]">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  variant,
}: {
  label: string;
  value: number;
  description: string;
  variant: "active" | "deleted";
}) {
  const isActive = variant === "active";

  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-[#2d2f36] bg-[#15161A] p-5 shadow-lg sm:p-6">
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl ${
          isActive ? "bg-[#3B82F6]/10" : "bg-rose-500/10"
        }`}
      />

      <div className="relative flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[#92949D]">{label}</p>

        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            isActive ? "bg-[#3B82F6]" : "bg-rose-400"
          }`}
        />
      </div>

      <p className="relative mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {value.toLocaleString("en-US")}
      </p>

      <p className="relative mt-2 text-xs leading-relaxed text-[#787878]">
        {description}
      </p>
    </div>
  );
}

export default function AdminDashboardClient({
  initialSnapshot,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRunningCron, setIsRunningCron] = useState(false);

  const admin = snapshot.admin;
  const sessions = snapshot.sessions;
  const systemUsers = snapshot.users;

  const activeUsers = snapshot.counts.active;
  const deletedUsers = snapshot.counts.deleted;

  const activeOtherSessions = sessions.filter(
    (session) => !session.current && !session.revoked,
  ).length;

  const refreshingRef = useRef(false);
  const lastJsonRef = useRef(JSON.stringify(initialSnapshot));
  const stoppedRef = useRef(false);
  const staleCountRef = useRef(0);

  const endSession = useCallback(
    (reason: "missing" | "revoked" | "foreign") => {
      if (stoppedRef.current || useAuthStore.getState().isSigningOut) return;

      stoppedRef.current = true;

      clearAuth();

      addToast(
        reason === "foreign"
          ? "This page is only for the administrator."
          : "You were signed out because this session is no longer active.",
        "error",
      );

      if (reason !== "foreign") {
        broadcastAuth({ type: "logout", reason: "revoked" });
      }

      router.replace("/admin/login");
      router.refresh();
    },
    [addToast, clearAuth, router],
  );

  const recoverFromStaleCookie = useCallback(() => {
    if (stoppedRef.current) return;

    stoppedRef.current = true;

    clearAuth();
    window.location.href = "/api/auth/clear-cookie?next=%2Fadmin%2Flogin";
  }, [clearAuth]);

  const refreshSnapshot = useCallback(async () => {
    if (refreshingRef.current || stoppedRef.current) return;

    refreshingRef.current = true;

    const result = await apiRequest("/api/admin/dashboard", {
      method: "GET",
    });

    refreshingRef.current = false;
    if (stoppedRef.current || useAuthStore.getState().isSigningOut) return;

    if (result.status === 401) {
      const reason = result.data.reason;

      endSession(
        reason === "foreign" || reason === "missing" ? reason : "revoked",
      );

      return;
    }

    if (result.status === 409) {
      staleCountRef.current += 1;

      if (staleCountRef.current >= MAX_CONSECUTIVE_STALE)
        recoverFromStaleCookie();

      return;
    }

    if (!result.ok || result.data.success !== true) return;

    staleCountRef.current = 0;

    const next: Record<string, unknown> = { ...result.data };

    delete next.success;

    const json = JSON.stringify(next);

    if (json === lastJsonRef.current) return;

    lastJsonRef.current = json;

    setSnapshot(next as unknown as DashboardSnapshot);
  }, [endSession, recoverFromStaleCookie]);

  useEffect(() => {
    stoppedRef.current = false;

    let timer: ReturnType<typeof setTimeout> | undefined;

    function schedule() {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") {
          await refreshSnapshot();
        }

        if (!stoppedRef.current) schedule();
      }, POLL_INTERVAL_MS);
    }

    function onWake() {
      if (document.visibilityState === "visible") {
        void refreshSnapshot();
      }
    }

    schedule();

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    const unsubscribe = subscribeAuth((message) => {
      if (message.type === "sessions") {
        void refreshSnapshot();
      }
    });

    return () => {
      stoppedRef.current = true;

      if (timer) clearTimeout(timer);

      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);

      unsubscribe();
    };
  }, [refreshSnapshot]);

  async function handleRejectedAction(): Promise<void> {
    const probe = await probeSession("admin");

    if (probe.state === "ended") {
      endSession(probe.reason);
      return;
    }

    addToast("Please try again in a moment.", "error");
  }

  async function handleRevokeSession(sessionId: string) {
    if (busySessionId || isRevokingAll || isLoggingOut || isRunningCron) return;

    setBusySessionId(sessionId);

    const result = await apiRequest(
      `/api/admin/sessions/${encodeURIComponent(sessionId)}/revoke`,
    );

    if (result.status === 401) {
      await handleRejectedAction();
    } else if (!result.ok || result.data.success !== true) {
      addToast(result.message || "Could not revoke this session.", "error");
    } else {
      await refreshSnapshot();

      broadcastAuth({ type: "sessions" });

      addToast(result.message || "Session revoked successfully.", "success");
    }

    setBusySessionId(null);
  }

  async function handleRevokeAll() {
    if (
      activeOtherSessions === 0 ||
      isRevokingAll ||
      busySessionId ||
      isLoggingOut ||
      isRunningCron
    ) {
      return;
    }

    setIsRevokingAll(true);

    const result = await apiRequest("/api/admin/sessions/revoke-all");

    if (result.status === 401) {
      await handleRejectedAction();
    } else if (!result.ok || result.data.success !== true) {
      addToast(result.message || "Could not revoke sessions.", "error");
    } else {
      await refreshSnapshot();

      broadcastAuth({ type: "sessions" });

      addToast(result.message || "Other sessions revoked.", "success");
    }

    setIsRevokingAll(false);
  }

  async function handleDataCron() {
    if (isRunningCron || isLoggingOut || isRevokingAll || busySessionId) return;

    setIsRunningCron(true);

    const result = await apiRequest("/api/admin/cleanup");

    if (result.status === 401) {
      await handleRejectedAction();
    } else if (!result.ok || result.data.success !== true) {
      addToast(result.message || "Could not run the data cleanup.", "error");
    } else {
      await refreshSnapshot();
      addToast(result.message || "Cleanup complete.", "success");
    }

    setIsRunningCron(false);
  }

  async function handleLogout() {
    if (isLoggingOut || isRevokingAll || busySessionId || isRunningCron) return;

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

    stoppedRef.current = true;

    clearAuth();

    broadcastAuth({ type: "logout", reason: "logout" });

    addToast(result.message || "You have been logged out.", "success");

    router.replace("/admin/login");
    router.refresh();

    setIsLoggingOut(false);
  }

  return (
    <div className=" min-h-screen bg-[#0E0F12] text-[#EAEAEA]">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-[#2d2f36] bg-[#0E0F12]">
        <Navbar />
      </div>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 pt-24 sm:gap-8 sm:px-6 sm:pt-28 lg:px-8">
        <section className="flex flex-col gap-4 border-b border-[#2d2f36] pb-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">
              Administration
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Admin Dashboard
            </h1>

            <p className="max-w-2xl text-sm leading-6 text-[#92949D] sm:text-base">
              Manage system accounts and review administrator session activity.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleLogout}
              disabled={
                isLoggingOut ||
                isRevokingAll ||
                busySessionId !== null ||
                isRunningCron
              }
              className="flex w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#2d2f36] bg-[#0E0F12] px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Logout size={18} stroke={1.5} />

              <span className="leading-none">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDataCron}
              disabled={
                isRunningCron ||
                isLoggingOut ||
                isRevokingAll ||
                busySessionId !== null
              }
              className="flex w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#2d2f36] bg-[#0E0F12] px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Database size={18} stroke={1.5} />

              <span className="leading-none">
                {isRunningCron ? "Cleaning up..." : "Data Cron"}
              </span>
            </button>
          </div>
        </section>

        <section className="flex w-full flex-col gap-4 rounded-xl border border-[#2d2f36] bg-[#15161A]/90 p-4 shadow-lg sm:gap-5 sm:p-6">
          <div className="flex flex-col gap-1 border-b border-[#2d2f36] pb-4">
            <h2 className="text-lg font-semibold text-white">Admin Details</h2>

            <p className="text-sm text-[#787878]">
              Administrator account information.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminDetail
              label="Admin Name"
              value={admin.name}
              icon={<User size={19} stroke={1.5} />}
            />

            <AdminDetail
              label="Email Address"
              value={admin.email}
              icon={<Mail size={18} stroke={1.5} />}
            />

            <AdminDetail
              label="Last Login"
              value={formatDateTime(admin.lastLogin)}
              icon={<Clock4 size={18} stroke={1.5} />}
            />

            <AdminDetail
              label="Account Created"
              value={formatDateTime(admin.createdAt)}
              icon={<Calendar size={18} stroke={1.5} />}
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="System Users"
            value={activeUsers}
            description="Non-deleted accounts currently in the system."
            variant="active"
          />

          <StatCard
            label="Deleted Accounts"
            value={deletedUsers}
            description="Accounts marked as deleted."
            variant="deleted"
          />
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-[#2d2f36] bg-[#15161A]/90 shadow-lg">
          <div className="border-b border-[#2d2f36] p-3 sm:p-4">
            <div
              role="tablist"
              aria-label="Admin dashboard sections"
              className="grid grid-cols-2 gap-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "users"}
                onClick={() => setActiveTab("users")}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                  activeTab === "users"
                    ? "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA]"
                    : "border-transparent text-[#92949D] hover:bg-[#0E0F12] hover:text-white"
                }`}
              >
                <span>System Users</span>

                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] sm:text-xs ${
                    activeTab === "users"
                      ? "bg-[#3B82F6]/15 text-[#60A5FA]"
                      : "bg-[#2A2C32] text-[#92949D]"
                  }`}
                >
                  {activeUsers + deletedUsers}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "sessions"}
                onClick={() => setActiveTab("sessions")}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-3 text-center text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                  activeTab === "sessions"
                    ? "border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[#60A5FA]"
                    : "border-transparent text-[#92949D] hover:bg-[#0E0F12] hover:text-white"
                }`}
              >
                <Monitor size={17} stroke={1.5} />

                <span>Session History</span>
              </button>
            </div>
          </div>

          {activeTab === "sessions" && (
            <div
              role="tabpanel"
              className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6"
            >
              <div className="flex flex-col items-center justify-center gap-4 border-b border-[#2d2f36] pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <h2 className="text-lg font-semibold text-white">
                    Admin Session History
                  </h2>

                  <p className="mt-1 text-sm text-[#92949D]">
                    Manage devices signed in to your administrator account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRevokeAll}
                  disabled={
                    activeOtherSessions === 0 ||
                    isRevokingAll ||
                    busySessionId !== null ||
                    isLoggingOut
                  }
                  className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-400 transition-colors hover:border-rose-500/60 hover:bg-transparent disabled:cursor-not-allowed disabled:border-[#2d2f36] disabled:bg-transparent disabled:text-[#555] sm:w-auto"
                >
                  <Logout size={18} stroke={1.5} />

                  <span className="leading-none">
                    Revoke all ({activeOtherSessions})
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {sessions.map((session) => {
                  const DeviceIcon =
                    session.device === "mobile" ? Mobile : Monitor;

                  return (
                    <article
                      key={session.id}
                      className={`flex min-w-0 flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4 ${
                        session.current
                          ? "border-[#3B82F6]/40 bg-[#3B82F6]/5"
                          : "border-[#2d2f36] bg-[#0E0F12]"
                      } ${session.revoked ? "opacity-75" : ""}`}
                    >
                      <div className="flex min-w-0 flex-1 items-stretch gap-3 sm:gap-4">
                        <div className="flex shrink-0 items-center justify-center self-stretch rounded-md border border-[#2d2f36] bg-[#15161A] px-3 text-[#92949D] sm:px-4">
                          <DeviceIcon size={22} stroke={1.5} />
                        </div>

                        <div className="flex min-w-0 flex-col justify-center py-0.5">
                          <h3 className="wrap-break-word text-sm font-semibold text-white">
                            {session.browser} on{" "}
                            {session.device === "mobile" ? "Mobile" : "Desktop"}
                          </h3>

                          <div className="mt-2 flex flex-col gap-1.5 text-xs text-[#92949D] sm:gap-2">
                            <span className="flex items-start gap-1.5 break-all">
                              <Globe
                                size={14}
                                stroke={1.5}
                                className="mt-0.5 shrink-0"
                              />

                              <span>{session.ip}</span>
                            </span>

                            <span className="flex items-start gap-1.5">
                              <Clock4
                                size={14}
                                stroke={1.5}
                                className="mt-0.5 shrink-0"
                              />

                              <span>{formatDateTime(session.startedAt)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 flex w-full shrink-0 items-center justify-center sm:mt-0 sm:w-auto sm:justify-end">
                        {session.current ? (
                          <span className="w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-xs font-medium text-emerald-400 sm:w-auto">
                            Current Session
                          </span>
                        ) : session.revoked ? (
                          <span className="w-full rounded-md border border-[#2d2f36] bg-transparent px-3 py-2 text-center text-xs text-[#787878] sm:w-auto">
                            Revoked / Expired
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={
                              busySessionId !== null ||
                              isRevokingAll ||
                              isLoggingOut
                            }
                            className="w-full cursor-pointer rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400 transition-colors hover:border-rose-500/60 hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {busySessionId === session.id
                              ? "Revoking..."
                              : "Revoke"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div
              role="tabpanel"
              className="flex min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6"
            >
              <div className="flex flex-col gap-3 border-b border-[#2d2f36] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    System Users
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#92949D]">
                    View registered accounts, including deleted accounts.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-[#92949D]">
                    <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                    Active: {activeUsers}
                  </span>

                  <span className="flex items-center gap-1.5 text-[#92949D]">
                    <span className="h-2 w-2 rounded-full bg-[#62636A]" />
                    Deleted: {deletedUsers}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {systemUsers.length === 0 && (
                  <p className="py-6 text-center text-sm text-[#787878]">
                    No users found.
                  </p>
                )}

                {systemUsers.map((user) => {
                  const isDeleted = user.deletedAt !== null;

                  return (
                    <article
                      key={user.id}
                      className={`flex min-w-0 flex-col gap-4 rounded-lg border p-3.5 transition-colors sm:p-4 ${
                        isDeleted
                          ? "border-[#292a30] bg-[#0E0F12]/70 opacity-55 grayscale"
                          : "border-[#2d2f36] bg-[#0E0F12] hover:border-[#3B82F6]/30"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#2d2f36] bg-[#17181C] sm:h-16 sm:w-16">
                          <Avatar
                            url={user.imageUrl}
                            name={user.name}
                            letterClassName="text-lg text-[#60A5FA]"
                            sizes="400px"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="wrap-break-word text-sm font-semibold leading-5 text-[#EAEAEA] sm:text-base">
                            {user.name}
                          </h3>

                          <div className="mt-1 flex min-w-0 items-start gap-1.5 break-all text-xs text-[#92949D] sm:text-sm">
                            <p className="mt-px leading-none">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`grid grid-cols-1 gap-3 border-t border-[#2d2f36] pt-3 ${
                          isDeleted ? "sm:grid-cols-2" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-stretch gap-3">
                          <div className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-[#2d2f36] bg-[#17181C] px-3 text-[#3B82F6]">
                            <Calendar size={20} stroke={1.5} />
                          </div>

                          <div className="min-w-0 self-center">
                            <p className="text-xs font-medium text-[#787878]">
                              Account Created
                            </p>

                            <p className="mt-1 wrap-break-word text-sm font-medium leading-5 text-[#EAEAEA]">
                              {formatDateTime(user.createdAt)}
                            </p>
                          </div>
                        </div>

                        {user.deletedAt && (
                          <div className="flex min-w-0 items-stretch gap-3">
                            <div className="flex shrink-0 items-center justify-center self-stretch rounded-lg border border-[#2d2f36] bg-[#17181C] px-3 text-[#62636A]">
                              <Clock4 size={20} stroke={1.5} />
                            </div>

                            <div className="min-w-0 self-center">
                              <p className="text-xs font-medium text-[#787878]">
                                Deleted At
                              </p>

                              <p className="mt-1 wrap-break-word text-sm font-medium leading-5 text-[#92949D]">
                                {formatDateTime(user.deletedAt)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <footer className="border-t border-[#2d2f36] pt-4 text-center text-xs text-[#62636A]">
          Ru&apos;sAuth Administration
        </footer>
      </main>
    </div>
  );
}
