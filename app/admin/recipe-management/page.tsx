'use client';

import React, { useState, useMemo } from 'react';

interface Recipe {
  id: number;
  name: string;
  createdBy: { id: number; name: string; email?: string };
  ingredients: string[];
  calories: number;
  matchPercentage: number;
  createdDate: string;
  recommended?: boolean;
  image?: string;
}

export default function RecipeManagementPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([
    { id: 1, name: 'Quinoa Power Bowl', createdBy: { id: 3, name: 'Emma Wilson' }, ingredients: ['Quinoa', 'Spinach', 'Chickpeas', 'Avocado'], calories: 520, matchPercentage: 92, createdDate: '2024-12-10', recommended: true },
    { id: 2, name: 'Grilled Chicken Salad', createdBy: { id: 1, name: 'Sarah Johnson' }, ingredients: ['Chicken', 'Lettuce', 'Tomato', 'Cucumber'], calories: 430, matchPercentage: 87, createdDate: '2024-11-21', recommended: false },
    { id: 3, name: 'Vegan Brownies', createdBy: { id: 3, name: 'Emma Wilson' }, ingredients: ['Cocoa', 'Almond Flour', 'Maple Syrup'], calories: 380, matchPercentage: 78, createdDate: '2024-12-07', recommended: false },
    { id: 4, name: 'Sushi Roll', createdBy: { id: 2, name: 'Michael Chen' }, ingredients: ['Rice', 'Nori', 'Salmon', 'Avocado'], calories: 310, matchPercentage: 83, createdDate: '2024-10-30', recommended: true },
    { id: 5, name: 'Mediterranean Pasta', createdBy: { id: 1, name: 'Sarah Johnson' }, ingredients: ['Pasta', 'Olive Oil', 'Tomato', 'Basil'], calories: 610, matchPercentage: 69, createdDate: '2024-09-15', recommended: false },
    { id: 6, name: 'Stir Fry Noodles', createdBy: { id: 2, name: 'Michael Chen' }, ingredients: ['Noodles', 'Soy Sauce', 'Vegetables'], calories: 450, matchPercentage: 80, createdDate: '2024-12-09', recommended: false },
  ]);

  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [recommendedSet, setRecommendedSet] = useState<Set<number>>(new Set(recipes.filter(r=>r.recommended).map(r=>r.id)));

  React.useEffect(()=>{
    setRecommendedSet(new Set(recipes.filter(r=>r.recommended).map(r=>r.id)));
  },[recipes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.createdBy.name.toLowerCase().includes(q) ||
      r.ingredients.join(' ').toLowerCase().includes(q)
    );
  }, [search, recipes]);

  const toggleRecommended = (id: number) => {
    setRecipes((prev) => prev.map(r => r.id === id ? { ...r, recommended: !r.recommended } : r));
  };

  const handleDelete = (id: number) => {
    setRecipes((prev) => prev.filter(r => r.id !== id));
    setDeleteTarget(null);
    if (selectedRecipe?.id === id) setSelectedRecipe(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">Recipe Management</h2>
        <p className="text-on-surface-variant">Review, edit, and moderate recipes.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-outline-variant shadow-sm">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-3 text-outline">search</span>
            <input
              value={search}
              onChange={(e)=>setSearch(e.target.value)}
              placeholder="Search by name, creator, or ingredient..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface"
            />
          </div>
          <button className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold whitespace-nowrap">New Recipe</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low dark:bg-slate-800/50 border-b border-outline-variant">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Recipe</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Created By</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-center">Ingredients</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-right">Calories</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-right">Match %</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Created Date</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.length ? filtered.map(recipe => (
                <tr key={recipe.id} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-surface-container flex items-center justify-center text-on-surface-variant font-semibold">
                        {recipe.name.split(' ').slice(0,2).map(s=>s[0]).join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-on-surface">{recipe.name}</div>
                        <div className="text-xs text-on-surface-variant">{recipe.ingredients.slice(0,3).join(', ')}{recipe.ingredients.length>3? '...' : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{recipe.createdBy.name}</td>
                  <td className="px-6 py-4 text-center">{recipe.ingredients.length}</td>
                  <td className="px-6 py-4 text-right font-semibold">{recipe.calories}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="text-sm font-medium">{recipe.matchPercentage}%</div>
                      <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden">
                        <div style={{width: `${Math.max(0, Math.min(100, recipe.matchPercentage))}%`}} className={`h-2 ${recipe.matchPercentage>75? 'bg-green-500' : recipe.matchPercentage>40? 'bg-amber-400' : 'bg-red-400'}`}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{formatDate(recipe.createdDate)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button title="View" onClick={()=>setSelectedRecipe(recipe)} className="p-2 hover:bg-surface-container/30 rounded-md">
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                      <button title="Edit" className="p-2 hover:bg-surface-container/30 rounded-md">
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button title="Recommend" onClick={()=>toggleRecommended(recipe.id)} className={`p-2 rounded-md ${recommendedSet.has(recipe.id) ? 'text-amber-600' : 'text-on-surface-variant'} hover:bg-surface-container/30`}>
                        <span className={`material-symbols-outlined`}>{recommendedSet.has(recipe.id) ? 'star' : 'star_border'}</span>
                      </button>
                      <button title="Delete" onClick={()=>setDeleteTarget(recipe.id)} className="p-2 text-error hover:bg-error-container/30 rounded-md">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">No recipes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-on-surface">{selectedRecipe.name}</h3>
                <p className="text-sm text-on-surface-variant">By {selectedRecipe.createdBy.name} • {formatDate(selectedRecipe.createdDate)}</p>
              </div>
              <button onClick={()=>setSelectedRecipe(null)} className="p-2 hover:bg-surface-container/30 rounded-md"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-on-surface mb-2">Ingredients</h4>
                <ul className="grid grid-cols-2 gap-2">
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="px-3 py-2 bg-surface-container rounded-md text-on-surface">{ing}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Calories</p>
                  <p className="font-semibold text-on-surface">{selectedRecipe.calories}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Match</p>
                  <p className="font-semibold text-on-surface">{selectedRecipe.matchPercentage}%</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Recommended</p>
                  <p className="font-semibold text-on-surface">{selectedRecipe.recommended ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={()=>{toggleRecommended(selectedRecipe.id); setSelectedRecipe(prev=> prev? {...prev, recommended: !prev.recommended} : prev)}} className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800">Toggle Recommend</button>
                <button onClick={()=>setSelectedRecipe(null)} className="px-4 py-2 rounded-lg bg-surface-container">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-container text-error mx-auto mb-4">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface text-center mb-2">Delete Recipe</h3>
            <p className="text-center text-on-surface-variant mb-6">Are you sure you want to delete this recipe? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteTarget(null)} className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold">Cancel</button>
              <button onClick={()=>handleDelete(deleteTarget)} className="flex-1 px-4 py-2 bg-error text-on-error rounded-lg font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}