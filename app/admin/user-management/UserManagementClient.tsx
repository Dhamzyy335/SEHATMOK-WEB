'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ViewedRecipe {
  id: string;
  recipeName: string;
  viewedDate: string;
  category: string;
}

interface UserBookmark {
  id: string;
  recipeName: string;
  savedDate: string;
  category: string;
}

export interface UserManagementUser {
  id: string;
  name: string;
  email: string;
  registerDate: string;
  fridgeItems: number;
  mealPlans: number;
  bookmarks: number;
  histories: number;
  logs: number;
  role: 'admin' | 'user';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string | null;
  bio?: string;
  viewedRecipes?: ViewedRecipe[];
  bookmarkedRecipes?: UserBookmark[];
}

interface ModalUser extends UserManagementUser {
  viewedRecipes: ViewedRecipe[];
  bookmarkedRecipes: UserBookmark[];
}

type FilterDateRange = 'all' | 'last7days' | 'last30days' | 'last90days';
type FilterRole = 'all' | 'admin' | 'user';
type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';

type UserManagementClientProps = {
  users: UserManagementUser[];
  initialOpenCreateModal?: boolean;
};

const countFormatter = new Intl.NumberFormat('en-US');
const rolePayloadMap = {
  admin: 'ADMIN',
  user: 'USER',
} as const;
const statusPayloadMap = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  suspended: 'SUSPENDED',
} as const;
const editStatusOptions: Array<{
  value: UserManagementUser['status'];
  label: string;
  selectedClassName: string;
}> = [
  {
    value: 'active',
    label: 'Active',
    selectedClassName:
      'border-green-500 bg-green-50 text-green-700 shadow-sm dark:border-green-400 dark:bg-green-900/30 dark:text-green-200',
  },
  {
    value: 'inactive',
    label: 'Inactive',
    selectedClassName:
      'border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-400 dark:bg-amber-900/30 dark:text-amber-200',
  },
  {
    value: 'suspended',
    label: 'Suspended',
    selectedClassName:
      'border-red-500 bg-red-50 text-red-700 shadow-sm dark:border-red-400 dark:bg-red-900/30 dark:text-red-200',
  },
];

type EditFormState = {
  role: UserManagementUser['role'];
  status: UserManagementUser['status'];
};

type CreateFormState = {
  name: string;
  email: string;
  password: string;
  role: UserManagementUser['role'];
  status: UserManagementUser['status'];
};

type ApiErrorResponse = {
  message?: string;
};

const getEmptyCreateForm = (): CreateFormState => ({
  name: '',
  email: '',
  password: '',
  role: 'user',
  status: 'active',
});

export default function UserManagementClient({
  users,
  initialOpenCreateModal = false,
}: UserManagementClientProps) {
  const router = useRouter();
  const [managedUsers, setManagedUsers] = useState<UserManagementUser[]>(users);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialOpenCreateModal);
  const [createForm, setCreateForm] = useState<CreateFormState>(getEmptyCreateForm);
  const [selectedUser, setSelectedUser] = useState<ModalUser | null>(null);
  const [editingUser, setEditingUser] = useState<UserManagementUser | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({ role: 'user', status: 'active' });
  const [modalTab, setModalTab] = useState<'info' | 'history' | 'bookmarks'>('info');
  const [dateFilter, setDateFilter] = useState<FilterDateRange>('all');
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setManagedUsers(users);
  }, [users]);

  useEffect(() => {
    if (initialOpenCreateModal) {
      setIsCreateModalOpen(true);
    }
  }, [initialOpenCreateModal]);

  const filteredUsers = useMemo(() => {
    let result = managedUsers;
    const now = new Date();

    if (dateFilter !== 'all') {
      result = result.filter((user) => {
        if (user.registerDate === '-') {
          return false;
        }

        const userDate = new Date(user.registerDate);
        const daysAgo =
          dateFilter === 'last7days' ? 7 :
          dateFilter === 'last30days' ? 30 :
          dateFilter === 'last90days' ? 90 : 0;
        const compareDate = new Date(now);
        compareDate.setDate(compareDate.getDate() - daysAgo);
        return userDate >= compareDate;
      });
    }

    if (roleFilter !== 'all') {
      result = result.filter((user) => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((user) => user.status === statusFilter);
    }

    if (searchTerm) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return result;
  }, [dateFilter, managedUsers, roleFilter, searchTerm, statusFilter]);

  const handleViewDetails = (user: UserManagementUser) => {
    const userWithDetails: ModalUser = {
      ...user,
      viewedRecipes: user.viewedRecipes || [],
      bookmarkedRecipes: user.bookmarkedRecipes || [],
    };
    setSelectedUser(userWithDetails);
    setModalTab('info');
  };

  const handleOpenEdit = (user: UserManagementUser) => {
    setEditingUser(user);
    setEditForm({
      role: user.role,
      status: user.status,
    });
    setEditError(null);
  };

  const handleOpenCreate = () => {
    setCreateForm(getEmptyCreateForm());
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseCreate = () => {
    if (isCreatingUser) {
      return;
    }

    setIsCreateModalOpen(false);
    setCreateForm(getEmptyCreateForm());
    setCreateError(null);
    router.replace('/admin/user-management');
  };

  const handleCreateUser = async () => {
    const trimmedName = createForm.name.trim();
    const trimmedEmail = createForm.email.trim();

    if (!trimmedEmail) {
      setCreateError('Email is required.');
      return;
    }

    if (!createForm.password) {
      setCreateError('Password is required.');
      return;
    }

    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }

    setIsCreatingUser(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName || undefined,
          email: trimmedEmail,
          password: createForm.password,
          role: rolePayloadMap[createForm.role],
          status: statusPayloadMap[createForm.status],
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(errorPayload.message ?? 'Failed to create user.');
      }

      const createdUser = (await response.json()) as UserManagementUser;
      setManagedUsers((currentUsers) => [createdUser, ...currentUsers]);
      setIsCreateModalOpen(false);
      setCreateForm(getEmptyCreateForm());
      router.replace('/admin/user-management');
      if (!initialOpenCreateModal) {
        router.refresh();
      }
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create user.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) {
      return;
    }

    setIsSavingUser(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: rolePayloadMap[editForm.role],
          status: statusPayloadMap[editForm.status],
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(errorPayload.message ?? 'Failed to update user.');
      }

      setManagedUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === editingUser.id
            ? { ...user, role: editForm.role, status: editForm.status }
            : user,
        ),
      );
      setSelectedUser((currentUser) =>
        currentUser?.id === editingUser.id
          ? { ...currentUser, role: editForm.role, status: editForm.status }
          : currentUser,
      );
      setEditingUser(null);
      router.refresh();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update user.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(errorPayload.message ?? 'Failed to delete user.');
      }

      setManagedUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
      setSelectedUser((currentUser) => (currentUser?.id === userId ? null : currentUser));
      setDeleteConfirm(null);
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === '-') {
      return '-';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    const initials = name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return initials || 'U';
  };

  const formatCount = (value: number) => countFormatter.format(value);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-4xl font-bold text-on-surface mb-2">User Management</h2>
          <p className="text-lg text-on-surface-variant">Manage and monitor all platform users</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary transition-colors hover:bg-primary/90"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>New User</span>
        </button>
      </div>

      {/* Controls Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-50 dark:border-slate-800">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-3 text-outline">search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Register Date</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as FilterDateRange)}
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            >
              <option value="all">All Time</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="last90days">Last 90 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as FilterRole)}
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">Regular User</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-on-surface-variant">
          Showing <span className="font-semibold text-on-surface">{filteredUsers.length}</span> of{' '}
          <span className="font-semibold text-on-surface">{managedUsers.length}</span> users
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low dark:bg-slate-800/50 border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider">User</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider">Register Date</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider text-center">Fridge Items</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider text-center">Meal Plans</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider text-center">Bookmarks</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider text-center">Logs</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider">Role</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-semibold">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface">{user.name}</p>
                          <p className="text-sm text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatDate(user.registerDate)}</td>
                    <td className="px-6 py-4 text-center text-on-surface font-semibold">{formatCount(user.fridgeItems)}</td>
                    <td className="px-6 py-4 text-center text-on-surface font-semibold">{formatCount(user.mealPlans)}</td>
                    <td className="px-6 py-4 text-center text-on-surface font-semibold">{formatCount(user.bookmarks)}</td>
                    <td className="px-6 py-4 text-center text-on-surface font-semibold">{formatCount(user.logs)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewDetails(user)} className="p-2 text-primary hover:bg-primary-container/30 rounded-lg transition-colors" title="View Details">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <button onClick={() => handleOpenEdit(user)} className="p-2 text-secondary hover:bg-secondary-container/30 rounded-lg transition-colors" title="Edit User">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirm(user.id);
                            setDeleteError(null);
                          }}
                          className="p-2 text-error hover:bg-error-container/30 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-on-surface-variant">
                    No users found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-outline-variant p-6 flex justify-between items-center z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">{selectedUser.name}</h3>
                  <p className="text-sm text-on-surface-variant">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-surface-container-low rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex border-b border-outline-variant bg-surface-container-lowest dark:bg-slate-800/30">
              {['info', 'history', 'bookmarks'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab as typeof modalTab)}
                  className={`flex-1 py-3 px-4 font-semibold text-center capitalize transition-colors ${
                    modalTab === tab ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab === 'history' ? `History (${selectedUser.histories})` : ''}
                  {tab === 'bookmarks' ? `Bookmarks (${selectedUser.bookmarks})` : ''}
                  {tab === 'info' ? 'User Info' : ''}
                </button>
              ))}
            </div>

            <div className="p-6">
              {modalTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Fridge Items</p>
                      <p className="text-2xl font-bold text-on-surface">{formatCount(selectedUser.fridgeItems)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Meal Plans</p>
                      <p className="text-2xl font-bold text-on-surface">{formatCount(selectedUser.mealPlans)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Bookmarks</p>
                      <p className="text-2xl font-bold text-on-surface">{formatCount(selectedUser.bookmarks)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Logs</p>
                      <p className="text-2xl font-bold text-on-surface">{formatCount(selectedUser.logs)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">History</p>
                      <p className="text-2xl font-bold text-on-surface">{formatCount(selectedUser.histories)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Member Since</p>
                      <p className="text-lg font-bold text-on-surface">{formatDate(selectedUser.registerDate)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Role</label>
                      <p className="text-on-surface capitalize mt-1">{selectedUser.role}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</label>
                      <p className="text-on-surface capitalize mt-1">{selectedUser.status}</p>
                    </div>
                    {selectedUser.bio ? (
                      <div>
                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Bio</label>
                        <p className="text-on-surface mt-1">{selectedUser.bio}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              {modalTab === 'history' && (
                <div>
                  {selectedUser.viewedRecipes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.viewedRecipes.map((recipe) => (
                        <div key={recipe.id} className="bg-surface-container-low rounded-lg p-4">
                          <h4 className="font-semibold text-on-surface">{recipe.recipeName}</h4>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 bg-surface-container rounded text-xs text-on-surface-variant">{recipe.category}</span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-2">Viewed {formatDate(recipe.viewedDate)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">history</span>
                      <p className="text-on-surface-variant">No history yet</p>
                    </div>
                  )}
                </div>
              )}
              {modalTab === 'bookmarks' && (
                <div>
                  {selectedUser.bookmarkedRecipes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.bookmarkedRecipes.map((bookmark) => (
                        <div key={bookmark.id} className="bg-surface-container-low rounded-lg p-4 flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-on-surface">{bookmark.recipeName}</h4>
                            <div className="flex gap-2 mt-2">
                              <span className="px-2 py-1 bg-surface-container rounded text-xs text-on-surface-variant">{bookmark.category}</span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-2">Saved {formatDate(bookmark.savedDate)}</p>
                          </div>
                          <button className="p-2 text-secondary hover:bg-secondary-container/30 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm">bookmark</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">bookmark</span>
                      <p className="text-on-surface-variant">No bookmarks yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="border-b border-outline-variant p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-on-surface">Create User</h3>
                <p className="text-sm text-on-surface-variant">Add a new platform account</p>
              </div>
              <button
                type="button"
                onClick={handleCloseCreate}
                className="p-2 hover:bg-surface-container-low rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isCreatingUser}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              className="space-y-4 p-6"
              onSubmit={(event) => {
                event.preventDefault();
                void handleCreateUser();
              }}
            >
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Name</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline"
                  placeholder="Optional"
                  disabled={isCreatingUser}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Email</span>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({
                      ...currentForm,
                      email: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline"
                  placeholder="user@example.com"
                  disabled={isCreatingUser}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Password</span>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({
                      ...currentForm,
                      password: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface placeholder:text-outline"
                  placeholder="At least 8 characters"
                  disabled={isCreatingUser}
                  minLength={8}
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Role</span>
                <select
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({
                      ...currentForm,
                      role: event.target.value as UserManagementUser['role'],
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isCreatingUser}
                >
                  <option value="user">Regular User</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-on-surface">Status</span>
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  role="group"
                  aria-label="New user status"
                >
                  {editStatusOptions.map((option) => {
                    const isSelected = createForm.status === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isCreatingUser}
                        onClick={() =>
                          setCreateForm((currentForm) => ({
                            ...currentForm,
                            status: option.value,
                          }))
                        }
                        className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? option.selectedClassName
                            : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-low dark:bg-slate-900 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {createError ? (
                <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
                  {createError}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCreate}
                  disabled={isCreatingUser}
                  className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingUser ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="border-b border-outline-variant p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-on-surface">Edit User</h3>
                <p className="text-sm text-on-surface-variant">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-surface-container-low rounded-lg transition-colors"
                disabled={isSavingUser}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Name</span>
                <input
                  type="text"
                  value={editingUser.name}
                  disabled
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant text-on-surface-variant disabled:cursor-not-allowed"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Role</span>
                <select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm((currentForm) => ({
                      ...currentForm,
                      role: event.target.value as UserManagementUser['role'],
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isSavingUser}
                >
                  <option value="admin">Admin</option>
                  <option value="user">Regular User</option>
                </select>
              </label>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-on-surface">Status</span>
                <div
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  role="group"
                  aria-label="User status"
                >
                  {editStatusOptions.map((option) => {
                    const isSelected = editForm.status === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isSavingUser}
                        onClick={() =>
                          setEditForm((currentForm) => ({
                            ...currentForm,
                            status: option.value,
                          }))
                        }
                        className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                          isSelected
                            ? option.selectedClassName
                            : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-low dark:bg-slate-900 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {editError ? (
                <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
                  {editError}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={isSavingUser}
                  className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={isSavingUser}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingUser ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-container text-error mx-auto mb-4">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface text-center mb-2">Delete User</h3>
            <p className="text-center text-on-surface-variant mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            {deleteError ? (
              <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error mb-4">
                {deleteError}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 bg-error text-on-error rounded-lg font-semibold hover:bg-error/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingUser ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
