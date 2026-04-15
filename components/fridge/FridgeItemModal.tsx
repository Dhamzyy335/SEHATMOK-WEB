"use client";

import { FormEvent, useEffect, useState } from "react";

export type FridgeItemFormInitialValues = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  expiryDate: string;
};

export type FridgeItemFormSubmitInput = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string | null;
};

type FridgeItemModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialValues?: FridgeItemFormInitialValues;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: FridgeItemFormSubmitInput) => Promise<void>;
};

const defaultValues: FridgeItemFormInitialValues = {
  name: "",
  category: "Vegetables",
  quantity: "",
  unit: "pcs",
  expiryDate: "",
};

export default function FridgeItemModal({
  isOpen,
  mode,
  initialValues,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: FridgeItemModalProps) {
  const [formState, setFormState] = useState<FridgeItemFormInitialValues>(defaultValues);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormState(initialValues ?? defaultValues);
    setValidationError(null);
  }, [initialValues, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const name = formState.name.trim();
    const category = formState.category.trim();
    const unit = formState.unit.trim();
    const quantity = Number(formState.quantity);
    const expiryDate = formState.expiryDate.trim();

    if (!name || !category || !unit) {
      setValidationError("Name, category, and unit are required.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setValidationError("Quantity must be greater than zero.");
      return;
    }

    if (
      expiryDate &&
      Number.isNaN(new Date(`${expiryDate}T00:00:00.000Z`).getTime())
    ) {
      setValidationError("Invalid expiry date.");
      return;
    }

    await onSubmit({
      name,
      category,
      quantity,
      unit,
      expiryDate: expiryDate || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8">
      <div
        className="absolute inset-0"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="font-headline text-2xl font-extrabold tracking-tight">
              {mode === "create" ? "Add Fridge Item" : "Edit Fridge Item"}
            </h3>
            <p className="text-sm text-on-surface-variant">
              Keep your inventory accurate for smarter recipe suggestions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1 sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Name
              </span>
              <input
                type="text"
                value={formState.name}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, name: event.target.value }))
                }
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Greek Yogurt"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Category
              </span>
              <select
                value={formState.category}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, category: event.target.value }))
                }
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Proteins">Proteins</option>
                <option value="Dairy">Dairy</option>
                <option value="Grains">Grains</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Unit
              </span>
              <input
                type="text"
                value={formState.unit}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, unit: event.target.value }))
                }
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                placeholder="pcs / g / kg / ml"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Quantity
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formState.quantity}
                onChange={(event) =>
                  setFormState((previous) => ({ ...previous, quantity: event.target.value }))
                }
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
                placeholder="1"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Expiry Date
              </span>
              <input
                type="date"
                value={formState.expiryDate}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    expiryDate: event.target.value,
                  }))
                }
                className="w-full rounded-xl border-none bg-surface-container-low p-3 focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          {validationError ? (
            <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
              {validationError}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-lg bg-error-container/10 px-3 py-2 text-sm font-medium text-error">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl bg-surface-container-low px-4 py-2 font-semibold transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-5 py-2 font-bold text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? mode === "create"
                  ? "Adding..."
                  : "Saving..."
                : mode === "create"
                  ? "Add Item"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
