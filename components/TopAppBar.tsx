import Link from "next/link";

type TopAppBarProps = {
  title?: string;
  avatarUrl?: string;
  fixed?: boolean;
  backHref?: string;
  backLabel?: string;
};

const defaultAvatar =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDyE81jWTjjP1Y3TEpjYlqU5ai17OBSpHm_766eJCFriLp8GfAqsSvijZ5hx_1AUKkqVpiUSHWkY0Fs0Y_VO-VfFRnFDxosdFRxy8HZ5JQYZnNghHOWNdWFh2LpsLFd4XXuDwUghMc8qXlBRMHHyCAWvvyF3gXDweHOE4P_mK2LxCrpz-aGDTbG-TnWz8zYm6-IhZ31LYEJns22pM0yeDuuej5eZKwd83eI6Z5VNHuXx18xrkLwQ1NEBAGIACCMeOYBXHFD8dGeqWT7";

export default function TopAppBar({
  title = "Good morning",
  avatarUrl = defaultAvatar,
  fixed = false,
  backHref,
  backLabel = "Back",
}: TopAppBarProps) {
  return (
    <header
      className={`${fixed ? "fixed left-0 right-0 top-0" : "sticky top-0"} z-50 bg-[#F5F7F5] transition-colors dark:bg-[#1A1C1A]`}
    >
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4">
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
          <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-container-highest">
            <img src={avatarUrl} alt="User Profile" className="h-full w-full object-cover" />
          </div>
          <h1 className="font-headline text-lg font-bold tracking-tight text-[#2C2F2E] dark:text-white">
            {title}
          </h1>
        </div>
        <button
          type="button"
          className="rounded-full p-2 transition-colors duration-200 hover:bg-[#EFF1EF] active:scale-95 dark:hover:bg-[#2C2F2E]"
        >
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed">
            notifications
          </span>
        </button>
      </div>
    </header>
  );
}
