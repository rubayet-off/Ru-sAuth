"use client";

import { Eye, EyeOff, Lock } from "@mynaui/icons-react";
import { useState, type ComponentType, type InputHTMLAttributes } from "react";

import { fieldInputClass, fieldWrapperClass } from "./formStyles";

type IconComponent = ComponentType<{
  size?: number;
  stroke?: number;
  className?: string;
}>;

// আইকনসহ সাধারণ ইনপুট ঘর (ইমেইল, ইউজারনেম, OTP)
export function IconField({
  icon: Icon,
  inputClassName = "",
  ...inputProps
}: { icon: IconComponent; inputClassName?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={fieldWrapperClass}>
      <Icon size={20} stroke={1.5} className="shrink-0 text-gray-300" />

      <input {...inputProps} className={`${fieldInputClass} ${inputClassName}`.trim()} />
    </div>
  );
}

// পাসওয়ার্ড ইনপুট; চোখের বাটন দিয়ে দেখানো ও লুকানো যায়
export function PasswordField({
  showLabel = "Show password",
  hideLabel = "Hide password",
  ...inputProps
}: {
  showLabel?: string;
  hideLabel?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={fieldWrapperClass}>
      <Lock size={20} stroke={1.5} className="shrink-0 text-gray-300" />

      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={fieldInputClass}
      />

      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? hideLabel : showLabel}
        className="cursor-pointer text-[#787878] outline-none transition-colors hover:text-[#3B82F6]"
      >
        {visible ? <EyeOff size={20} stroke={1.5} /> : <Eye size={20} stroke={1.5} />}
      </button>
    </div>
  );
}
