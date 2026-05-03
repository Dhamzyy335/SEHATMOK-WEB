import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

const imageExtensionsByMimeType: Record<string, string> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const isUploadFile = (value: FormDataEntryValue | null): value is File => {
  return typeof File !== "undefined" && value instanceof File;
};

export async function POST(request: Request) {
  try {
    await requireUserId();

    const formData = await request.formData();
    const avatar = formData.get("avatar");

    if (!isUploadFile(avatar)) {
      return NextResponse.json({ message: "Avatar image is required." }, { status: 400 });
    }

    const extension = imageExtensionsByMimeType[avatar.type];
    if (!extension) {
      return NextResponse.json(
        { message: "Avatar must be a PNG, JPG, GIF, or WebP image." },
        { status: 400 },
      );
    }

    if (avatar.size > MAX_AVATAR_SIZE_BYTES) {
      return NextResponse.json(
        { message: "Avatar must be 2MB or smaller." },
        { status: 400 },
      );
    }

    const fileName = `avatar-${Date.now()}-${randomUUID()}.${extension}`;
    const filePath = path.join(AVATAR_UPLOAD_DIR, fileName);
    const arrayBuffer = await avatar.arrayBuffer();

    await mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
    await writeFile(filePath, Buffer.from(arrayBuffer));

    return NextResponse.json({
      avatarUrl: `/uploads/avatars/${fileName}`,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to upload avatar.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
