import { ActivityLevel } from "@prisma/client";

const activityMultiplierMap: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export const calculateBmr = (age: number, weightKg: number, heightCm: number): number => {
  return 66.47 + 13.75 * weightKg + 5.003 * heightCm - 6.755 * age;
};

export const calculateTdee = (
  bmr: number,
  activityLevel: ActivityLevel,
): number => {
  return bmr * activityMultiplierMap[activityLevel];
};

export const calculateNutritionTargets = (profile: {
  age: number | null;
  weight: number | null;
  height: number | null;
  activityLevel: ActivityLevel | null;
}) => {
  if (
    profile.age === null ||
    profile.weight === null ||
    profile.height === null ||
    profile.activityLevel === null
  ) {
    return {
      bmr: null,
      tdee: null,
    };
  }

  const bmr = calculateBmr(profile.age, profile.weight, profile.height);
  const tdee = calculateTdee(bmr, profile.activityLevel);

  return {
    bmr,
    tdee,
  };
};
