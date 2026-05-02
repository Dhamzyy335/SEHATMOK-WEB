"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";

type GroceryItem = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
};

type GroceryMutationResponse = {
  message?: string;
};

const formatQuantity = (item: GroceryItem) => {
  if (item.quantity === null) {
    return item.unit ?? "";
  }

  const quantity = Number.isInteger(item.quantity)
    ? item.quantity.toString()
    : item.quantity.toFixed(1);

  return `${quantity}${item.unit ? ` ${item.unit}` : ""}`;
};

export default function GroceryPageClient() {
  const router = useRouter();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/grocery", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch grocery items (${response.status})`);
      }

      const data = (await response.json()) as GroceryItem[];
      setItems(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const setItemMutating = (id: string, isMutating: boolean) => {
    setMutatingIds((previous) => {
      const next = new Set(previous);
      if (isMutating) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage("Item name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const response = await fetch("/api/grocery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          quantity,
          unit,
        }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json().catch(() => ({}))) as
        | GroceryItem
        | GroceryMutationResponse;

      if (!response.ok) {
        throw new Error("message" in result ? result.message : "Failed to add item.");
      }

      setName("");
      setQuantity("");
      setUnit("");
      await loadItems();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDone = async (item: GroceryItem) => {
    if (mutatingIds.has(item.id)) {
      return;
    }

    try {
      setItemMutating(item.id, true);
      setErrorMessage(null);

      const response = await fetch(`/api/grocery/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDone: !item.isDone }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json().catch(() => ({}))) as
        | GroceryItem
        | GroceryMutationResponse;

      if (!response.ok) {
        throw new Error("message" in result ? result.message : "Failed to update item.");
      }

      setItems((previous) =>
        previous.map((currentItem) =>
          currentItem.id === item.id && "id" in result ? result : currentItem,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setItemMutating(item.id, false);
    }
  };

  const handleDelete = async (item: GroceryItem) => {
    if (mutatingIds.has(item.id)) {
      return;
    }

    try {
      setItemMutating(item.id, true);
      setErrorMessage(null);

      const response = await fetch(`/api/grocery/${item.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json().catch(() => ({}))) as GroceryMutationResponse;

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to delete item.");
      }

      setItems((previous) => previous.filter((currentItem) => currentItem.id !== item.id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setItemMutating(item.id, false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar title="Grocery List" backHref="/" backLabel="Back to Home" />

      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-4">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-surface-container-lowest p-5 editorial-shadow"
        >
          <div className="space-y-4">
            <div>
              <h2 className="font-headline text-2xl font-bold">Add Item</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Keep track of ingredients you need to buy.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_120px_auto]">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  placeholder="Milk"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Qty
                </span>
                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  placeholder="2"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Unit
                </span>
                <input
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                  placeholder="pcs"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="self-end rounded-xl bg-primary px-5 py-3 font-bold text-on-primary transition-opacity hover:opacity-95 disabled:opacity-70"
              >
                {isSubmitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </form>

        {errorMessage ? (
          <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
            <p className="text-sm font-semibold text-error">{errorMessage}</p>
          </div>
        ) : null}

        <section className="space-y-3">
          {isLoading ? (
            <div className="rounded-2xl bg-surface-container-lowest p-5 editorial-shadow">
              <p className="text-sm font-semibold text-on-surface-variant">
                Loading grocery items...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
              <p className="text-sm font-medium text-on-surface-variant">
                Your grocery list is empty.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isMutating = mutatingIds.has(item.id);
              const quantityLabel = formatQuantity(item);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl bg-surface-container-lowest p-4 editorial-shadow"
                >
                  <input
                    type="checkbox"
                    checked={item.isDone}
                    disabled={isMutating}
                    onChange={() => void handleToggleDone(item)}
                    className="h-5 w-5 rounded border-outline-variant accent-primary"
                    aria-label={`Mark ${item.name} as ${item.isDone ? "not done" : "done"}`}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-headline text-lg font-bold ${
                        item.isDone ? "text-on-surface-variant line-through" : ""
                      }`}
                    >
                      {item.name}
                    </p>
                    {quantityLabel ? (
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {quantityLabel}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() => void handleDelete(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-error transition-colors hover:bg-error-container/10 disabled:opacity-50"
                    aria-label={`Delete ${item.name}`}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              );
            })
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
