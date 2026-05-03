'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type AdminSettingsProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
};

type AdminSettingsClientProps = {
  profile: AdminSettingsProfile;
};

type ApiMessageResponse = {
  message?: string;
  user?: AdminSettingsProfile;
};

type ProfileFormState = {
  name: string;
  avatarUrl: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

const getInitialProfileForm = (profile: AdminSettingsProfile): ProfileFormState => ({
  name: profile.name ?? '',
  avatarUrl: profile.avatarUrl ?? '',
});

const emptyPasswordForm: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};

const statusStyles: Record<AdminSettingsProfile['status'], string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  INACTIVE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  SUSPENDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const roleStyles: Record<AdminSettingsProfile['role'], string> = {
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  USER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const getDisplayName = (profile: AdminSettingsProfile) => {
  const trimmedName = profile.name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  return profile.email.split('@')[0] || 'Admin';
};

const getInitials = (value: string) => {
  const initials = value
    .split(/[.\s_-]+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'A';
};

const hasUsableAvatarUrl = (value: string | null) => {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function AdminSettingsClient({ profile }: AdminSettingsClientProps) {
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() =>
    getInitialProfileForm(profile),
  );
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentProfile(profile);
    setProfileForm(getInitialProfileForm(profile));
  }, [profile]);

  const displayName = useMemo(() => getDisplayName(currentProfile), [currentProfile]);
  const avatarUrl = profileForm.avatarUrl.trim() || currentProfile.avatarUrl;
  const canPreviewAvatar = hasUsableAvatarUrl(avatarUrl);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          avatarUrl: profileForm.avatarUrl,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as ApiMessageResponse;

      if (!response.ok || !result.user) {
        throw new Error(result.message ?? 'Failed to update profile.');
      }

      setCurrentProfile(result.user);
      setProfileForm(getInitialProfileForm(result.user));
      setProfileMessage(result.message ?? 'Profile updated.');
      router.refresh();
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError('Password confirmation does not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/admin/settings/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });

      const result = (await response.json().catch(() => ({}))) as ApiMessageResponse;

      if (!response.ok) {
        throw new Error(result.message ?? 'Failed to change password.');
      }

      setPasswordForm(emptyPasswordForm);
      setPasswordMessage(result.message ?? 'Password changed.');
      router.refresh();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">Admin Settings</h2>
        <p className="text-on-surface-variant">Manage your admin profile and password.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xl font-bold">
              {canPreviewAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl ?? ''}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-on-surface truncate">{displayName}</p>
              <p className="text-sm text-on-surface-variant truncate">{currentProfile.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${roleStyles[currentProfile.role]}`}>
                  {currentProfile.role}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[currentProfile.status]}`}>
                  {currentProfile.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Email
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface break-all">
                {currentProfile.email}
              </p>
            </div>
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Avatar URL
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface break-all">
                {currentProfile.avatarUrl ?? '-'}
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleProfileSubmit}
          className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-on-surface">Profile Settings</h3>
              <p className="text-sm text-on-surface-variant">
                Update the public profile details for your admin account.
              </p>
            </div>
            <span className="material-symbols-outlined text-primary">manage_accounts</span>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-on-surface">Name</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) =>
                  setProfileForm((currentForm) => ({
                    ...currentForm,
                    name: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                placeholder="Admin name"
                disabled={isSavingProfile}
                maxLength={191}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-on-surface">Avatar URL</span>
              <input
                type="url"
                value={profileForm.avatarUrl}
                onChange={(event) =>
                  setProfileForm((currentForm) => ({
                    ...currentForm,
                    avatarUrl: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                placeholder="https://example.com/avatar.jpg"
                disabled={isSavingProfile}
                maxLength={2048}
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-on-surface">Role</span>
              <input
                type="text"
                value={currentProfile.role}
                disabled
                className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant text-on-surface-variant disabled:cursor-not-allowed"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-on-surface">Status</span>
              <input
                type="text"
                value={currentProfile.status}
                disabled
                className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant text-on-surface-variant disabled:cursor-not-allowed"
              />
            </label>
          </div>

          {profileMessage ? (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              {profileMessage}
            </p>
          ) : null}
          {profileError ? (
            <p className="mt-4 rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
              {profileError}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <form
        onSubmit={handlePasswordSubmit}
        className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-on-surface">Password</h3>
            <p className="text-sm text-on-surface-variant">
              Change the password for the currently signed-in admin account.
            </p>
          </div>
          <span className="material-symbols-outlined text-primary">lock_reset</span>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-on-surface">Current Password</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((currentForm) => ({
                  ...currentForm,
                  currentPassword: event.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
              autoComplete="current-password"
              disabled={isChangingPassword}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-on-surface">New Password</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((currentForm) => ({
                  ...currentForm,
                  newPassword: event.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
              autoComplete="new-password"
              disabled={isChangingPassword}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-on-surface">Confirm New Password</span>
            <input
              type="password"
              value={passwordForm.confirmNewPassword}
              onChange={(event) =>
                setPasswordForm((currentForm) => ({
                  ...currentForm,
                  confirmNewPassword: event.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
              autoComplete="new-password"
              disabled={isChangingPassword}
            />
          </label>
        </div>

        {passwordMessage ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            {passwordMessage}
          </p>
        ) : null}
        {passwordError ? (
          <p className="mt-4 rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
            {passwordError}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
