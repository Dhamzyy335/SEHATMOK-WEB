import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getInactiveAccountMessage, verifyJwtFromCookies } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeSystemLog } from '@/lib/system-logs';

const nullableTrimmedString = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.union([z.string().trim().max(maxLength), z.null()]).optional(),
  );

const nullableAvatarUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([z.string().trim().url().max(2048), z.null()]).optional(),
);

const adminProfileUpdateSchema = z
  .object({
    name: nullableTrimmedString(191),
    avatarUrl: nullableAvatarUrl,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required for update.',
  });

const adminProfileSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  status: true,
} as const;

const getAdminUserId = async () => {
  const userId = await verifyJwtFromCookies();

  if (!userId) {
    return {
      response: NextResponse.json({ message: 'Unauthorized.' }, { status: 401 }),
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
      response: NextResponse.json({ message: 'Unauthorized.' }, { status: 401 }),
    };
  }

  if (user.status !== 'ACTIVE') {
    return {
      response: NextResponse.json(
        { message: getInactiveAccountMessage(user.status) },
        { status: 403 },
      ),
    };
  }

  if (user.role !== UserRole.ADMIN) {
    return {
      response: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }),
    };
  }

  return { adminUserId: user.id };
};

export async function GET() {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.adminUserId },
      select: adminProfileSelect,
    });

    if (!user) {
      return NextResponse.json({ message: 'Admin user not found.' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Failed to fetch admin settings.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const payload = await request.json().catch(() => ({}));
    const parsedPayload = adminProfileUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: 'UPDATE_ADMIN_PROFILE',
        targetType: 'USER',
        targetId: authResult.adminUserId,
        message: 'Failed to update admin profile: invalid payload.',
        status: 'FAILED',
      });

      return NextResponse.json(
        {
          message: 'Invalid admin profile payload.',
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: authResult.adminUserId },
      data: {
        name: parsedPayload.data.name,
        avatarUrl: parsedPayload.data.avatarUrl,
      },
      select: adminProfileSelect,
    });

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action: 'UPDATE_ADMIN_PROFILE',
      targetType: 'USER',
      targetId: updatedUser.id,
      targetLabel: updatedUser.email,
      message: `Updated admin profile ${updatedUser.email}.`,
      status: 'SUCCESS',
    });

    return NextResponse.json({
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Failed to update admin profile.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
