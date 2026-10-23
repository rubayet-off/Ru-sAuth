import { create } from "zustand";

export interface User {
  uid: string;
  sessionId: string;
  username: string;
  email: string;
  is_verified: boolean;
  profile_photo_url: string | null;
  need_refresh?: boolean;
}

export interface Admin {
  sessionId: string;
  username: string;
  email: string;
  need_refresh?: boolean;
}

type EntityType = "user" | "admin" | null;

interface AuthData {
  user: User | null;
  admin: Admin | null;
  entityType: EntityType;
}

// সার্ভার থেকে আসা বদলানো যায় এমন প্রোফাইল তথ্য
export type ProfileUpdate = Partial<Pick<User, "username" | "profile_photo_url">>;

interface AuthState extends AuthData {
  isAuthenticated: boolean;

  // সেশন-তালিকা বদলেছে কিনা বোঝার চিহ্ন; বদলালে SessionHistory তালিকা আবার আনে
  sessionsRevision: string | null;

  setAuth: (data: AuthData) => void;
  updateUser: (update: ProfileUpdate) => void;
  setSessionsRevision: (revision: string) => void;
  clearAuth: () => void;
}

// ক্লায়েন্ট সাইডে লগইন করা ব্যবহারকারীর তথ্য রাখার store; সব পেজ ও ট্যাব এখান থেকেই ছবি ও নাম দেখায়
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  admin: null,
  isAuthenticated: false,
  entityType: null,
  sessionsRevision: null,

  // লগইন তথ্য বসায়
  setAuth: ({ user, admin, entityType }) =>
    set({ user, admin, entityType, isAuthenticated: !!user || !!admin }),

  // ছবি বা নাম বদলালে শুধু সেটুকু হালনাগাদ করে; অন্য কিছুতে হাত দেয় না
  updateUser: (update) =>
    set((state) => (state.user ? { user: { ...state.user, ...update } } : state)),

  setSessionsRevision: (revision) => set({ sessionsRevision: revision }),

  // লগআউট, অ্যাকাউন্ট মোছা বা সেশন বাতিলের পর সব তথ্য মুছে ফেলে
  clearAuth: () =>
    set({
      user: null,
      admin: null,
      isAuthenticated: false,
      entityType: null,
      sessionsRevision: null,
    }),
}));
