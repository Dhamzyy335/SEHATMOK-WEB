import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const optionalQuantitySchema = z.preprocess(
  (value) => {
    if (value === "" || value === null) {
      return null;
    }

    if (value === undefined) {
      return undefined;
    }

    return value;
  },
  z.union([z.coerce.number().positive(), z.null()]).optional(),
);

const optionalUnitSchema = z.preprocess(
  (value) => {
    if (value === null) {
      return null;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.union([z.string(), z.null()]).optional(),
);

const groceryItemUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    quantity: optionalQuantitySchema,
    unit: optionalUnitSchema,
    isDone: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const existingItem = await prisma.groceryItem.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existingItem) {
      return NextResponse.json({ message: "Grocery item not found." }, { status: 404 });
    }

    const payload = await request.json().catch(() => ({}));
    const parsedPayload = groceryItemUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid grocery item payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updatedItem = await prisma.groceryItem.update({
      where: { id },
      data: {
        name: parsedPayload.data.name,
        quantity: parsedPayload.data.quantity,
        unit: parsedPayload.data.unit,
        isDone: parsedPayload.data.isDone,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to update grocery item.",
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

    const result = await prisma.groceryItem.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Grocery item not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Grocery item deleted." });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to delete grocery item.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
