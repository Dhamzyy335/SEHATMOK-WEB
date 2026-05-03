'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface RecipeManagementRecipe {
  id: string;
  name: string;
  description: string | null;
  steps: string[];
  createdBy: { id: string; name: string; email?: string };
  source: string;
  ingredients: string[];
  ingredientCount: number;
  bookmarkCount: number;
  historyCount: number;
  mealPlanCount: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  isRecommended: boolean;
  matchPercentage: number | null;
  createdDate: string;
  image?: string | null;
}

type RecipeManagementClientProps = {
  recipes: RecipeManagementRecipe[];
};

type EditFormState = {
  name: string;
  description: string;
  stepsText: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  isRecommended: boolean;
};

type ApiErrorResponse = {
  message?: string;
};

const countFormatter = new Intl.NumberFormat('en-US');

const formatCount = (value: number) => countFormatter.format(value);

const formatWholeNumber = (value: number | null) => {
  return value === null ? '-' : countFormatter.format(value);
};

const formatMacro = (value: number | null) => {
  if (value === null) {
    return '-';
  }

  const formattedValue = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${formattedValue}g`;
};

const formatDate = (dateString: string) => {
  if (dateString === '-') {
    return '-';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
};

const getRecipeInitials = (name: string) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0])
    .join('')
    .toUpperCase();

  return initials || 'R';
};

const getMatchBarClass = (matchPercentage: number) => {
  if (matchPercentage > 75) {
    return 'bg-green-500';
  }

  if (matchPercentage > 40) {
    return 'bg-amber-400';
  }

  return 'bg-red-400';
};

const getInitialEditForm = (recipe: RecipeManagementRecipe): EditFormState => ({
  name: recipe.name,
  description: recipe.description ?? '',
  stepsText: recipe.steps.join('\n'),
  calories: recipe.calories?.toString() ?? '',
  protein: recipe.protein?.toString() ?? '',
  carbs: recipe.carbs?.toString() ?? '',
  fat: recipe.fat?.toString() ?? '',
  isRecommended: recipe.isRecommended,
});

const getEmptyRecipeForm = (): EditFormState => ({
  name: '',
  description: '',
  stepsText: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  isRecommended: false,
});

const parseNumberOrNull = (value: string, fieldName: string, integer = false) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${fieldName} must be a non-negative number.`);
  }

  if (integer && !Number.isInteger(parsedValue)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  return parsedValue;
};

const sortRecipesByName = (recipes: RecipeManagementRecipe[]) => {
  return [...recipes].sort((firstRecipe, secondRecipe) =>
    firstRecipe.name.localeCompare(secondRecipe.name),
  );
};

export default function RecipeManagementClient({ recipes }: RecipeManagementClientProps) {
  const router = useRouter();
  const [managedRecipes, setManagedRecipes] = useState<RecipeManagementRecipe[]>(recipes);
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeManagementRecipe | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeManagementRecipe | null>(null);
  const [createForm, setCreateForm] = useState<EditFormState>(getEmptyRecipeForm);
  const [editForm, setEditForm] = useState<EditFormState>(getEmptyRecipeForm);
  const [deleteTarget, setDeleteTarget] = useState<RecipeManagementRecipe | null>(null);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [isDeletingRecipe, setIsDeletingRecipe] = useState(false);
  const [togglingRecipeIds, setTogglingRecipeIds] = useState<Set<string>>(new Set());
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setManagedRecipes(recipes);
  }, [recipes]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return managedRecipes;
    }

    return managedRecipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(query) ||
      recipe.createdBy.name.toLowerCase().includes(query) ||
      recipe.source.toLowerCase().includes(query) ||
      recipe.ingredients.join(' ').toLowerCase().includes(query),
    );
  }, [managedRecipes, search]);

  const applyRecipeUpdate = (updatedRecipe: RecipeManagementRecipe) => {
    setManagedRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === updatedRecipe.id ? updatedRecipe : recipe,
      ),
    );
    setSelectedRecipe((currentRecipe) =>
      currentRecipe?.id === updatedRecipe.id ? updatedRecipe : currentRecipe,
    );
    setEditingRecipe((currentRecipe) =>
      currentRecipe?.id === updatedRecipe.id ? updatedRecipe : currentRecipe,
    );
  };

  const handleOpenEdit = (recipe: RecipeManagementRecipe) => {
    setEditingRecipe(recipe);
    setEditForm(getInitialEditForm(recipe));
    setEditError(null);
  };

  const handleOpenCreate = () => {
    setCreateForm(getEmptyRecipeForm());
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateRecipe = async () => {
    const trimmedName = createForm.name.trim();
    if (!trimmedName) {
      setCreateError('Recipe name is required.');
      return;
    }

    const steps = createForm.stepsText
      .split(/\r?\n/u)
      .map((step) => step.trim())
      .filter(Boolean);

    if (steps.length === 0) {
      setCreateError('At least one instruction is required.');
      return;
    }

    setIsCreatingRecipe(true);
    setCreateError(null);

    try {
      const payload = {
        name: trimmedName,
        description: createForm.description.trim() || null,
        steps,
        calories: parseNumberOrNull(createForm.calories, 'Calories', true),
        protein: parseNumberOrNull(createForm.protein, 'Protein'),
        carbs: parseNumberOrNull(createForm.carbs, 'Carbs'),
        fat: parseNumberOrNull(createForm.fat, 'Fat'),
        isRecommended: createForm.isRecommended,
      };

      const response = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(errorPayload.message ?? 'Failed to create recipe.');
      }

      const createdRecipe = (await response.json()) as RecipeManagementRecipe;
      setManagedRecipes((currentRecipes) => sortRecipesByName([...currentRecipes, createdRecipe]));
      setIsCreateModalOpen(false);
      setCreateForm(getEmptyRecipeForm());
      router.refresh();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create recipe.');
    } finally {
      setIsCreatingRecipe(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!editingRecipe) {
      return;
    }

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError('Recipe name is required.');
      return;
    }

    setIsSavingRecipe(true);
    setEditError(null);

    try {
      const payload = {
        name: trimmedName,
        description: editForm.description.trim() || null,
        steps: editForm.stepsText
          .split(/\r?\n/u)
          .map((step) => step.trim())
          .filter(Boolean),
        calories: parseNumberOrNull(editForm.calories, 'Calories', true),
        protein: parseNumberOrNull(editForm.protein, 'Protein'),
        carbs: parseNumberOrNull(editForm.carbs, 'Carbs'),
        fat: parseNumberOrNull(editForm.fat, 'Fat'),
      };

      const response = await fetch(`/api/admin/recipes/${editingRecipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(errorPayload.message ?? 'Failed to update recipe.');
      }

      const updatedRecipe = (await response.json()) as RecipeManagementRecipe;
      applyRecipeUpdate(updatedRecipe);
      setEditingRecipe(null);
      router.refresh();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update recipe.');
    } finally {
      setIsSavingRecipe(false);
    }
  };

  const handleToggleRecommended = async (recipe: RecipeManagementRecipe) => {
    setActionError(null);
    setTogglingRecipeIds((currentIds) => {
      const nextIds = new Set(currentIds);
      nextIds.add(recipe.id);
      return nextIds;
    });

    try {
      const response = await fetch(`/api/admin/recipes/${recipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecommended: !recipe.isRecommended }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(errorPayload.message ?? 'Failed to update recommendation.');
      }

      const updatedRecipe = (await response.json()) as RecipeManagementRecipe;
      applyRecipeUpdate(updatedRecipe);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to update recommendation.',
      );
    } finally {
      setTogglingRecipeIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(recipe.id);
        return nextIds;
      });
    }
  };

  const handleDeleteRecipe = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeletingRecipe(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/admin/recipes/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorResponse;
        throw new Error(errorPayload.message ?? 'Failed to delete recipe.');
      }

      setManagedRecipes((currentRecipes) =>
        currentRecipes.filter((recipe) => recipe.id !== deleteTarget.id),
      );
      setSelectedRecipe((currentRecipe) =>
        currentRecipe?.id === deleteTarget.id ? null : currentRecipe,
      );
      setEditingRecipe((currentRecipe) =>
        currentRecipe?.id === deleteTarget.id ? null : currentRecipe,
      );
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete recipe.');
    } finally {
      setIsDeletingRecipe(false);
    }
  };

  const renderMatch = (matchPercentage: number | null) => {
    if (matchPercentage === null) {
      return <span className="text-sm font-medium text-on-surface-variant">-</span>;
    }

    const boundedMatch = Math.max(0, Math.min(100, matchPercentage));

    return (
      <div className="flex items-center justify-end gap-2">
        <div className="text-sm font-medium">{matchPercentage}%</div>
        <div className="w-24 bg-surface-container rounded-full h-2 overflow-hidden">
          <div
            style={{ width: `${boundedMatch}%` }}
            className={`h-2 ${getMatchBarClass(matchPercentage)}`}
          />
        </div>
      </div>
    );
  };

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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, creator, or ingredient..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low text-on-surface"
            />
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold whitespace-nowrap"
          >
            New Recipe
          </button>
        </div>
        {actionError ? (
          <p className="mt-3 rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
            {actionError}
          </p>
        ) : null}
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
              {filtered.length ? filtered.map((recipe) => {
                const isTogglingRecommended = togglingRecipeIds.has(recipe.id);

                return (
                  <tr key={recipe.id} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-surface-container flex items-center justify-center text-on-surface-variant font-semibold">
                          {getRecipeInitials(recipe.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-on-surface">{recipe.name}</div>
                          <div className="text-xs text-on-surface-variant">
                            {recipe.ingredients.length
                              ? `${recipe.ingredients.slice(0, 3).join(', ')}${recipe.ingredients.length > 3 ? '...' : ''}`
                              : 'No ingredients recorded'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{recipe.createdBy.name}</td>
                    <td className="px-6 py-4 text-center">{formatCount(recipe.ingredientCount)}</td>
                    <td className="px-6 py-4 text-right font-semibold">{formatWholeNumber(recipe.calories)}</td>
                    <td className="px-6 py-4 text-right">{renderMatch(recipe.matchPercentage)}</td>
                    <td className="px-6 py-4">{formatDate(recipe.createdDate)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button title="View" onClick={() => setSelectedRecipe(recipe)} className="p-2 hover:bg-surface-container/30 rounded-md">
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button title="Edit" onClick={() => handleOpenEdit(recipe)} className="p-2 hover:bg-surface-container/30 rounded-md">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          title={recipe.isRecommended ? 'Remove recommendation' : 'Recommend'}
                          onClick={() => handleToggleRecommended(recipe)}
                          disabled={isTogglingRecommended}
                          className={`p-2 rounded-md hover:bg-surface-container/30 disabled:cursor-not-allowed disabled:opacity-60 ${
                            recipe.isRecommended ? 'text-amber-600' : 'text-on-surface-variant'
                          }`}
                        >
                          <span className="material-symbols-outlined">
                            {recipe.isRecommended ? 'star' : 'star_border'}
                          </span>
                        </button>
                        <button title="Delete" onClick={() => setDeleteTarget(recipe)} className="p-2 text-error hover:bg-error-container/30 rounded-md">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">No recipes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-on-surface">New Recipe</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingRecipe}
                className="p-2 hover:bg-surface-container/30 rounded-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Title</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({ ...currentForm, name: event.target.value }))
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isCreatingRecipe}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Description</span>
                <textarea
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isCreatingRecipe}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Instructions</span>
                <textarea
                  value={createForm.stepsText}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({
                      ...currentForm,
                      stepsText: event.target.value,
                    }))
                  }
                  rows={5}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isCreatingRecipe}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Calories</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={createForm.calories}
                    onChange={(event) =>
                      setCreateForm((currentForm) => ({
                        ...currentForm,
                        calories: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isCreatingRecipe}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Protein</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={createForm.protein}
                    onChange={(event) =>
                      setCreateForm((currentForm) => ({
                        ...currentForm,
                        protein: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isCreatingRecipe}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Carbs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={createForm.carbs}
                    onChange={(event) =>
                      setCreateForm((currentForm) => ({
                        ...currentForm,
                        carbs: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isCreatingRecipe}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Fat</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={createForm.fat}
                    onChange={(event) =>
                      setCreateForm((currentForm) => ({
                        ...currentForm,
                        fat: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isCreatingRecipe}
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-lg bg-surface-container-low px-3 py-3 text-on-surface">
                <input
                  type="checkbox"
                  checked={createForm.isRecommended}
                  onChange={(event) =>
                    setCreateForm((currentForm) => ({
                      ...currentForm,
                      isRecommended: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                  disabled={isCreatingRecipe}
                />
                <span className="text-sm font-semibold">Recommended</span>
              </label>

              {createError ? (
                <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
                  {createError}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingRecipe}
                  className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRecipe}
                  disabled={isCreatingRecipe}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingRecipe ? 'Saving...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRecipe && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-on-surface">{selectedRecipe.name}</h3>
                <p className="text-sm text-on-surface-variant">
                  By {selectedRecipe.createdBy.name} - {formatDate(selectedRecipe.createdDate)}
                </p>
              </div>
              <button onClick={() => setSelectedRecipe(null)} className="p-2 hover:bg-surface-container/30 rounded-md">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold text-on-surface mb-2">Ingredients</h4>
                {selectedRecipe.ingredients.length ? (
                  <ul className="grid grid-cols-2 gap-2">
                    {selectedRecipe.ingredients.map((ingredient, index) => (
                      <li key={`${selectedRecipe.id}-${ingredient}-${index}`} className="px-3 py-2 bg-surface-container rounded-md text-on-surface">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 bg-surface-container rounded-md text-on-surface-variant">
                    No ingredients recorded.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Calories</p>
                  <p className="font-semibold text-on-surface">{formatWholeNumber(selectedRecipe.calories)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Protein</p>
                  <p className="font-semibold text-on-surface">{formatMacro(selectedRecipe.protein)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Carbs</p>
                  <p className="font-semibold text-on-surface">{formatMacro(selectedRecipe.carbs)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Fat</p>
                  <p className="font-semibold text-on-surface">{formatMacro(selectedRecipe.fat)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Bookmarks</p>
                  <p className="font-semibold text-on-surface">{formatCount(selectedRecipe.bookmarkCount)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Views</p>
                  <p className="font-semibold text-on-surface">{formatCount(selectedRecipe.historyCount)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Meal Plans</p>
                  <p className="font-semibold text-on-surface">{formatCount(selectedRecipe.mealPlanCount)}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Match</p>
                  <p className="font-semibold text-on-surface">
                    {selectedRecipe.matchPercentage === null ? '-' : `${selectedRecipe.matchPercentage}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Source</p>
                  <p className="font-semibold text-on-surface">{selectedRecipe.source}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider">Recommended</p>
                  <p className="font-semibold text-on-surface">
                    {selectedRecipe.isRecommended ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => handleToggleRecommended(selectedRecipe)}
                  disabled={togglingRecipeIds.has(selectedRecipe.id)}
                  className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {selectedRecipe.isRecommended ? 'Remove Recommend' : 'Toggle Recommend'}
                </button>
                <button onClick={() => setSelectedRecipe(null)} className="px-4 py-2 rounded-lg bg-surface-container">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingRecipe && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-on-surface">Edit Recipe</h3>
                <p className="text-sm text-on-surface-variant">{editingRecipe.name}</p>
              </div>
              <button
                onClick={() => setEditingRecipe(null)}
                disabled={isSavingRecipe}
                className="p-2 hover:bg-surface-container/30 rounded-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Title</span>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((currentForm) => ({ ...currentForm, name: event.target.value }))
                  }
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isSavingRecipe}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Description</span>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((currentForm) => ({
                      ...currentForm,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isSavingRecipe}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">Instructions</span>
                <textarea
                  value={editForm.stepsText}
                  onChange={(event) =>
                    setEditForm((currentForm) => ({
                      ...currentForm,
                      stepsText: event.target.value,
                    }))
                  }
                  rows={5}
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  disabled={isSavingRecipe}
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Calories</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editForm.calories}
                    onChange={(event) =>
                      setEditForm((currentForm) => ({
                        ...currentForm,
                        calories: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isSavingRecipe}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Protein</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editForm.protein}
                    onChange={(event) =>
                      setEditForm((currentForm) => ({
                        ...currentForm,
                        protein: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isSavingRecipe}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Carbs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editForm.carbs}
                    onChange={(event) =>
                      setEditForm((currentForm) => ({
                        ...currentForm,
                        carbs: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isSavingRecipe}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-on-surface">Fat</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editForm.fat}
                    onChange={(event) =>
                      setEditForm((currentForm) => ({
                        ...currentForm,
                        fat: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                    disabled={isSavingRecipe}
                  />
                </label>
              </div>

              {editError ? (
                <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
                  {editError}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingRecipe(null)}
                  disabled={isSavingRecipe}
                  className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecipe}
                  disabled={isSavingRecipe}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingRecipe ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-error-container text-error mx-auto mb-4">
              <span className="material-symbols-outlined">warning</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface text-center mb-2">Delete Recipe</h3>
            <p className="text-center text-on-surface-variant mb-6">
              Are you sure you want to delete {deleteTarget.name}? This action cannot be undone.
            </p>
            {deleteError ? (
              <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error mb-4">
                {deleteError}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeletingRecipe}
                className="flex-1 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecipe}
                disabled={isDeletingRecipe}
                className="flex-1 px-4 py-2 bg-error text-on-error rounded-lg font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingRecipe ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
