"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  url: string | null;
  name: string;
  letterClassName: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
}

export default function Avatar({
  url,
  name,
  letterClassName,
  sizes,
  priority,
  quality = 100,
}: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (url && url !== failedUrl) {
    return (
      <Image
        src={url}
        alt={`${name}'s profile picture`}
        fill
        priority={priority}
        quality={quality}
        sizes={sizes}
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(url)}
        className="object-cover"
      />
    );
  }

  return (
    <span
      className={`absolute inset-0 flex items-center justify-center font-semibold ${letterClassName}`}
    >
      {initial}
    </span>
  );
}
