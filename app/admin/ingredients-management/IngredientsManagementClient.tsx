'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type IngredientsManagementIngredient = {
  id: string;
  name: string;
  icon: string;
  category: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  recipeCount: number;
};

type IngredientsManagementClientProps = {
  ingredients: IngredientsManagementIngredient[];
};

type IngredientFormState = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

type IngredientMutationResponse = {
  message?: string;
};

const emptyFormState: IngredientFormState = {
  name: '',
  calories: '0',
  protein: '0',
  carbs: '0',
  fat: '0',
};

const formatNumber = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '-';
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};

const toFormState = (ingredient: IngredientsManagementIngredient): IngredientFormState => ({
  name: ingredient.name,
  calories: ingredient.calories?.toString() ?? '0',
  protein: ingredient.protein?.toString() ?? '0',
  carbs: ingredient.carbs?.toString() ?? '0',
  fat: ingredient.fat?.toString() ?? '0',
});

const parseNutritionValue = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return Number(trimmedValue);
};

export default function IngredientsManagementClient({
  ingredients,
}: IngredientsManagementClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] =
    useState<IngredientsManagementIngredient | null>(null);
  const [formData, setFormData] = useState<IngredientFormState>(emptyFormState);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIngredient, setDeletingIngredient] =
    useState<IngredientsManagementIngredient | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredIngredients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return ingredients;
    }

    return ingredients.filter(
      (ingredient) =>
        ingredient.name.toLowerCase().includes(query) ||
        ingredient.category.toLowerCase().includes(query),
    );
  }, [ingredients, searchQuery]);

  const openModal = (ingredient?: IngredientsManagementIngredient) => {
    setEditingIngredient(ingredient ?? null);
    setFormData(ingredient ? toFormState(ingredient) : emptyFormState);
    setModalErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingIngredient(null);
    setModalErrorMessage(null);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = formData.name.trim();
    const calories = parseNutritionValue(formData.calories);
    const protein = parseNutritionValue(formData.protein);
    const carbs = parseNutritionValue(formData.carbs);
    const fat = parseNutritionValue(formData.fat);

    if (!name) {
      setModalErrorMessage('Name is required.');
      return;
    }

    const nutritionValues = [calories, protein, carbs, fat];
    if (
      nutritionValues.some(
        (value) => value !== null && (!Number.isFinite(value) || value < 0),
      )
    ) {
      setModalErrorMessage('Nutrition values must be zero or greater.');
      return;
    }

    try {
      setIsSaving(true);
      setModalErrorMessage(null);

      const response = await fetch(
        editingIngredient
          ? `/api/admin/ingredients/${editingIngredient.id}`
          : '/api/admin/ingredients',
        {
          method: editingIngredient ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            calories,
            protein,
            carbs,
            fat,
          }),
        },
      );

      const result = (await response
        .json()
        .catch(() => null)) as IngredientMutationResponse | null;

      if (!response.ok) {
        throw new Error(
          result?.message ??
            (editingIngredient
              ? 'Failed to update ingredient.'
              : 'Failed to create ingredient.'),
        );
      }

      setIsModalOpen(false);
      setEditingIngredient(null);
      router.refresh();
    } catch (error) {
      setModalErrorMessage(error instanceof Error ? error.message : 'Unexpected error.');
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (ingredient: IngredientsManagementIngredient) => {
    setDeletingIngredient(ingredient);
    setDeleteErrorMessage(null);
  };

  const closeDeleteModal = () => {
    if (isDeleting) {
      return;
    }

    setDeletingIngredient(null);
    setDeleteErrorMessage(null);
  };

  const handleDelete = async () => {
    if (!deletingIngredient) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteErrorMessage(null);

      const response = await fetch(`/api/admin/ingredients/${deletingIngredient.id}`, {
        method: 'DELETE',
      });

      const result = (await response
        .json()
        .catch(() => null)) as IngredientMutationResponse | null;

      if (!response.ok) {
        throw new Error(result?.message ?? 'Failed to delete ingredient.');
      }

      setDeletingIngredient(null);
      router.refresh();
    } catch (error) {
      setDeleteErrorMessage(error instanceof Error ? error.message : 'Unexpected error.');
    } finally {
      setIsDeleting(false);
    }
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
          type="button"
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
            onChange={(event) => setSearchQuery(event.target.value)}
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
                  <td className="px-6 py-4 text-right text-on-surface-variant">{formatNumber(ingredient.calories)} kcal</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{formatNumber(ingredient.protein)} g</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{formatNumber(ingredient.carbs)} g</td>
                  <td className="px-6 py-4 text-right text-on-surface-variant">{formatNumber(ingredient.fat)} g</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openModal(ingredient)}
                        className="p-2 text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(ingredient)}
                        className="p-2 text-error hover:bg-error-container/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-on-surface-variant">
                    No ingredients found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0"
            onClick={isSaving ? undefined : closeModal}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold text-on-surface mb-4">
              {editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, name: event.target.value }))
                  }
                  className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Calories</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.calories}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        calories: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Protein (g)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.protein}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, protein: event.target.value }))
                    }
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Carbs (g)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.carbs}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, carbs: event.target.value }))
                    }
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Fat (g)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.fat}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, fat: event.target.value }))
                    }
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-low text-on-surface focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              {modalErrorMessage ? (
                <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
                  {modalErrorMessage}
                </p>
              ) : null}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg font-semibold bg-surface-container-low hover:bg-surface-variant text-on-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingIngredient ? (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0"
            onClick={isDeleting ? undefined : closeDeleteModal}
            aria-hidden="true"
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-xl font-bold text-on-surface mb-2">Delete Ingredient</h3>
            <p className="text-sm text-on-surface-variant">
              Delete {deletingIngredient.name}? This action cannot be undone.
            </p>
            {deleteErrorMessage ? (
              <p className="mt-4 rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
                {deleteErrorMessage}
              </p>
            ) : null}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg font-semibold bg-surface-container-low hover:bg-surface-variant text-on-surface transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg font-semibold bg-error hover:bg-error/90 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
