import { create } from "zustand";

export type ToastType = "success" | "error";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

// টোস্ট বার্তা কত মিলিসেকেন্ড দেখা যাবে
const TOAST_DURATION_MS = 3000;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  // নতুন টোস্ট যোগ করে এবং নির্দিষ্ট সময় পর নিজে থেকেই সরিয়ে দেয়
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 9);

    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, TOAST_DURATION_MS);
  },

  // একটি টোস্ট হাতে বন্ধ করা
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
