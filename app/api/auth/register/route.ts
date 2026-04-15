import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setAuthCookie } from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsedPayload = registerSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid registration payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsedPayload.data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: parsedPayload.data.email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const response = NextResponse.json(
      {
        message: "Registration successful.",
        user,
      },
      { status: 201 },
    );

    setAuthCookie(response, user.id);
    return response;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Email is already registered." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to register user.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
