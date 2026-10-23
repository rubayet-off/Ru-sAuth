"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

import google from "@/assets/google.png";

import { secondaryButtonClass } from "./formStyles";

// "Continue with Google" বাটন; ব্যর্থ হলে যেন এই পেজেই ফেরা যায় সেজন্য বর্তমান পথ পাঠানো হয়
export default function GoogleButton({ disabled }: { disabled?: boolean }) {
  const pathname = usePathname();

  function handleClick() {
    const params = new URLSearchParams({ from: pathname });

    // Google এ যাওয়ার আগে সার্ভারের রুট দিয়ে যেতে হয়, তাই পুরো পেজ নতুন করে লোড হয়
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- এটি পেজ নয়, সার্ভারের রুট
    window.location.href = `/api/google/oAuth?${params.toString()}`;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={secondaryButtonClass}
    >
      <Image src={google} alt="Google" className="h-5 w-5" />

      <span className="leading-none">Continue with Google</span>
    </button>
  );
}
