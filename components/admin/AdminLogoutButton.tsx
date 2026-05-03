'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AdminLogoutButtonProps = {
  onLogout?: () => void;
};

export default function AdminLogoutButton({ onLogout }: AdminLogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      onLogout?.();
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
    >
      <span className="material-symbols-outlined text-xl">
        {isLoggingOut ? 'hourglass_top' : 'logout'}
      </span>
      <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
    </button>
  );
}
