"use client";

import { useState } from "react";

type TopAppBarAvatarProps = {
  src?: string | null;
  fallbackSrc: string;
  alt: string;
};

export default function TopAppBarAvatar({
  src,
  fallbackSrc,
  alt,
}: TopAppBarAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const requestedSrc = src || fallbackSrc;
  const currentSrc = failedSrc === requestedSrc ? fallbackSrc : requestedSrc;

  const handleError = () => {
    if (currentSrc !== fallbackSrc) {
      setFailedSrc(requestedSrc);
    }
  };

  return (
    <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-container-highest">
      <img
        src={currentSrc}
        alt={alt || "User avatar"}
        className="h-full w-full object-cover"
        onError={handleError}
      />
    </div>
  );
}
