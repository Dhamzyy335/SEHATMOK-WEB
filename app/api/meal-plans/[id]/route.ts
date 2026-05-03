import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Meal plan ID is required." }, { status: 400 });
    }

    const result = await prisma.mealPlan.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Meal plan item not found." }, { status: 404 });
    }

    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to delete meal plan item.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
