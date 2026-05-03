import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const fridgeItemUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    quantity: z.coerce.number().positive().optional(),
    unit: z.string().trim().min(1).optional(),
    expiryDate: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();

    const { id } = await params;
    const existingItem = await prisma.fridgeItem.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existingItem) {
      return NextResponse.json({ message: "Fridge item not found." }, { status: 404 });
    }

    const payload = await request.json();
    const parsedPayload = fridgeItemUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid fridge item payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updatedItem = await prisma.fridgeItem.update({
      where: { id },
      data: {
        name: parsedPayload.data.name,
        category: parsedPayload.data.category,
        quantity: parsedPayload.data.quantity,
        unit: parsedPayload.data.unit,
        expiryDate:
          parsedPayload.data.expiryDate === undefined
            ? undefined
            : parsedPayload.data.expiryDate
              ? new Date(parsedPayload.data.expiryDate)
              : null,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to update fridge item.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();

    const { id } = await params;
    const existingItem = await prisma.fridgeItem.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existingItem) {
      return NextResponse.json({ message: "Fridge item not found." }, { status: 404 });
    }

    await prisma.fridgeItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Fridge item deleted." });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to delete fridge item.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
