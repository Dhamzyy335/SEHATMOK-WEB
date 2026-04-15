"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: "/" | "/fridge" | "/ai-recipe" | "/profile";
  label: "Home" | "Fridge" | "AI Recipe" | "Profile";
  icon: "home" | "kitchen" | "auto_awesome" | "person";
};

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/fridge", label: "Fridge", icon: "kitchen" },
  { href: "/ai-recipe", label: "AI Recipe", icon: "auto_awesome" },
  { href: "/profile", label: "Profile", icon: "person" },
];

const isActiveRoute = (pathname: string, href: NavItem["href"]): boolean => {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/ai-recipe") {
    return pathname.startsWith("/ai-recipe") || pathname.startsWith("/recipes");
  }
  return pathname.startsWith(href);
};

export default function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-evenly rounded-t-[1.5rem] bg-white/80 px-4 pb-8 pt-3 shadow-[0_-8px_24px_rgba(44,47,46,0.06)] backdrop-blur-xl dark:bg-[#1A1C1A]/80">
      {navItems.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "flex flex-col items-center justify-center rounded-[1.25rem] bg-primary px-5 py-2 text-white transition-all duration-300 active:scale-90"
                : "flex flex-col items-center justify-center px-5 py-2 text-on-surface/50 transition-all duration-300 hover:text-primary active:scale-90 dark:text-white/40"
            }
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: isActive ? "\"FILL\" 1" : "\"FILL\" 0" }}
            >
              {item.icon}
            </span>
            <span className="mt-1 font-label text-[11px] font-semibold uppercase tracking-widest">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
