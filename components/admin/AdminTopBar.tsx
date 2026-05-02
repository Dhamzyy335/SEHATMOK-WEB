'use client';

type AdminTopBarProps = {
  onMenuClick: () => void;
};

export default function AdminTopBar({ onMenuClick }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white lg:hidden"
        aria-label="Open admin navigation"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      <div className="hidden lg:block">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Admin Console</p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Admin</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">SehatMok-Web</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          A
        </div>
      </div>
    </header>
  );
}
