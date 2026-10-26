"use client";

import { CheckCircle, DangerCircle, X } from "@mynaui/icons-react";
import { useToastStore } from "./toastStore";

export default function Toast() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex w-full flex-col items-center gap-2 px-3 sm:top-5 sm:px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === "success" ? "status" : "alert"}
          className={`toast-animate pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-3 py-3 text-white shadow-2xl backdrop-blur-xl sm:gap-3.5 sm:px-4 sm:py-3.5 ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-[#151a1a]/95 shadow-emerald-950/20"
              : "border-rose-500/30 bg-[#1c1518]/95 shadow-rose-950/20"
          }`}
        >
          <span
            className={`mt-0.5 flex shrink-0 items-center justify-center ${
              toast.type === "success" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} stroke={1.8} />
            ) : (
              <DangerCircle size={20} stroke={1.8} />
            )}
          </span>

          <p className="min-w-0 flex-1 wrap-break-word text-xs leading-relaxed text-gray-100 sm:text-sm">
            {toast.message}
          </p>

          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-0.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6]"
            aria-label="Close notification"
          >
            <X size={18} stroke={2} />
          </button>
        </div>
      ))}
    </div>
  );
}
