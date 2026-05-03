"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";

type ProfileResponse = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  activityLevel: ActivityLevel | null;
  targetCalories: number | null;
  bmr: number | null;
  tdee: number | null;
};

type ProfileFormState = {
  age: string;
  weight: string;
  height: string;
  activityLevel: ActivityLevel;
  targetCalories: string;
};

type ProfileEditorFormState = {
  name: string;
  avatarUrl: string;
};

type ProfileField = "age" | "weight" | "height" | "targetCalories";
type ProfileIdentityField = "name" | "avatarUrl";
type ProfileUpdateField = ProfileField | ProfileIdentityField;

type ProfileFieldErrors = Partial<Record<ProfileField, string>>;
type ProfileIdentityFieldErrors = Partial<Record<ProfileIdentityField, string>>;

type ProfileUpdateErrorResponse = {
  message?: string;
  fieldErrors?: Partial<Record<ProfileUpdateField, string[]>>;
};

type AvatarUploadResponse = {
  avatarUrl?: string;
  message?: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

const activityOptions: { value: ActivityLevel; label: string }[] = [
  { value: "SEDENTARY", label: "Sedentary" },
  { value: "LIGHT", label: "Lightly active" },
  { value: "MODERATE", label: "Moderately active" },
  { value: "ACTIVE", label: "Active" },
  { value: "VERY_ACTIVE", label: "Very active" },
];

const defaultFormState: ProfileFormState = {
  age: "",
  weight: "",
  height: "",
  activityLevel: "MODERATE",
  targetCalories: "",
};

const defaultEditorFormState: ProfileEditorFormState = {
  name: "",
  avatarUrl: "",
};

const defaultProfileAvatarUrl =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCUswIxwND0TKFz8VR3ATNy5VAtSBDXtvlVXaLmEoYbmOI4aHBNEZJb02uu1Wm6QWr2JgmIe31fqR6fFYHZTFxmKmKWYbbNkH81JiMp33BlFRsgoHaY1EKqufu4HQNfc4X4PY4PNRn143BH2QMc98_Mlf4LawW-fANEooYRwajGDCMGePFoiBc1O_omPLi5CcUY_IESfhb5abQkSK5AEKMRX3BpUjPRGt6DbsOqatsphxttqYZShD66elR6NOTqyQCa_y9FBVTa1x6E";

const maxAvatarUploadSizeBytes = 2 * 1024 * 1024;
const uploadedAvatarPathPattern = /^\/uploads\/avatars\/[A-Za-z0-9._-]+$/;

const profileValidationRanges = {
  age: { min: 10, max: 120 },
  weight: { min: 20, max: 400 },
  height: { min: 100, max: 250 },
  targetCalories: { min: 1000, max: 6000 },
} as const;

const isValidAvatarUrl = (value: string): boolean => {
  if (!value) {
    return true;
  }

  if (uploadedAvatarPathPattern.test(value)) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const getProfileDisplayName = (profile: ProfileResponse | null): string => {
  const name = profile?.name?.trim();
  if (name) {
    return name;
  }

  return profile?.email?.split("@")[0] ?? "User";
};

export default function ProfilePageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(defaultFormState);
  const [editorFormState, setEditorFormState] =
    useState<ProfileEditorFormState>(defaultEditorFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isEditorSaving, setIsEditorSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editorErrorMessage, setEditorErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [editorFieldErrors, setEditorFieldErrors] =
    useState<ProfileIdentityFieldErrors>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSaveMessage(null);
      setFieldErrors({});

      const response = await fetch("/api/profile", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load profile (${response.status})`);
      }

      const data = (await response.json()) as ProfileResponse;
      setProfile(data);
      setFormState({
        age: data.age?.toString() ?? "",
        weight: data.weight?.toString() ?? "",
        height: data.height?.toString() ?? "",
        activityLevel: data.activityLevel ?? "MODERATE",
        targetCalories: data.targetCalories?.toString() ?? "",
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  };

  const openProfileEditor = () => {
    if (!profile) {
      return;
    }

    setEditorFormState({
      name: profile.name ?? "",
      avatarUrl: profile.avatarUrl ?? "",
    });
    setEditorErrorMessage(null);
    setEditorFieldErrors({});
    setIsEditorOpen(true);
  };

  const closeProfileEditor = () => {
    if (isEditorSaving || isAvatarUploading) {
      return;
    }

    setIsEditorOpen(false);
    setEditorErrorMessage(null);
    setEditorFieldErrors({});
  };

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isEditorSaving && !isAvatarUploading) {
        setIsEditorOpen(false);
        setEditorErrorMessage(null);
        setEditorFieldErrors({});
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAvatarUploading, isEditorOpen, isEditorSaving]);

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setEditorErrorMessage(null);
    setEditorFieldErrors((previous) => ({ ...previous, avatarUrl: undefined }));

    if (!file.type.startsWith("image/")) {
      setEditorFieldErrors((previous) => ({
        ...previous,
        avatarUrl: "Please choose an image file.",
      }));
      setEditorErrorMessage("Please choose an image file.");
      input.value = "";
      return;
    }

    if (file.size > maxAvatarUploadSizeBytes) {
      setEditorFieldErrors((previous) => ({
        ...previous,
        avatarUrl: "Avatar image must be 2MB or smaller.",
      }));
      setEditorErrorMessage("Avatar image must be 2MB or smaller.");
      input.value = "";
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append("avatar", file);
    setIsAvatarUploading(true);

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: uploadFormData,
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as AvatarUploadResponse;
      if (!response.ok || !result.avatarUrl) {
        throw new Error(result.message ?? "Failed to upload avatar.");
      }

      setEditorFormState((previous) => ({
        ...previous,
        avatarUrl: result.avatarUrl ?? "",
      }));
      setToast({
        type: "success",
        message: "Avatar uploaded. Save changes to keep it.",
      });
    } catch (error) {
      setEditorErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
      setToast({
        type: "error",
        message: "Failed to upload avatar. Please try again.",
      });
    } finally {
      setIsAvatarUploading(false);
      input.value = "";
    }
  };

  const handleEditorSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextEditorFieldErrors: ProfileIdentityFieldErrors = {};
    const name = editorFormState.name.trim();
    const avatarUrl = editorFormState.avatarUrl.trim();

    if (name.length > 80) {
      nextEditorFieldErrors.name = "Name must be 80 characters or fewer.";
    }

    if (avatarUrl && !isValidAvatarUrl(avatarUrl)) {
      nextEditorFieldErrors.avatarUrl =
        "Avatar URL must be a valid http/https URL or uploaded avatar path.";
    }

    if (Object.keys(nextEditorFieldErrors).length > 0) {
      setEditorFieldErrors(nextEditorFieldErrors);
      setEditorErrorMessage("Please correct the highlighted fields.");
      return;
    }

    setIsEditorSaving(true);
    setEditorErrorMessage(null);
    setEditorFieldErrors({});

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatarUrl }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as ProfileResponse | ProfileUpdateErrorResponse;
      if (!response.ok) {
        const errorPayload = result as ProfileUpdateErrorResponse;

        if (errorPayload.fieldErrors) {
          setEditorFieldErrors({
            name: errorPayload.fieldErrors.name?.[0],
            avatarUrl: errorPayload.fieldErrors.avatarUrl?.[0],
          });
        }

        throw new Error(errorPayload.message ?? "Failed to update profile.");
      }

      const updatedProfile = result as ProfileResponse;

      setProfile(updatedProfile);
      setEditorFormState({
        name: updatedProfile.name ?? "",
        avatarUrl: updatedProfile.avatarUrl ?? "",
      });
      setIsEditorOpen(false);
      setSaveMessage(null);
      setToast({ type: "success", message: "Profile updated." });
    } catch (error) {
      setEditorErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
      setToast({
        type: "error",
        message: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsEditorSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);
    setFieldErrors({});

    try {
      const nextFieldErrors: ProfileFieldErrors = {};
      const payload: {
        age?: number;
        weight?: number;
        height?: number;
        activityLevel?: ActivityLevel;
        targetCalories?: number;
      } = {};

      if (formState.age.trim()) {
        const parsedAge = Number(formState.age);
        if (!Number.isFinite(parsedAge) || !Number.isInteger(parsedAge)) {
          nextFieldErrors.age = "Age must be a whole number.";
        } else if (
          parsedAge < profileValidationRanges.age.min ||
          parsedAge > profileValidationRanges.age.max
        ) {
          nextFieldErrors.age = `Age must be between ${profileValidationRanges.age.min} and ${profileValidationRanges.age.max}.`;
        } else {
          payload.age = Number(formState.age);
        }
      }
      if (formState.weight.trim()) {
        const parsedWeight = Number(formState.weight);
        if (!Number.isFinite(parsedWeight)) {
          nextFieldErrors.weight = "Weight must be a number.";
        } else if (
          parsedWeight < profileValidationRanges.weight.min ||
          parsedWeight > profileValidationRanges.weight.max
        ) {
          nextFieldErrors.weight = `Weight must be between ${profileValidationRanges.weight.min} and ${profileValidationRanges.weight.max} kg.`;
        } else {
          payload.weight = Number(formState.weight);
        }
      }
      if (formState.height.trim()) {
        const parsedHeight = Number(formState.height);
        if (!Number.isFinite(parsedHeight)) {
          nextFieldErrors.height = "Height must be a number.";
        } else if (
          parsedHeight < profileValidationRanges.height.min ||
          parsedHeight > profileValidationRanges.height.max
        ) {
          nextFieldErrors.height = `Height must be between ${profileValidationRanges.height.min} and ${profileValidationRanges.height.max} cm.`;
        } else {
          payload.height = Number(formState.height);
        }
      }
      if (formState.activityLevel) {
        payload.activityLevel = formState.activityLevel;
      }
      if (formState.targetCalories.trim()) {
        const parsedTargetCalories = Number(formState.targetCalories);
        if (!Number.isFinite(parsedTargetCalories) || !Number.isInteger(parsedTargetCalories)) {
          nextFieldErrors.targetCalories = "Target calories must be a whole number.";
        } else if (
          parsedTargetCalories < profileValidationRanges.targetCalories.min ||
          parsedTargetCalories > profileValidationRanges.targetCalories.max
        ) {
          nextFieldErrors.targetCalories = `Target calories must be between ${profileValidationRanges.targetCalories.min} and ${profileValidationRanges.targetCalories.max}.`;
        } else {
          payload.targetCalories = Number(formState.targetCalories);
        }
      }

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        setErrorMessage("Please correct the highlighted fields.");
        return;
      }

      if (Object.keys(payload).length === 0) {
        setErrorMessage("Please fill at least one profile field.");
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as ProfileResponse | ProfileUpdateErrorResponse;
      if (!response.ok) {
        const errorPayload = result as ProfileUpdateErrorResponse;

        if (errorPayload.fieldErrors) {
          setFieldErrors({
            age: errorPayload.fieldErrors.age?.[0],
            weight: errorPayload.fieldErrors.weight?.[0],
            height: errorPayload.fieldErrors.height?.[0],
            targetCalories: errorPayload.fieldErrors.targetCalories?.[0],
          });
        }

        throw new Error(errorPayload.message ?? "Failed to update profile.");
      }

      const updatedProfile = result as ProfileResponse;

      setProfile(updatedProfile);
      setFormState({
        age: updatedProfile.age?.toString() ?? "",
        weight: updatedProfile.weight?.toString() ?? "",
        height: updatedProfile.height?.toString() ?? "",
        activityLevel: updatedProfile.activityLevel ?? "MODERATE",
        targetCalories: updatedProfile.targetCalories?.toString() ?? "",
      });
      setFieldErrors({});
      setSaveMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsSaving(false);
    }
  };

  const profileDisplayName = getProfileDisplayName(profile);
  const profileAvatarUrl = profile?.avatarUrl?.trim() || defaultProfileAvatarUrl;
  const editorAvatarPreviewUrl = editorFormState.avatarUrl.trim() || defaultProfileAvatarUrl;

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <header className="sticky top-0 z-50 bg-[#F5F7F5]">
        <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4">
          <h1 className="font-headline text-xl font-bold tracking-tight">My Profile</h1>
          <button
            type="button"
            aria-label="Edit Profile"
            disabled={!profile || isLoading}
            onClick={openProfileEditor}
            className="rounded-full p-2 transition-colors hover:bg-surface-container-low active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-primary">edit</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-4">
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dim p-6 text-on-primary">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary-container">
              <img
                src={profileAvatarUrl}
                alt={profileDisplayName}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-extrabold">
                {profileDisplayName}
              </h2>
              <p className="text-on-primary/80">{profile?.email ?? "Loading..."}</p>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
            <p className="text-sm font-semibold text-error">{errorMessage}</p>
          </div>
        ) : null}

        {saveMessage ? (
          <div className="rounded-xl border border-primary/20 bg-primary-container/20 p-4">
            <p className="text-sm font-semibold text-primary">{saveMessage}</p>
          </div>
        ) : null}

        <section className="rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-headline text-xl font-bold">My Bookmarks</h3>
              <p className="text-sm text-on-surface-variant">
                View your saved recipes in one place.
              </p>
            </div>
            <Link
              href="/bookmarks"
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm transition-transform active:scale-95"
            >
              View
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              <div>
                <h3 className="font-headline text-xl font-bold">Recipes</h3>
                <p className="text-sm text-on-surface-variant">
                  Browse and search every recipe.
                </p>
              </div>
            </div>
            <Link
              href="/recipes"
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm transition-transform active:scale-95"
            >
              View
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">history</span>
              <div>
                <h3 className="font-headline text-xl font-bold">History</h3>
                <p className="text-sm text-on-surface-variant">
                  Recently viewed recipes.
                </p>
              </div>
            </div>
            <Link
              href="/history"
              aria-label="Open History"
              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm transition-transform active:scale-95"
            >
              View
            </Link>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-xl font-bold">Body Metrics</h3>
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              {isLoading ? "Loading..." : "Editable"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Age
              </span>
              <input
                type="number"
                value={formState.age}
                min={profileValidationRanges.age.min}
                max={profileValidationRanges.age.max}
                onChange={(event) => {
                  setFormState((previous) => ({ ...previous, age: event.target.value }));
                  setFieldErrors((previous) => ({ ...previous, age: undefined }));
                }}
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                placeholder="27"
              />
              {fieldErrors.age ? <p className="text-xs text-error">{fieldErrors.age}</p> : null}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Weight (kg)
              </span>
              <input
                type="number"
                step="0.1"
                value={formState.weight}
                min={profileValidationRanges.weight.min}
                max={profileValidationRanges.weight.max}
                onChange={(event) => {
                  setFormState((previous) => ({ ...previous, weight: event.target.value }));
                  setFieldErrors((previous) => ({ ...previous, weight: undefined }));
                }}
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                placeholder="72"
              />
              {fieldErrors.weight ? (
                <p className="text-xs text-error">{fieldErrors.weight}</p>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Height (cm)
              </span>
              <input
                type="number"
                step="0.1"
                value={formState.height}
                min={profileValidationRanges.height.min}
                max={profileValidationRanges.height.max}
                onChange={(event) => {
                  setFormState((previous) => ({ ...previous, height: event.target.value }));
                  setFieldErrors((previous) => ({ ...previous, height: undefined }));
                }}
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                placeholder="176"
              />
              {fieldErrors.height ? (
                <p className="text-xs text-error">{fieldErrors.height}</p>
              ) : null}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Activity Level
              </span>
              <select
                value={formState.activityLevel}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    activityLevel: event.target.value as ActivityLevel,
                  }))
                }
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
              >
                {activityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Target Calories (optional override)
            </span>
            <input
              type="number"
              value={formState.targetCalories}
              min={profileValidationRanges.targetCalories.min}
              max={profileValidationRanges.targetCalories.max}
              onChange={(event) => {
                setFormState((previous) => ({
                  ...previous,
                  targetCalories: event.target.value,
                }));
                setFieldErrors((previous) => ({ ...previous, targetCalories: undefined }));
              }}
              className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
              placeholder="Auto from TDEE"
            />
            {fieldErrors.targetCalories ? (
              <p className="text-xs text-error">{fieldErrors.targetCalories}</p>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-4 rounded-xl bg-primary px-5 py-3 font-bold text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
          <h3 className="font-headline text-xl font-bold">Nutrition Calculation</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-sm text-on-surface-variant">BMR</p>
              <p className="font-headline text-2xl font-extrabold text-primary">
                {profile?.bmr ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-sm text-on-surface-variant">TDEE</p>
              <p className="font-headline text-2xl font-extrabold text-primary">
                {profile?.tdee ?? 0}
              </p>
            </div>
            <div className="rounded-xl bg-primary-container/20 p-4">
              <p className="text-sm text-on-primary-container">Target Calories</p>
              <p className="font-headline text-2xl font-extrabold text-primary">
                {profile?.targetCalories ?? 0}
              </p>
            </div>
          </div>
        </section>
      </main>

      {isEditorOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-editor-title"
          onClick={closeProfileEditor}
        >
          <form
            onSubmit={handleEditorSubmit}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 text-on-surface shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-editor-title" className="font-headline text-2xl font-bold">
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Update how your profile appears in SehatMok.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close profile editor"
                disabled={isEditorSaving || isAvatarUploading}
                onClick={closeProfileEditor}
                className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4 rounded-2xl bg-surface-container-low p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-primary-container bg-surface-container">
                <img
                  src={editorAvatarPreviewUrl}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Preview
                </p>
                <p className="truncate font-headline text-lg font-bold">
                  {editorFormState.name.trim() || profileDisplayName}
                </p>
                <p className="truncate text-sm text-on-surface-variant">
                  {profile?.email ?? "Loading..."}
                </p>
              </div>
            </div>

            {editorErrorMessage ? (
              <div className="mb-4 rounded-xl border border-error/20 bg-error-container/10 p-3">
                <p className="text-sm font-semibold text-error">{editorErrorMessage}</p>
              </div>
            ) : null}

            <div className="space-y-4">
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Email
                </span>
                <input
                  type="email"
                  value={profile?.email ?? ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border-none bg-surface-container-low p-3 text-on-surface-variant focus:ring-0"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Name
                </span>
                <input
                  type="text"
                  value={editorFormState.name}
                  maxLength={80}
                  onChange={(event) => {
                    setEditorFormState((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }));
                    setEditorFieldErrors((previous) => ({ ...previous, name: undefined }));
                  }}
                  className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                  placeholder="Your name"
                />
                {editorFieldErrors.name ? (
                  <p className="text-xs text-error">{editorFieldErrors.name}</p>
                ) : null}
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Upload Avatar
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  disabled={isAvatarUploading || isEditorSaving}
                  onChange={handleAvatarFileChange}
                  className="w-full rounded-xl bg-surface-container-low p-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-bold file:text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                />
                <p className="text-xs text-on-surface-variant">
                  {isAvatarUploading
                    ? "Uploading avatar..."
                    : "PNG, JPG, GIF, or WebP. Max 2MB."}
                </p>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Avatar URL
                </span>
                <input
                  type="text"
                  inputMode="url"
                  value={editorFormState.avatarUrl}
                  disabled={isAvatarUploading}
                  onChange={(event) => {
                    setEditorFormState((previous) => ({
                      ...previous,
                      avatarUrl: event.target.value,
                    }));
                    setEditorFieldErrors((previous) => ({
                      ...previous,
                      avatarUrl: undefined,
                    }));
                  }}
                  className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                  placeholder="https://example.com/avatar.jpg"
                />
                {editorFieldErrors.avatarUrl ? (
                  <p className="text-xs text-error">{editorFieldErrors.avatarUrl}</p>
                ) : (
                  <p className="text-xs text-on-surface-variant">
                    Paste an image URL. Leave blank to use the default avatar.
                  </p>
                )}
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isEditorSaving || isAvatarUploading}
                onClick={closeProfileEditor}
                className="rounded-xl bg-surface-container-low px-5 py-3 font-bold text-on-surface transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isEditorSaving || isAvatarUploading}
                className="rounded-xl bg-primary px-5 py-3 font-bold text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEditorSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed right-4 top-20 z-[110] flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${
            toast.type === "success"
              ? "bg-primary text-on-primary"
              : "bg-error text-on-error"
          }`}
          role="status"
        >
          <span className="material-symbols-outlined">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p>{toast.message}</p>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
