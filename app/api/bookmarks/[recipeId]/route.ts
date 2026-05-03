import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { recipeId } = await params;

    if (!recipeId) {
      return NextResponse.json(
        { message: "Recipe ID is required." },
        { status: 400 },
      );
    }

    await prisma.bookmark.deleteMany({
      where: { userId, recipeId },
    });

    return NextResponse.json({ recipeId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to remove bookmark.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
