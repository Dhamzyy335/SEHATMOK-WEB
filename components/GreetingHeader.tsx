"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TopAppBarAvatar from "@/components/TopAppBarAvatar";

export const defaultGreetingAvatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDyE81jWTjjP1Y3TEpjYlqU5ai17OBSpHm_766eJCFriLp8GfAqsSvijZ5hx_1AUKkqVpiUSHWkY0Fs0Y_VO-VfFRnFDxosdFRxy8HZ5JQYZnNghHOWNdWFh2LpsLFd4XXuDwUghMc8qXlBRMHHyCAWvvyF3gXDweHOE4P_mK2LxCrpz-aGDTbG-TnWz8zYm6-IhZ31LYEJns22pM0yeDuuej5eZKwd83eI6Z5VNHuXx18xrkLwQ1NEBAGIACCMeOYBXHFD8dGeqWT7";

type ProfileResponse = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

type GreetingHeaderProps = {
  title?: string;
  initialName?: string | null;
  initialAvatarUrl?: string | null;
  backHref?: string;
  backLabel?: string;
};

const getAvatarAlt = (name?: string | null) => {
  const trimmedName = name?.trim();
  return trimmedName ? `${trimmedName}'s avatar` : "User avatar";
};

export default function GreetingHeader({
  title = "Good morning",
  initialName = null,
  initialAvatarUrl = null,
  backHref,
  backLabel = "Back",
}: GreetingHeaderProps) {
  const [profile, setProfile] = useState<ProfileResponse | null>(
    initialName || initialAvatarUrl
      ? {
          name: initialName,
          email: "",
          avatarUrl: initialAvatarUrl,
        }
      : null,
  );

  useEffect(() => {
    if (initialName || initialAvatarUrl) {
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as ProfileResponse;
        if (isMounted) {
          setProfile(data);
        }
      } catch {
        return;
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [initialAvatarUrl, initialName]);

  const profileName = profile?.name?.trim() || null;
  const avatarUrl = profile?.avatarUrl?.trim() || defaultGreetingAvatar;

  return (
    <div className="flex items-center gap-3">
      {backHref ? (
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg transition-transform hover:bg-white active:scale-90"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
      ) : null}
      <TopAppBarAvatar
        src={avatarUrl}
        fallbackSrc={defaultGreetingAvatar}
        alt={getAvatarAlt(profileName)}
      />
      <h1 className="font-headline text-lg font-bold tracking-tight text-[#2C2F2E] dark:text-white">
        {title}
      </h1>
    </div>
  );
}
