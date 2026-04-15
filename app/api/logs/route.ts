import { LogType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createLogSchema = z.object({
  type: z.nativeEnum(LogType),
  calories: z.coerce.number().int().nonnegative(),
  protein: z.coerce.number().nonnegative().optional(),
  carbs: z.coerce.number().nonnegative().optional(),
  fat: z.coerce.number().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();

    const typeParam = request.nextUrl.searchParams.get("type");
    const parsedType = typeParam ? z.nativeEnum(LogType).safeParse(typeParam) : null;

    if (typeParam && (!parsedType || !parsedType.success)) {
      return NextResponse.json(
        { message: "Invalid log type query parameter." },
        { status: 400 },
      );
    }

    const logs = await prisma.userLog.findMany({
      where: {
        userId,
        type: parsedType?.success ? parsedType.data : undefined,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(logs);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to fetch user logs.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();

    const payload = await request.json();
    const parsedPayload = createLogSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid log payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const log = await prisma.userLog.create({
      data: {
        userId,
        type: parsedPayload.data.type,
        calories: parsedPayload.data.calories,
        protein: parsedPayload.data.protein,
        carbs: parsedPayload.data.carbs,
        fat: parsedPayload.data.fat,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to create user log.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
