import bcrypt from "bcryptjs";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInactiveAccountMessage, verifyJwtFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeSystemLog } from "@/lib/system-logs";

const createUserSchema = z.object({
  name: z.string().trim().max(191, "Name is too long.").optional(),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
});

const getNameFromEmail = (email: string): string => {
  const localPart = email.split("@")[0] || "User";
  const spacedName = localPart.replace(/[._-]+/g, " ").trim();

  if (!spacedName) {
    return "User";
  }

  return spacedName.replace(/\b\w/g, (character) => character.toUpperCase());
};

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

  if (user.status !== UserStatus.ACTIVE) {
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

export async function POST(request: Request) {
  let adminUserId: string | undefined;

  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    adminUserId = authResult.adminUserId;

    const payload = await request.json().catch(() => ({}));
    const parsedPayload = createUserSchema.safeParse(payload);

    if (!parsedPayload.success) {
      await writeSystemLog({
        actorId: adminUserId,
        action: "CREATE_USER",
        targetType: "USER",
        message: "Failed to create user: invalid payload.",
        status: "FAILED",
      });

      return NextResponse.json(
        {
          message: "Invalid create user payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const email = parsedPayload.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      await writeSystemLog({
        actorId: adminUserId,
        action: "CREATE_USER",
        targetType: "USER",
        targetLabel: email,
        message: "Failed to create user: email is already registered.",
        status: "FAILED",
      });

      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(parsedPayload.data.password, 12);
    const createdUser = await prisma.user.create({
      data: {
        name: parsedPayload.data.name || null,
        email,
        passwordHash,
        role: parsedPayload.data.role,
        status: parsedPayload.data.status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await writeSystemLog({
      actorId: adminUserId,
      action: "CREATE_USER",
      targetType: "USER",
      targetId: createdUser.id,
      targetLabel: createdUser.email,
      message: `Created user ${createdUser.email}.`,
      status: "SUCCESS",
      metadata: {
        role: createdUser.role,
        status: createdUser.status,
      },
    });

    return NextResponse.json(
      {
        id: createdUser.id,
        name: createdUser.name ?? getNameFromEmail(createdUser.email),
        email: createdUser.email,
        registerDate: createdUser.createdAt.toISOString(),
        fridgeItems: 0,
        mealPlans: 0,
        bookmarks: 0,
        histories: 0,
        logs: 0,
        role: createdUser.role === UserRole.ADMIN ? "admin" : "user",
        status: createdUser.status.toLowerCase(),
        avatar: null,
        bio: "",
        viewedRecipes: [],
        bookmarkedRecipes: [],
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      if (adminUserId) {
        await writeSystemLog({
          actorId: adminUserId,
          action: "CREATE_USER",
          targetType: "USER",
          message: "Failed to create user: email is already registered.",
          status: "FAILED",
        });
      }

      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to create user.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
