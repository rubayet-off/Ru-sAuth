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

export type ProfileUpdate = Partial<
  Pick<User, "username" | "profile_photo_url">
>;

interface AuthState extends AuthData {
  isAuthenticated: boolean;
  sessionsRevision: string | null;
  isSigningOut: boolean;
  setSigningOut: (value: boolean) => void;

  setAuth: (data: AuthData) => void;
  updateUser: (update: ProfileUpdate) => void;
  setSessionsRevision: (revision: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  admin: null,
  isAuthenticated: false,
  entityType: null,
  sessionsRevision: null,
  isSigningOut: false,

  setAuth: ({ user, admin, entityType }) =>
    set({ user, admin, entityType, isAuthenticated: !!user || !!admin }),

  updateUser: (update) =>
    set((state) =>
      state.user ? { user: { ...state.user, ...update } } : state,
    ),

  setSessionsRevision: (revision) => set({ sessionsRevision: revision }),
  setSigningOut: (value) => set({ isSigningOut: value }),

  clearAuth: () =>
    set({
      user: null,
      admin: null,
      isAuthenticated: false,
      entityType: null,
      sessionsRevision: null,
      isSigningOut: false,
    }),
}));
