import React from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdminUserId } from '@/lib/admin-auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUserId();

  return <AdminShell>{children}</AdminShell>;
}
