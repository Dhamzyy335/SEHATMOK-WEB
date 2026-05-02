'use client';

import React, { useState, useMemo } from 'react';

interface Ingredient {
  id: number;
  name: string;
  icon: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function IngredientsManagementPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, name: 'Chicken Breast (Raw)', icon: 'nutrition', category: 'Proteins', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
    { id: 2, name: 'Spinach (Fresh)', icon: 'eco', category: 'Vegetables', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    { id: 3, name: 'Quinoa (Cooked)', icon: 'grain', category: 'Grains', calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9 },
    { id: 4, name: 'Eggs (Whole, Raw)', icon: 'egg_alt', category: 'Dairy & Eggs', calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Ingredient>>({});

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(ing => 
      ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ingredients, searchQuery]);

  const openModal = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingId(ingredient.id);
      setFormData(ingredient);
    } else {
      setEditingId(null);
      setFormData({ name: '', category: 'Proteins', calories: 0, protein: 0, carbs: 0, fat: 0, icon: 'restaurant' });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setIngredients(ingredients.map(ing => ing.id === editingId ? { ...ing, ...formData } as Ingredient : ing));
    } else {
      setIngredients([...ingredients, { ...formData, id: Date.now() } as Ingredient]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Ingredients Library</h2>
          <p className="text-on-surface-variant mt-1">Manage nutritional data and categorize raw ingredients.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-primary text-on-primary hover:bg-primary/90 font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add New Ingredient
        </button>
      </div>

      {/* Controls & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-outline-variant flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-lg">search</span>
          <input 
            type="text" 
            placeholder="Search ingredients..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low dark:bg-slate-800 border border-outline-variant text-on-surface rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div className="text-sm text-on-surface-variant font-semibold whitespace-nowrap">
          Showing {filteredIngredients.length} of {ingredients.length} items
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low dark:bg-slate-800/50 border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-on-surface whitespace-nowrap">Ingredient</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-on-surface whitespace-nowrap">Category</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-on-surface whitespace-nowrap text-right">Calories</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-on-surface whitespace-nowrap text-right">Protein</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-on-surface whitespace-nowrap text-right">Carbs</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-on-surface whitespace-nowrap text-right">Fat</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-on-surface whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredIngredients.map((ingredient) => (
                <tr key={ingredient.id} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container dark:bg-primary-container/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px]">{ingredient.icon}</span>
                      </div>
                      <span className="font-semibold text-on-surface">{ingredient.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-container-high dark:bg-slate-700 text-on-surface text-xs font-semibold">
                      {ingredient.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{ingredient.calories} kcal</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{ingredient.protein} g</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{ingredient.carbs} g</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{ingredient.fat} g</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(ingredient)} className="p-2 text-primary hover:bg-primary-container/30 rounded-lg transition-colors" title="Edit">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(ingredient.id)} className="p-2 text-error hover:bg-error-container/30 rounded-lg transition-colors" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold text-on-surface mb-4">
              {editingId ? 'Edit Ingredient' : 'Add New Ingredient'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">Name</label>
                <input required type="text" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">Category</label>
                <input required type="text" value={formData.category || ''} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Calories</label>
                  <input required type="number" value={formData.calories || 0} onChange={(e) => setFormData({...formData, calories: Number(e.target.value)})} className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Protein (g)</label>
                  <input required type="number" step="0.1" value={formData.protein || 0} onChange={(e) => setFormData({...formData, protein: Number(e.target.value)})} className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Carbs (g)</label>
                  <input required type="number" step="0.1" value={formData.carbs || 0} onChange={(e) => setFormData({...formData, carbs: Number(e.target.value)})} className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Fat (g)</label>
                  <input required type="number" step="0.1" value={formData.fat || 0} onChange={(e) => setFormData({...formData, fat: Number(e.target.value)})} className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold bg-surface-container-low hover:bg-surface-variant text-on-surface transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}