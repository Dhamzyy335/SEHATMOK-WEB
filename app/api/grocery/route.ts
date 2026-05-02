import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionalQuantitySchema = z.preprocess(
  (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }

    return value;
  },
  z.coerce.number().positive().optional(),
);

const optionalUnitSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

const groceryItemCreateSchema = z.object({
  name: z.string().trim().min(1),
  quantity: optionalQuantitySchema,
  unit: optionalUnitSchema,
});

export async function GET() {
  try {
    const userId = await requireUserId();

    const items = await prisma.groceryItem.findMany({
      where: { userId },
      orderBy: [{ isDone: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to fetch grocery items.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = groceryItemCreateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid grocery item payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const item = await prisma.groceryItem.create({
      data: {
        userId,
        name: parsedPayload.data.name,
        quantity: parsedPayload.data.quantity,
        unit: parsedPayload.data.unit,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to create grocery item.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
