import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getInactiveAccountMessage, verifyJwtFromCookies } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeSystemLog } from '@/lib/system-logs';

const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
    confirmNewPassword: z.string().min(8, 'Please confirm your new password.'),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    path: ['confirmNewPassword'],
    message: 'Password confirmation does not match.',
  });

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

export async function PATCH(request: Request) {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const payload = await request.json().catch(() => ({}));
    const parsedPayload = passwordUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: 'Invalid password payload.',
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: authResult.adminUserId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ message: 'Admin user not found.' }, { status: 404 });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      parsedPayload.data.currentPassword,
      admin.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect.' },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsedPayload.data.newPassword, 12);

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        passwordHash,
      },
      select: {
        id: true,
      },
    });

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action: 'CHANGE_ADMIN_PASSWORD',
      targetType: 'USER',
      targetId: admin.id,
      targetLabel: admin.email,
      message: `Changed admin password for ${admin.email}.`,
      status: 'SUCCESS',
    });

    return NextResponse.json({ message: 'Password changed successfully.' });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Failed to change admin password.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
