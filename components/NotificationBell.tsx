"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DashboardSummaryNotificationSource = {
  nearExpiryItems?: unknown[];
  nearExpiryCount?: number;
  expiredCount?: number;
  activeGroceryCount?: number;
  mealPlanMissingSlots?: string[];
};

type NotificationItem = {
  id: string;
  message: string;
  href: string;
  icon: string;
};

const formatMealSlotList = (labels: string[]) => {
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
};

const buildNotifications = (
  summary: DashboardSummaryNotificationSource | null,
): NotificationItem[] => {
  if (!summary) {
    return [];
  }

  const items: NotificationItem[] = [];
  const nearExpiryCount =
    summary.nearExpiryCount ?? summary.nearExpiryItems?.length ?? 0;
  const expiredCount = summary.expiredCount ?? 0;
  const activeGroceryCount = summary.activeGroceryCount ?? 0;
  const mealPlanMissingSlots = summary.mealPlanMissingSlots ?? [];

  if (expiredCount > 0) {
    items.push({
      id: "expired-fridge",
      message: `${expiredCount} expired ingredient${
        expiredCount === 1 ? " needs" : "s need"
      } cleanup.`,
      href: "/fridge",
      icon: "delete_sweep",
    });
  }

  if (nearExpiryCount > 0) {
    items.push({
      id: "near-expiry",
      message: `${nearExpiryCount} ingredient${
        nearExpiryCount === 1 ? " is" : "s are"
      } close to expiring.`,
      href: "/fridge",
      icon: "warning",
    });
  }

  if (activeGroceryCount > 0) {
    items.push({
      id: "active-grocery",
      message: `You have ${activeGroceryCount} grocery item${
        activeGroceryCount === 1 ? "" : "s"
      } to buy.`,
      href: "/grocery",
      icon: "shopping_cart",
    });
  }

  if (mealPlanMissingSlots.length > 0) {
    items.push({
      id: "meal-plan-missing",
      message: `You still need to plan ${formatMealSlotList(mealPlanMissingSlots)}.`,
      href: "/meal-plans",
      icon: "calendar_month",
    });
  }

  return items;
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] =
    useState<DashboardSummaryNotificationSource | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notifications = useMemo(() => buildNotifications(summary), [summary]);
  const hasNotifications = notifications.length > 0;

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/dashboard/summary", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications (${response.status})`);
      }

      const data = (await response.json()) as DashboardSummaryNotificationSource;
      setSummary(data);
    } catch {
      setErrorMessage("Could not load notifications.");
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void fetchNotifications();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [fetchNotifications, isOpen]);

  return (
    <div ref={containerRef} className="relative overflow-visible">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="relative rounded-full p-2 transition-colors duration-200 hover:bg-[#EFF1EF] active:scale-95 dark:hover:bg-[#2C2F2E]"
      >
        <span className="material-symbols-outlined text-primary dark:text-primary-fixed">
          notifications
        </span>
        {hasNotifications ? (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-[#F5F7F5] dark:ring-[#1A1C1A]" />
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-[80] mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-3 shadow-xl dark:bg-[#2C2F2E]">
          <div className="px-2 pb-2">
            <p className="font-headline text-sm font-bold text-[#2C2F2E] dark:text-white">
              Notifications
            </p>
          </div>

          {errorMessage ? (
            <p className="rounded-xl px-3 py-4 text-sm text-error">{errorMessage}</p>
          ) : isLoading && !summary ? (
            <p className="rounded-xl px-3 py-4 text-sm text-on-surface-variant">
              Loading notifications...
            </p>
          ) : hasNotifications ? (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  onClick={() => setIsOpen(false)}
                  className="flex gap-3 rounded-xl px-3 py-3 text-sm text-on-surface transition-colors hover:bg-[#EFF1EF] dark:hover:bg-[#1A1C1A]"
                >
                  <span className="material-symbols-outlined mt-0.5 text-base text-primary">
                    {notification.icon}
                  </span>
                  <span className="leading-relaxed">{notification.message}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-xl px-3 py-4 text-sm text-on-surface-variant">
              No notifications right now.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
