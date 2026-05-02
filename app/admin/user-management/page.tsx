'use client';

import React, { useState, useMemo } from 'react';

interface UserRecipe {
  id: number;
  name: string;
  createdDate: string;
  category: string;
  likes: number;
}

interface UserBookmark {
  id: number;
  recipeName: string;
  savedDate: string;
  category: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  registerDate: string;
  fridgeItems: number;
  generatedRecipes: number;
  bookmarks: number;
  role: 'admin' | 'user' | 'premium_user';
  status: 'active' | 'inactive' | 'suspended';
  avatar?: string;
  bio?: string;
  recipes?: UserRecipe[];
  bookmarkedRecipes?: UserBookmark[];
}

interface ModalUser extends User {
  recipes: UserRecipe[];
  bookmarkedRecipes: UserBookmark[];
}

type FilterDateRange = 'all' | 'last7days' | 'last30days' | 'last90days';
type FilterRole = 'all' | 'admin' | 'user' | 'premium_user';
type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';

export default function UserManagementPage() {
  const [selectedUser, setSelectedUser] = useState<ModalUser | null>(null);
  const [modalTab, setModalTab] = useState<'info' | 'recipes' | 'bookmarks'>('info');
  const [dateFilter, setDateFilter] = useState<FilterDateRange>('all');
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const mockUsers: User[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      registerDate: '2024-01-15',
      fridgeItems: 45,
      generatedRecipes: 12,
      bookmarks: 28,
      role: 'premium_user',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAoOjIhiryJ9zl38jJ2XEE0_GfBaTnzfNJl94Ok29HwWFIaCwC-IZgznVFlEaAbNtmsphp8cwvRqyILH-ZceBHH2VKQrhKr9wfgnli_O7o4Pi_KXjLzsbuKj8lYf05h3wLizaBtlPsngH9GaN4QbNmAiByI7ErQ0B_BAuWFpbOcVpV9muI3NhchE2U_0cFZEwGLQGjD9O2rnhW4eMv66GkPka8mOXvyY_sDVHBwN7dHiA2ISfPWM1nvRWYCjN7d65qAsbU9wm1qVDaz',
      bio: 'Fitness enthusiast and nutrition advocate',
      recipes: [
        { id: 1, name: 'Quinoa Power Bowl', createdDate: '2024-12-10', category: 'Vegan', likes: 234 },
        { id: 2, name: 'Greek Salad', createdDate: '2024-12-08', category: 'Vegetarian', likes: 156 },
      ],
      bookmarkedRecipes: [
        { id: 1, recipeName: 'Mediterranean Pasta', savedDate: '2024-12-12', category: 'Italian' },
        { id: 2, recipeName: 'Sushi Roll', savedDate: '2024-12-11', category: 'Asian' },
      ],
    },
    {
      id: 2,
      name: 'Michael Chen',
      email: 'michael.chen@example.com',
      registerDate: '2024-02-20',
      fridgeItems: 32,
      generatedRecipes: 8,
      bookmarks: 15,
      role: 'user',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcA7iQftelmYv5j8pHJ4QT1UBBBfIJ9EMMCyNKavJH8eCANeuTRI2shY2VaEhj87c2zz4xAFjpJONFUGFxCZqE93ovPhk4coG3uA7pdDZH54gTTTx-VLq-db_BTa-JUdKXK8IvMn_-dqXLFqQA6hizjwMBM0TsIoPzkJG6S945Fd77EU8yxZ0EnvXlnkoyq2w2C6Y8eQHPof0DoXBy7cOiK4_p11jwJRnwzdQl69FMs8zMEu69JdhUUZxpZ1LaSXGakxTagrTh3Rok',
      bio: 'Home chef experimenting with new cuisines',
      recipes: [
        { id: 3, name: 'Stir Fry Noodles', createdDate: '2024-12-09', category: 'Asian', likes: 89 },
      ],
      bookmarkedRecipes: [
        { id: 3, recipeName: 'Tacos Al Pastor', savedDate: '2024-12-10', category: 'Mexican' },
      ],
    },
    {
      id: 3,
      name: 'Emma Wilson',
      email: 'emma.wilson@example.com',
      registerDate: '2024-03-10',
      fridgeItems: 28,
      generatedRecipes: 5,
      bookmarks: 42,
      role: 'premium_user',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVor-6jhEN-ghDSEmBrzt0MjZVvotDdqt_uCsgFXrMrkW4VqVjbeX4cYZ_xWFGGsRH6WARTqxJodqKYqZkNCDn8w5Qy0jrgLxxp67lUfReiP1EUFUWFnvj5ahko5LcXjoBOzbWpfDraBELtW4yl3gX9WjLgZ9AuTbfLmuA4oPIkSD3wgmNWhlWAaiZCH4gGVpOUhOLZewyxIYPlQQ-XHS_UNjY_aAnxBweOsYnAZtLhNYe69c1h2_ZpoNAYTdEUVL-3-pDqqMDtv0m',
      bio: 'Vegan lifestyle blogger',
      recipes: [
        { id: 4, name: 'Vegan Brownies', createdDate: '2024-12-07', category: 'Dessert', likes: 467 },
        { id: 5, name: 'Plant-Based Burger', createdDate: '2024-12-05', category: 'Vegan', likes: 345 },
        { id: 6, name: 'Buddha Bowl', createdDate: '2024-12-03', category: 'Vegan', likes: 298 },
      ],
      bookmarkedRecipes: [
        { id: 4, recipeName: 'Hummus Wrap', savedDate: '2024-12-12', category: 'Vegan' },
        { id: 5, recipeName: 'Smoothie Bowl', savedDate: '2024-12-09', category: 'Breakfast' },
        { id: 6, recipeName: 'Falafel Salad', savedDate: '2024-12-08', category: 'Mediterranean' },
      ],
    },
    {
      id: 4,
      name: 'David Kumar',
      email: 'david.kumar@example.com',
      registerDate: '2023-11-25',
      fridgeItems: 18,
      generatedRecipes: 3,
      bookmarks: 8,
      role: 'user',
      status: 'inactive',
      bio: 'Casual home cook',
      recipes: [],
      bookmarkedRecipes: [],
    },
    {
      id: 5,
      name: 'Lisa Anderson',
      email: 'lisa.anderson@example.com',
      registerDate: '2024-04-02',
      fridgeItems: 52,
      generatedRecipes: 18,
      bookmarks: 61,
      role: 'admin',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVor-6jhEN-ghDSEmBrzt0MjZVvotDdqt_uCsgFXrMrkW4VqVjbeX4cYZ_xWFGGsRH6WARTqxJodqKYqZkNCDn8w5Qy0jrgLxxp67lUfReiP1EUFUWFnvj5ahko5LcXjoBOzbWpfDraBELtW4yl3gX9WjLgZ9AuTbfLmuA4oPIkSD3wgmNWhlWAaiZCH4gGVpOUhOLZewyxIYPlQQ-XHS_UNjY_aAnxBweOsYnAZtLhNYe69c1h2_ZpoNAYTdEUVL-3-pDqqMDtv0m',
      bio: 'Platform administrator',
      recipes: [],
      bookmarkedRecipes: [],
    },
    {
      id: 6,
      name: 'James Martinez',
      email: 'james.martinez@example.com',
      registerDate: '2024-05-18',
      fridgeItems: 35,
      generatedRecipes: 7,
      bookmarks: 19,
      role: 'user',
      status: 'suspended',
      bio: 'Temporarily suspended',
      recipes: [],
      bookmarkedRecipes: [],
    },
  ];

  const filteredUsers = useMemo(() => {
    let result = mockUsers;
    const now = new Date();

    if (dateFilter !== 'all') {
      result = result.filter((user) => {
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
  }, [dateFilter, roleFilter, statusFilter, searchTerm]);

  const handleViewDetails = (user: User) => {
    const userWithDetails: ModalUser = {
      ...user,
      recipes: user.recipes || [],
      bookmarkedRecipes: user.bookmarkedRecipes || [],
    };
    setSelectedUser(userWithDetails);
    setModalTab('info');
  };

  const handleDeleteUser = (userId: number) => {
    setDeleteConfirm(null);
    // Add delete logic here
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'premium_user':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-4xl font-bold text-on-surface mb-2">User Management</h2>
        <p className="text-lg text-on-surface-variant">Manage and monitor all platform users</p>
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
              <option value="premium_user">Premium User</option>
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
          <span className="font-semibold text-on-surface">{mockUsers.length}</span> users
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
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider text-center">Recipes</th>
                <th className="px-6 py-4 font-semibold text-on-surface uppercase text-xs tracking-wider text-center">Bookmarks</th>
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
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-semibold">
                            {user.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-on-surface">{user.name}</p>
                          <p className="text-sm text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{formatDate(user.registerDate)}</td>
                    <td className="px-6 py-4 text-center text-on-surface font-semibold">{user.fridgeItems}</td>
                    <td className="px-6 py-4 text-center text-on-surface font-semibold">{user.generatedRecipes}</td>
                    <td className="px-6 py-4 text-center text-on-surface font-semibold">{user.bookmarks}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleColor(user.role)}`}>
                        {user.role === 'premium_user' ? 'Premium' : user.role}
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
                        <button className="p-2 text-secondary hover:bg-secondary-container/30 rounded-lg transition-colors" title="Edit User">
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => setDeleteConfirm(user.id)} className="p-2 text-error hover:bg-error-container/30 rounded-lg transition-colors" title="Delete User">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">
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
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt={selectedUser.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">
                    {selectedUser.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                )}
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
              {['info', 'recipes', 'bookmarks'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab as typeof modalTab)}
                  className={`flex-1 py-3 px-4 font-semibold text-center capitalize transition-colors ${
                    modalTab === tab ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab === 'recipes' ? `Recipes (${selectedUser.recipes.length})` : ''}
                  {tab === 'bookmarks' ? `Bookmarks (${selectedUser.bookmarkedRecipes.length})` : ''}
                  {tab === 'info' ? 'User Info' : ''}
                </button>
              ))}
            </div>

            <div className="p-6">
              {modalTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Fridge Items</p>
                      <p className="text-2xl font-bold text-on-surface">{selectedUser.fridgeItems}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Recipes</p>
                      <p className="text-2xl font-bold text-on-surface">{selectedUser.generatedRecipes}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Bookmarks</p>
                      <p className="text-2xl font-bold text-on-surface">{selectedUser.bookmarks}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Member Since</p>
                      <p className="text-lg font-bold text-on-surface">{formatDate(selectedUser.registerDate)}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Role</label>
                      <p className="text-on-surface capitalize mt-1">{selectedUser.role === 'premium_user' ? 'Premium User' : selectedUser.role}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Status</label>
                      <p className={`text-on-surface capitalize mt-1`}>{selectedUser.status}</p>
                    </div>
                    {selectedUser.bio && (
                      <div>
                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Bio</label>
                        <p className="text-on-surface mt-1">{selectedUser.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {modalTab === 'recipes' && (
                <div>
                  {selectedUser.recipes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.recipes.map((recipe) => (
                        <div key={recipe.id} className="bg-surface-container-low rounded-lg p-4">
                          <h4 className="font-semibold text-on-surface">{recipe.name}</h4>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 bg-surface-container rounded text-xs text-on-surface-variant">{recipe.category}</span>
                            <span className="text-xs text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">favorite</span>{recipe.likes} likes
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-2">{formatDate(recipe.createdDate)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">restaurant_menu</span>
                      <p className="text-on-surface-variant">No recipes created yet</p>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-container text-error mx-auto mb-4">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface text-center mb-2">Delete User</h3>
            <p className="text-center text-on-surface-variant mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={() => handleDeleteUser(deleteConfirm)} className="flex-1 px-4 py-2 bg-error text-on-error rounded-lg font-semibold hover:bg-error/90 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}