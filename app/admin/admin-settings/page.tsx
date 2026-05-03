import { redirect } from 'next/navigation';
import AdminSettingsClient, {
  type AdminSettingsProfile,
} from './AdminSettingsClient';
import { requireAdminUserId } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export default async function AdminSettingsPage() {
  const adminUserId = await requireAdminUserId();

  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      status: true,
    },
  });

  if (!admin) {
    redirect('/login');
  }

  const profile: AdminSettingsProfile = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    avatarUrl: admin.avatarUrl,
    role: admin.role,
    status: admin.status,
  };

  return <AdminSettingsClient profile={profile} />;
}
