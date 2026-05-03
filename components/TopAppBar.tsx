import GreetingHeader from "@/components/GreetingHeader";
import NotificationBell from "@/components/NotificationBell";

type TopAppBarProps = {
  title?: string;
  avatarUrl?: string | null;
  avatarName?: string | null;
  fixed?: boolean;
  backHref?: string;
  backLabel?: string;
};

export default function TopAppBar({
  title = "Good morning",
  avatarUrl = null,
  avatarName = null,
  fixed = false,
  backHref,
  backLabel = "Back",
}: TopAppBarProps) {
  return (
    <header
      className={`${fixed ? "fixed left-0 right-0 top-0" : "sticky top-0"} z-50 bg-[#F5F7F5] transition-colors dark:bg-[#1A1C1A]`}
    >
      <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4">
        <GreetingHeader
          title={title}
          initialName={avatarName}
          initialAvatarUrl={avatarUrl}
          backHref={backHref}
          backLabel={backLabel}
        />
        <NotificationBell />
      </div>
    </header>
  );
}
