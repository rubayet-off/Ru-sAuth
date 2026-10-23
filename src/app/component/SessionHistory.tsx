"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mobile, Monitor, Globe, Clock4, Logout } from "@mynaui/icons-react";

import { broadcastAuth } from "@/lib/authChannel";
import { apiRequest } from "@/lib/clientApi";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

interface Session {
  sessionUid: string;
  browser: string;
  device: "desktop" | "mobile";
  ip: string;
  startedAt: string;
  current: boolean;
  revoked: boolean;
}

// সেশন শুরুর সময় ঢাকার সময় অনুযায়ী সাজিয়ে দেখায়
function formatStartedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

// লগইন করা সব ডিভাইসের তালিকা এবং সেগুলো বাতিল করার অংশ
export default function SessionHistory() {
  const router = useRouter();
  const addToast = useToastStore((state) => state.addToast);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busySessionUid, setBusySessionUid] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // "Try again" চাপলে এই সংখ্যা বাড়ে এবং তালিকা আবার আনা হয়
  const [reloadKey, setReloadKey] = useState(0);

  // অন্য ট্যাব বা ডিভাইসে সেশন বদলালে এই চিহ্ন বদলে যায় এবং তালিকা নিজে থেকে আবার আসে
  const sessionsRevision = useAuthStore((state) => state.sessionsRevision);

  // বর্তমান সেশন বাদে এখনো সচল সেশনের সংখ্যা
  const activeOtherSessions = sessions.filter(
    (session) => !session.current && !session.revoked,
  ).length;

  // পেজ খুললে সেশনের তালিকা সার্ভার থেকে আনা হয়; ৪০১ হলে লগইন পেজে পাঠানো হয়
  useEffect(() => {
    let cancelled = false;

    void apiRequest("/api/auth/sessions", { method: "GET" }).then((result) => {
      // কম্পোনেন্ট সরে গেলে আর state বদলানো হয় না
      if (cancelled) return;

      if (result.status === 401) {
        clearAuth();
        router.replace("/email");
        router.refresh();
        return;
      }

      if (!result.ok || !Array.isArray(result.data.sessions)) {
        setLoadError(result.message || "Could not load your sessions.");
      } else {
        setSessions(result.data.sessions as Session[]);
      }

      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [clearAuth, router, reloadKey, sessionsRevision]);

  // তালিকা আনতে ব্যর্থ হলে আবার চেষ্টা করা
  function handleRetry() {
    setLoadError(null);
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }

  // একটি নির্দিষ্ট সেশন বাতিল করা
  async function handleRevokeSession(session: Session) {
    if (session.current || session.revoked || busySessionUid || isRevokingAll) return;

    setBusySessionUid(session.sessionUid);

    const result = await apiRequest(
      `/api/auth/sessions/${encodeURIComponent(session.sessionUid)}/revoke`,
    );

    if (!result.ok || result.data.success !== true) {
      addToast(result.message || "Could not revoke this session.", "error");
    } else {
      setSessions((current) =>
        current.map((item) =>
          item.sessionUid === session.sessionUid ? { ...item, revoked: true } : item,
        ),
      );

      addToast(result.message || "Session revoked successfully.", "success");

      // একই ব্রাউজারের বাকি ট্যাবের তালিকাও সঙ্গে সঙ্গে হালনাগাদ হয়
      broadcastAuth({ type: "sessions" });
    }

    setBusySessionUid(null);
  }

  // বর্তমান সেশন বাদে বাকি সব সেশন একসাথে বাতিল করা
  async function handleRevokeAll() {
    if (activeOtherSessions === 0 || isRevokingAll || busySessionUid) return;

    setIsRevokingAll(true);

    const result = await apiRequest("/api/auth/sessions/revoke-all");

    if (!result.ok || result.data.success !== true) {
      addToast(result.message || "Could not revoke sessions.", "error");
    } else {
      setSessions((current) =>
        current.map((session) =>
          session.current ? session : { ...session, revoked: true },
        ),
      );

      addToast(result.message || "Other sessions revoked.", "success");

      // একই ব্রাউজারের বাকি ট্যাবের তালিকাও সঙ্গে সঙ্গে হালনাগাদ হয়
      broadcastAuth({ type: "sessions" });
    }

    setIsRevokingAll(false);
  }

  return (
    <section className="flex w-full flex-col gap-4 rounded-xl border border-[#2d2f36] bg-[#15161aa3] p-6 sm:p-8">
      {/* শিরোনাম ও "Revoke all" বাটন */}
      <div className="flex flex-col items-center justify-center gap-4 border-b border-[#2d2f36] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h2 className="text-lg font-semibold text-white">
            Session History
          </h2>

          <p className="mt-1 text-sm text-gray-300">
            Manage devices signed in to your account.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRevokeAll}
          disabled={
            isLoading ||
            isRevokingAll ||
            !!busySessionUid ||
            activeOtherSessions === 0
          }
          className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-400 transition-colors hover:border-rose-500/60 hover:bg-transparent disabled:cursor-not-allowed disabled:border-[#2d2f36] disabled:bg-transparent disabled:text-[#555] sm:w-auto"
        >
          <Logout size={18} stroke={1.5} />

          <span className="leading-none">
            {isRevokingAll
              ? "Revoking..."
              : `Revoke all (${activeOtherSessions})`}
          </span>
        </button>
      </div>

      {/* লোডিং, এরর, খালি তালিকা বা সেশনের তালিকা, যেটি প্রযোজ্য সেটি দেখানো হয় */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Loading session history...
        </p>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-rose-400">{loadError}</p>

          <button
            type="button"
            onClick={handleRetry}
            className="rounded-md border border-[#2d2f36] px-4 py-2 text-sm text-gray-300 transition-colors hover:border-[#3B82F6] hover:text-white"
          >
            Try again
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No session history found.
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          {sessions.map((session) => (
            <div
              key={session.sessionUid}
              className={`flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4 ${
                session.current
                  ? "border-[#3B82F6]/40 bg-[#3B82F6]/5"
                  : "border-[#2d2f36] bg-[#0E0F12]"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-stretch gap-3 sm:gap-4">
                <div className="flex shrink-0 items-center justify-center self-stretch rounded-md border border-[#2d2f36] bg-[#15161A] px-3 text-[#92949D] sm:px-4">
                  {session.device === "mobile" ? (
                    <Mobile size={22} stroke={1.5} />
                  ) : (
                    <Monitor size={22} stroke={1.5} />
                  )}
                </div>

                <div className="flex min-w-0 flex-col justify-center py-0.5">
                  <h3 className="wrap-break-word text-sm font-semibold text-white">
                    {session.browser} on{" "}
                    {session.device === "mobile"
                      ? "Mobile"
                      : "Desktop"}
                  </h3>

                  <div className="mt-2 flex flex-col gap-1.5 text-xs text-gray-400 sm:gap-2">
                    <span className="flex items-center gap-1.5 break-all">
                      <Globe
                        size={14}
                        stroke={1.5}
                        className="shrink-0"
                      />
                      {session.ip}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock4
                        size={14}
                        stroke={1.5}
                        className="shrink-0"
                      />
                      {formatStartedAt(session.startedAt)}
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
                    disabled={
                      isRevokingAll ||
                      busySessionUid !== null
                    }
                    onClick={() => void handleRevokeSession(session)}
                    className="w-full cursor-pointer rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400 transition-colors hover:border-rose-500/60 hover:bg-transparent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {busySessionUid === session.sessionUid
                      ? "Revoking..."
                      : "Revoke"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
