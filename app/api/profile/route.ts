import { ActivityLevel } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { calculateNutritionTargets } from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";

const uploadedAvatarPathPattern = /^\/uploads\/avatars\/[A-Za-z0-9._-]+$/;

const isValidAvatarUrl = (value: string): boolean => {
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

const profileUpdateSchema = z
  .object({
    name: z.string().trim().max(80, "Name must be 80 characters or fewer.").optional(),
    avatarUrl: z
      .string()
      .trim()
      .max(2048, "Avatar URL must be 2048 characters or fewer.")
      .optional()
      .refine((value) => value === undefined || value === "" || isValidAvatarUrl(value), {
        message: "Avatar URL must be a valid http/https URL or uploaded avatar path.",
      }),
    age: z.coerce.number().int().min(10).max(120).optional(),
    weight: z.coerce.number().min(20).max(400).optional(),
    height: z.coerce.number().min(100).max(250).optional(),
    activityLevel: z.nativeEnum(ActivityLevel).optional(),
    targetCalories: z.coerce.number().int().min(1000).max(6000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export async function GET() {
  try {
    const userId = await requireUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        age: true,
        weight: true,
        height: true,
        activityLevel: true,
        targetCalories: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const { bmr, tdee } = calculateNutritionTargets({
      age: user.age,
      weight: user.weight,
      height: user.height,
      activityLevel: user.activityLevel,
    });

    return NextResponse.json({
      ...user,
      bmr: bmr === null ? null : Math.round(bmr),
      tdee: tdee === null ? null : Math.round(tdee),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to fetch profile.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireUserId();

    const payload = await request.json();
    const parsedPayload = profileUpdateSchema.safeParse(payload);
    if (!parsedPayload.success) {
      const flattened = parsedPayload.error.flatten();

      return NextResponse.json(
        {
          message: "Invalid profile payload.",
          fieldErrors: flattened.fieldErrors,
          formErrors: flattened.formErrors,
        },
        { status: 400 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        age: true,
        weight: true,
        height: true,
        activityLevel: true,
        targetCalories: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const mergedProfile = {
      age: parsedPayload.data.age ?? currentUser.age,
      weight: parsedPayload.data.weight ?? currentUser.weight,
      height: parsedPayload.data.height ?? currentUser.height,
      activityLevel: parsedPayload.data.activityLevel ?? currentUser.activityLevel,
    };

    const { bmr, tdee } = calculateNutritionTargets(mergedProfile);
    const hasMetricInput =
      parsedPayload.data.age !== undefined ||
      parsedPayload.data.weight !== undefined ||
      parsedPayload.data.height !== undefined ||
      parsedPayload.data.activityLevel !== undefined;
    const computedTargetCalories =
      parsedPayload.data.targetCalories ??
      (hasMetricInput && tdee !== null ? Math.round(tdee) : undefined);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name:
          parsedPayload.data.name === undefined
            ? undefined
            : parsedPayload.data.name || null,
        avatarUrl:
          parsedPayload.data.avatarUrl === undefined
            ? undefined
            : parsedPayload.data.avatarUrl || null,
        age: parsedPayload.data.age,
        weight: parsedPayload.data.weight,
        height: parsedPayload.data.height,
        activityLevel: parsedPayload.data.activityLevel,
        targetCalories: computedTargetCalories,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        age: true,
        weight: true,
        height: true,
        activityLevel: true,
        targetCalories: true,
      },
    });

    return NextResponse.json({
      ...updatedUser,
      bmr: bmr === null ? null : Math.round(bmr),
      tdee: tdee === null ? null : Math.round(tdee),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to update profile.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  return PUT(request);
}
