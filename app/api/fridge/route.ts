import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const fridgeItemCreateSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1),
  expiryDate: z.union([z.string().datetime(), z.null()]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const status = request.nextUrl.searchParams.get("status")?.trim().toLowerCase();
    const isNearExpiry = status === "near-expiry";

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    const items = await prisma.fridgeItem.findMany({
      where: isNearExpiry
        ? {
            userId,
            expiryDate: {
              not: null,
              lt: end,
            },
          }
        : { userId },
      orderBy: isNearExpiry
        ? [{ expiryDate: "asc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to fetch fridge items.",
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
    const parsedPayload = fridgeItemCreateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid fridge item payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const item = await prisma.fridgeItem.create({
      data: {
        userId,
        name: parsedPayload.data.name,
        category: parsedPayload.data.category,
        quantity: parsedPayload.data.quantity,
        unit: parsedPayload.data.unit,
        expiryDate: parsedPayload.data.expiryDate
          ? new Date(parsedPayload.data.expiryDate)
          : null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to create fridge item.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
