"use client";

import { useEffect, useRef } from "react";

import { apiRequest } from "@/lib/clientApi";

import { useAuthStore, type Admin, type User } from "./authStore";

interface AuthStoreSetupProps {
  user: User | null;
  admin: Admin | null;
  entityType: "user" | "admin" | null;
}

// সার্ভারে পাওয়া লগইন তথ্য store এ বসায় এবং access টোকেনের মেয়াদ শেষ হলে নিঃশব্দে নতুন টোকেন নেয়
export default function AuthStoreSetup({
  user,
  admin,
  entityType,
}: AuthStoreSetupProps) {
  const setAuth = useAuthStore((state) => state.setAuth);
  const refreshStarted = useRef(false);

  // সার্ভারের তথ্য store এ বসে; একই ব্যবহারকারী আগে থেকেই store এ থাকলে সেটি রেখে দেওয়া হয়
  // কারণ store এ থাকা ছবি বা নাম সার্ভারের পুরোনো স্ন্যাপশটের চেয়ে নতুন হতে পারে (AuthSync সেটি হালনাগাদ রাখে)
  useEffect(() => {
    const current = useAuthStore.getState();

    const sameUser = user && current.user?.uid === user.uid;
    const sameAdmin = admin && current.admin?.email === admin.email;

    if (sameUser || sameAdmin) return;

    setAuth({ user, admin, entityType });
  }, [user, admin, entityType, setAuth]);

  // টোকেন রিফ্রেশ প্রতি পেজ লোডে একবারই চলে
  useEffect(() => {
    const needsRefresh =
      entityType === "user"
        ? user?.need_refresh
        : entityType === "admin"
          ? admin?.need_refresh
          : false;

    if (!needsRefresh || refreshStarted.current) return;

    refreshStarted.current = true;

    void apiRequest("/api/auth/refresh-token").then((result) => {
      if (!result.ok) {
        console.error("Silent session refresh failed:", result.status, result.message);
      }
    });
  }, [user, admin, entityType]);

  return null;
}
