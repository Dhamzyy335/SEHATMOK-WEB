import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInactiveAccountMessage, verifyJwtFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeSystemLog } from "@/lib/system-logs";

const userUpdateSchema = z
  .object({
    role: z.nativeEnum(UserRole).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
  });

const getAdminUserId = async () => {
  const userId = await verifyJwtFromCookies();

  if (!userId) {
    return {
      response: NextResponse.json({ message: "Unauthorized." }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    return {
      response: NextResponse.json({ message: "Unauthorized." }, { status: 401 }),
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      response: NextResponse.json(
        { message: getInactiveAccountMessage(user.status) },
        { status: 403 },
      ),
    };
  }

  if (user.role !== UserRole.ADMIN) {
    return {
      response: NextResponse.json({ message: "Forbidden." }, { status: 403 }),
    };
  }

  return { adminUserId: user.id };
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = userUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "UPDATE_USER",
        targetType: "USER",
        targetId: id,
        message: "Failed to update user: invalid payload.",
        status: "FAILED",
      });

      return NextResponse.json(
        {
          message: "Invalid user update payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "UPDATE_USER",
        targetType: "USER",
        targetId: id,
        message: "Failed to update user: user not found.",
        status: "FAILED",
      });

      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: parsedPayload.data.role,
        status: parsedPayload.data.status,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action: "UPDATE_USER",
      targetType: "USER",
      targetId: updatedUser.id,
      targetLabel: updatedUser.email,
      message: `Updated user ${updatedUser.email}.`,
      status: "SUCCESS",
      metadata: {
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to update user.",
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
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;

    if (id === authResult.adminUserId) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "DELETE_USER",
        targetType: "USER",
        targetId: id,
        message: "Failed to delete user: admin cannot delete their own account.",
        status: "FAILED",
      });

      return NextResponse.json(
        { message: "You cannot delete your own admin account." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "DELETE_USER",
        targetType: "USER",
        targetId: id,
        message: "Failed to delete user: user not found.",
        status: "FAILED",
      });

      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.fridgeItem.deleteMany({ where: { userId: id } }),
      prisma.userLog.deleteMany({ where: { userId: id } }),
      prisma.bookmark.deleteMany({ where: { userId: id } }),
      prisma.history.deleteMany({ where: { userId: id } }),
      prisma.mealPlan.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action: "DELETE_USER",
      targetType: "USER",
      targetId: existingUser.id,
      targetLabel: existingUser.email,
      message: `Deleted user ${existingUser.email}.`,
      status: "SUCCESS",
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to delete user.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
