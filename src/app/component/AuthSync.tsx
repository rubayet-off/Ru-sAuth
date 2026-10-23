"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { broadcastAuth, subscribeAuth } from "@/lib/authChannel";
import { apiRequest, parseProfileSnapshot } from "@/lib/clientApi";
import { useToastStore } from "@/toast/toastStore";
import { useAuthStore } from "@/zustand/authStore";

// ট্যাব খোলা ও দেখা যাচ্ছে এমন অবস্থায় কত মিলিসেকেন্ড পরপর সার্ভার থেকে অবস্থা জানা হবে
const POLL_INTERVAL_MS = 3000;

// সব ট্যাব ও ডিভাইসের লগইন অবস্থা, ছবি ও নাম প্রায় রিয়েল টাইমে মিলিয়ে রাখে
// ১. একই ব্রাউজারের ট্যাব: BroadcastChannel এ সঙ্গে সঙ্গে
// ২. অন্য ডিভাইস বা ব্রাউজার: প্রতি ৩ সেকেন্ডে /api/auth/status দেখে, আর ট্যাবে ফিরলে তৎক্ষণাৎ
export default function AuthSync() {
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const entityType = useAuthStore((state) => state.entityType);

  const addToast = useToastStore((state) => state.addToast);

  // একই সময়ে দুটি রিকোয়েস্ট যেন না চলে
  const checkingRef = useRef(false);

  // লগআউট অবস্থায় নিয়ে যায়: store খালি করে হোম পেজে ফেরে
  const wasAuthenticatedRef = useRef(false);

  // লগইন হলে অন্য ট্যাবগুলোকে জানানো হয়, যাতে লগইন ফর্ম খোলা ট্যাবগুলো সরে যায়
  useEffect(() => {
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      broadcastAuth({ type: "login" });
    }

    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // অন্য ট্যাব থেকে আসা বার্তা সামলানো
  useEffect(() => {
    return subscribeAuth((message) => {
      const store = useAuthStore.getState();

      if (message.type === "logout") {
        if (!store.isAuthenticated) return;

        // সাইন-আউটের পর কোথায় ফিরতে হবে তা store খালি করার আগেই জেনে নেওয়া হয়
        const loginPath = store.entityType === "admin" ? "/admin/login" : "/";

        store.clearAuth();

        addToast(
          message.reason === "deleted"
            ? "This account was deleted in another tab."
            : "You were signed out in another tab.",
          "error",
        );

        router.replace(loginPath);
        router.refresh();
        return;
      }

      if (message.type === "login") {
        // লগইন ফর্ম খোলা ট্যাব এখন লগইন করা অবস্থায় চলে যাবে
        if (!store.isAuthenticated) {
          router.replace("/");
          router.refresh();
        }

        return;
      }

      if (message.type === "profile") {
        store.updateUser({
          ...(message.username !== undefined ? { username: message.username } : {}),
          ...(message.profile_photo_url !== undefined
            ? { profile_photo_url: message.profile_photo_url }
            : {}),
        });

        return;
      }

      if (message.type === "sessions") {
        // সেশন-তালিকা আবার আনতে চিহ্ন বদলে দেওয়া হয়
        store.setSessionsRevision(`local:${Date.now()}`);
      }
    });
  }, [addToast, router]);

  // সার্ভারের সাথে অবস্থা মেলানো (শুধু সাধারণ ব্যবহারকারীর জন্য)
  useEffect(() => {
    if (!isAuthenticated || entityType !== "user") return;

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      if (stopped || checkingRef.current) return;

      checkingRef.current = true;

      const result = await apiRequest("/api/auth/status", { method: "GET" });

      checkingRef.current = false;

      if (stopped) return;

      // সেশন বাতিল বা অ্যাকাউন্ট মোছা হয়েছে: সার্ভার কুকি মুছে দিয়েছে, এখন ক্লায়েন্টও লগআউট
      if (result.status === 401) {
        const store = useAuthStore.getState();

        if (store.isAuthenticated) {
          store.clearAuth();
          addToast("You were signed out because this session is no longer active.", "error");

          // একই ব্রাউজারের বাকি ট্যাবও কুকি মোছা অবস্থায় আছে, তাদেরও জানানো হয়
          broadcastAuth({ type: "logout", reason: "revoked" });

          router.replace("/");
          router.refresh();
        }

        return;
      }

      const snapshot = result.ok ? parseProfileSnapshot(result.data) : null;

      if (snapshot) {
        const store = useAuthStore.getState();
        const current = store.user;

        // ছবি বা নাম অন্য কোথাও বদলে থাকলে এখানেও বদলে নেওয়া হয়
        if (
          current &&
          (current.username !== snapshot.username ||
            current.profile_photo_url !== snapshot.profile_photo_url)
        ) {
          store.updateUser({
            username: snapshot.username,
            profile_photo_url: snapshot.profile_photo_url,
          });
        }

        if (store.sessionsRevision !== snapshot.sessionsRevision) {
          store.setSessionsRevision(snapshot.sessionsRevision);
        }
      }
    }

    // পরের যাচাই নির্ধারণ; ট্যাব লুকানো থাকলে অযথা রিকোয়েস্ট পাঠানো হয় না
    function schedule() {
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await check();

        if (!stopped) schedule();
      }, POLL_INTERVAL_MS);
    }

    // ট্যাবে ফিরলে বা নেট ফিরলে সঙ্গে সঙ্গে যাচাই
    function onWake() {
      if (document.visibilityState === "visible") void check();
    }

    void check();
    schedule();

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);

    return () => {
      stopped = true;

      if (timer) clearTimeout(timer);

      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [isAuthenticated, entityType, addToast, router]);

  return null;
}
