"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";

type ProfileResponse = {
  id: string;
  email: string;
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

type ProfileField = "age" | "weight" | "height" | "targetCalories";

type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

type ProfileUpdateErrorResponse = {
  message?: string;
  fieldErrors?: Partial<Record<ProfileField, string[]>>;
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

const profileValidationRanges = {
  age: { min: 10, max: 120 },
  weight: { min: 20, max: 400 },
  height: { min: 100, max: 250 },
  targetCalories: { min: 1000, max: 6000 },
} as const;

export default function ProfilePageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(defaultFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

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

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <header className="sticky top-0 z-50 bg-[#F5F7F5]">
        <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between px-6 py-4">
          <h1 className="font-headline text-xl font-bold tracking-tight">My Profile</h1>
          <button
            type="button"
            className="rounded-full p-2 transition-colors hover:bg-surface-container-low active:scale-95"
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
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUswIxwND0TKFz8VR3ATNy5VAtSBDXtvlVXaLmEoYbmOI4aHBNEZJb02uu1Wm6QWr2JgmIe31fqR6fFYHZTFxmKmKWYbbNkH81JiMp33BlFRsgoHaY1EKqufu4HQNfc4X4PY4PNRn143BH2QMc98_Mlf4LawW-fANEooYRwajGDCMGePFoiBc1O_omPLi5CcUY_IESfhb5abQkSK5AEKMRX3BpUjPRGt6DbsOqatsphxttqYZShD66elR6NOTqyQCa_y9FBVTa1x6E"
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-headline text-2xl font-extrabold">
                {profile?.email?.split("@")[0] ?? "User"}
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
            className="rounded-xl bg-primary px-5 py-3 font-bold text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
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

      <BottomNav />
    </div>
  );
}
