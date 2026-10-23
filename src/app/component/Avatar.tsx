
"use client";

import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  // Profile image URL; show the first letter of the name if unavailable.
  url: string | null;
  name: string;

  // Styling for the fallback initial.
  letterClassName: string;

  // Responsive image sizes.
  sizes?: string;

  // Load the image with high priority when needed.
  priority?: boolean;

  // Image optimization quality (1–100).
  quality?: number;
}

// Displays the profile image or the user's first initial.
// The parent element must have position: relative.
export default function Avatar({
  url,
  name,
  letterClassName,
  sizes,
  priority,
  quality = 100,
}: AvatarProps) {
  // Remember failed image URLs. A new URL will be attempted normally.
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
