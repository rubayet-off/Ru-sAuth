"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import google from "@/assets/google.png";
import { secondaryButtonClass } from "./formStyles";

export default function GoogleButton({ disabled }: { disabled?: boolean }) {
  const pathname = usePathname();

  function handleClick() {
    const params = new URLSearchParams({ from: pathname });
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
