"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";
import FridgeItemModal, {
  FridgeItemFormInitialValues,
  FridgeItemFormSubmitInput,
} from "@/components/fridge/FridgeItemModal";

type FridgeCategory = {
  name: string;
  active?: boolean;
};

type FridgeItemRecord = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  createdAt: string;
};

type FridgeItemPresentation = {
  badge: string;
  badgeClassName: string;
  cardClassName: string;
  iconBadgeClassName: string;
  dotClassName: string;
};

type FridgeMutationResponse = {
  message?: string;
};

type DeleteExpiredResponse = {
  deletedCount: number;
  message?: string;
};

type ToastState = {
  message: string;
  type: "success" | "error";
};

const categories: FridgeCategory[] = [
  { name: "All", active: true },
  { name: "Vegetables" },
  { name: "Fruits" },
  { name: "Proteins" },
  { name: "Dairy" },
];

const categoryImageMap: Record<string, string> = {
  vegetables:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC_yaaXXSScsDq2gTtyqJtAZ41vthsWyZ-TMt84GMwIN5Izy04wmaKxa5uEhcMsHw3OiIdgS2NUKC_7Whfof2FLYX8-6rDlO2xuRfKqG3UyVYmqRN3w6mx8PXGq1XMQAOoEfvABNtO6x_1k-lDNi-MfMd2CPxJRHyjFM2K0Eve9xk0yYBmpP5Owh8nF4YfDKFz73RPMk9HDa9fBpixE8KwQ47VCQg1dmSjId_hVJA0RU4i33MYvZZvRREXIpGxLGfDWXdc66AUBdK6V",
  dairy:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCIdQXsBtjzS0IGuVTee0m2BpsVZMOTz0qG1EtC1CrOd14AsoviLfdVL-5kx-acIHdskh_AVkZfKLIzg7lewTNALZISj8fCLV4SATm__C3s8_Yjzglnpg0UxVPEITpsqH2K7XQFQEBPFFjsWzLKozSw_k83VQJa0CXgTe19QCmyX7IvdCkrZ-4i7GLM_mgcmcw1ZNED6fDlDXATnLI3At_LyDf_LR3u7ypz2e9xTXxicsOmrLu3D22ma2xJwWo5jIdV3tbA4V1Cj2Ld",
  proteins:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCbFuVCFRSc8NBNwJn92WEd0r5td8jRGBpo8RfK3X4W5DTysoizrkYNsGEAp9wBkeNEEHtn8bpeuCkzb9chD4TYAWvfM2gf1FrlfCIpoPZITFzCxdoQsJtPGxjt2HvoQp8y8P7EOaHBYaU15lBLg45kONuJVXwwn0Ax_evmHG6pSOGEWdl2ELeOl_Y8_cINqTKgDqfdG7EvG6s79OUnaueJP_3W0370N9QcG7cd3bgL33DIL6ID0RTTzqO4awOvzQkhZz1odzAWG7_D",
  fruits:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD4vzBuxdxTev_kdCL-m285SIiPqFrGmcEVhuF6uKyLqOFgC5FZHra5-z4C66zPKQFKAGvGdYRNzWGVcACYddfd-lSFB9aphw3WYUYXUx131-2BYgB33e8ueyreWWeyWfKdCnjmB8Z1kWhTYoVOX75p7ymEHAW4n2SfCFd8lD_gef5lCxvHzMcfiBM-ZBcY5tOGWgR2KdZf66bWhC3p-T0-tqNkvEqhjoT5mMMKnWCLBV7pGZloX5hsIwB_92KHp9Xaf497iQBtxsv4",
};

const dayInMilliseconds = 24 * 60 * 60 * 1000;

const getExpiryDays = (expiryDate: string | null) => {
  if (!expiryDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / dayInMilliseconds);
};

const getExpiryStatusLabel = (days: number) => {
  if (days === 0) {
    return "Expires today";
  }

  if (days === 1) {
    return "Expires tomorrow";
  }

  return `Expires in ${days} days`;
};

const getPresentation = (expiryDate: string | null): FridgeItemPresentation => {
  const days = getExpiryDays(expiryDate);

  if (days === null) {
    return {
      badge: "No expiry date",
      badgeClassName: "bg-surface-container/50 text-on-surface-variant",
      cardClassName:
        "group relative flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4 transition-all hover:shadow-md",
      iconBadgeClassName: "bg-surface-container",
      dotClassName: "h-3 w-3 rounded-full bg-outline-variant opacity-50",
    };
  }

  if (days < 0) {
    return {
      badge: "Expired",
      badgeClassName: "text-error bg-error-container/10",
      cardClassName:
        "group relative flex items-center gap-4 rounded-xl border-l-4 border-error bg-surface-container-lowest p-4 transition-all hover:shadow-md",
      iconBadgeClassName: "bg-error-container/10",
      dotClassName:
        "h-3 w-3 animate-pulse rounded-full bg-error shadow-[0_0_8px_rgba(176,37,0,0.4)]",
    };
  }

  if (days <= 2) {
    return {
      badge: days === 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`,
      badgeClassName: "text-error bg-error-container/10",
      cardClassName:
        "group relative flex items-center gap-4 rounded-xl border-l-4 border-error bg-surface-container-lowest p-4 transition-all hover:shadow-md",
      iconBadgeClassName: "bg-error-container/10",
      dotClassName:
        "h-3 w-3 animate-pulse rounded-full bg-error shadow-[0_0_8px_rgba(176,37,0,0.4)]",
    };
  }

  if (days <= 4) {
    return {
      badge: `Expires in ${days} days`,
      badgeClassName: "text-secondary bg-secondary-container/20",
      cardClassName:
        "group relative flex items-center gap-4 rounded-xl border-l-4 border-secondary bg-surface-container-lowest p-4 transition-all hover:shadow-md",
      iconBadgeClassName: "bg-secondary-container/10",
      dotClassName: "h-3 w-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(135,78,0,0.3)]",
    };
  }

  if (days <= 7) {
    return {
      badge: "Fresh",
      badgeClassName: "text-primary bg-primary-container/20",
      cardClassName:
        "group relative flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4 transition-all hover:shadow-md",
      iconBadgeClassName: "bg-primary-container/10",
      dotClassName: "h-3 w-3 rounded-full bg-primary shadow-[0_0_8px_rgba(23,106,33,0.3)]",
    };
  }

  return {
    badge: `In ${days} days`,
    badgeClassName: "bg-surface-container/50 text-on-surface-variant",
    cardClassName:
      "group relative flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4 transition-all hover:shadow-md",
    iconBadgeClassName: "bg-surface-container",
    dotClassName: "h-3 w-3 rounded-full bg-outline-variant opacity-50",
  };
};

const getImageUrl = (category: string) => {
  const key = category.trim().toLowerCase();
  return categoryImageMap[key] ?? categoryImageMap.vegetables;
};

const formatQuantity = (value: number) => {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(1);
};

const toDateInputValue = (expiryDate: string | null): string => {
  if (!expiryDate) {
    return "";
  }

  const parsedDate = new Date(expiryDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
};

export default function FridgePageClient() {
  const router = useRouter();
  const [fridgeItems, setFridgeItems] = useState<FridgeItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [menuOpenItemId, setMenuOpenItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<FridgeItemRecord | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isDeletingExpired, setIsDeletingExpired] = useState(false);
  const [isDeleteExpiredModalOpen, setIsDeleteExpiredModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const fetchFridgeItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadErrorMessage(null);

      const response = await fetch("/api/fridge", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch fridge items (${response.status})`);
      }

      const data = (await response.json()) as FridgeItemRecord[];
      setFridgeItems(data);
    } catch (error) {
      setLoadErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchFridgeItems();
  }, [fetchFridgeItems]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!isDeleteExpiredModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeletingExpired) {
        setIsDeleteExpiredModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleteExpiredModalOpen, isDeletingExpired]);

  const modalInitialValues = useMemo<FridgeItemFormInitialValues | undefined>(
    () =>
      editingItem
        ? {
            name: editingItem.name,
            category: editingItem.category,
            quantity: String(editingItem.quantity),
            unit: editingItem.unit,
            expiryDate: toDateInputValue(editingItem.expiryDate),
          }
        : undefined,
    [editingItem],
  );

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredFridgeItems = useMemo(() => {
    if (normalizedSearchQuery.length > 0) {
      return fridgeItems.filter((item) =>
        item.name.toLowerCase().includes(normalizedSearchQuery),
      );
    }

    return fridgeItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      return matchesCategory;
    });
  }, [fridgeItems, normalizedSearchQuery, selectedCategory]);

  const displayCategory = useMemo(() => {
    if (normalizedSearchQuery.length === 0) {
      return selectedCategory;
    }

    const matchingCategories = new Set(
      filteredFridgeItems.map((item) => item.category),
    );

    if (matchingCategories.size === 1) {
      return Array.from(matchingCategories)[0];
    }

    return "All";
  }, [filteredFridgeItems, normalizedSearchQuery, selectedCategory]);

  const expiredCount = useMemo(
    () =>
      fridgeItems.filter((item) => {
        const expiryDays = getExpiryDays(item.expiryDate);
        return expiryDays !== null && expiryDays < 0;
      }).length,
    [fridgeItems],
  );

  const urgentFridgeItems = useMemo(
    () =>
      fridgeItems
        .map((item) => {
          const expiryDays = getExpiryDays(item.expiryDate);
          return expiryDays === null ? null : { item, expiryDays };
        })
        .filter(
          (
            value,
          ): value is {
            item: FridgeItemRecord;
            expiryDays: number;
          } => value !== null && value.expiryDays >= 0 && value.expiryDays <= 2,
        )
        .sort((a, b) => {
          if (a.expiryDays !== b.expiryDays) {
            return a.expiryDays - b.expiryDays;
          }

          return a.item.name.localeCompare(b.item.name);
        })
        .slice(0, 5),
    [fridgeItems],
  );

  const openAddModal = () => {
    setModalMode("create");
    setEditingItem(null);
    setMenuOpenItemId(null);
    setModalErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: FridgeItemRecord) => {
    setModalMode("edit");
    setEditingItem(item);
    setMenuOpenItemId(null);
    setModalErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmittingModal) {
      return;
    }

    setIsModalOpen(false);
    setEditingItem(null);
    setModalErrorMessage(null);
  };

  const submitModal = async (input: FridgeItemFormSubmitInput) => {
    try {
      setIsSubmittingModal(true);
      setModalErrorMessage(null);
      setActionErrorMessage(null);

      const expiryDateIso = input.expiryDate
        ? new Date(`${input.expiryDate}T00:00:00.000Z`).toISOString()
        : null;

      const payload = {
        name: input.name,
        category: input.category,
        quantity: input.quantity,
        unit: input.unit,
        expiryDate: expiryDateIso,
      };

      const editingItemId = editingItem?.id;

      if (modalMode === "edit" && !editingItemId) {
        throw new Error("No fridge item selected for edit.");
      }

      const endpoint =
        modalMode === "edit" ? `/api/fridge/${editingItemId}` : "/api/fridge";
      const method = modalMode === "edit" ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response
        .json()
        .catch(() => null)) as FridgeMutationResponse | null;

      if (!response.ok) {
        throw new Error(
          result?.message ??
            (modalMode === "edit"
              ? "Failed to update fridge item."
              : "Failed to add fridge item."),
        );
      }

      setIsModalOpen(false);
      setEditingItem(null);
      await fetchFridgeItems();
    } catch (error) {
      setModalErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleDeleteItem = async (item: FridgeItemRecord) => {
    const shouldDelete = window.confirm(`Delete "${item.name}" from your fridge?`);
    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingItemId(item.id);
      setActionErrorMessage(null);
      setMenuOpenItemId(null);

      const response = await fetch(`/api/fridge/${item.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response
        .json()
        .catch(() => null)) as FridgeMutationResponse | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "Failed to delete fridge item.");
      }

      await fetchFridgeItems();
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setDeletingItemId(null);
    }
  };

  const openDeleteExpiredModal = () => {
    if (expiredCount === 0 || isDeletingExpired) {
      return;
    }

    setActionErrorMessage(null);
    setMenuOpenItemId(null);
    setIsDeleteExpiredModalOpen(true);
  };

  const closeDeleteExpiredModal = () => {
    if (isDeletingExpired) {
      return;
    }

    setIsDeleteExpiredModalOpen(false);
  };

  const handleDeleteExpiredItems = async () => {
    try {
      setIsDeletingExpired(true);
      setActionErrorMessage(null);

      const response = await fetch("/api/fridge/expired", {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response
        .json()
        .catch(() => null)) as DeleteExpiredResponse | null;

      if (!response.ok) {
        throw new Error(result?.message ?? "Failed to delete expired fridge items.");
      }

      const deletedCount = result?.deletedCount ?? 0;
      setToast({
        type: "success",
        message:
          deletedCount === 1
            ? "1 expired item deleted."
            : `${deletedCount} expired items deleted.`,
      });
      setIsDeleteExpiredModalOpen(false);
      await fetchFridgeItems();
    } catch {
      setToast({
        type: "error",
        message: "Failed to delete expired items. Please try again.",
      });
    } finally {
      setIsDeletingExpired(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar />

      <main className="mx-auto mt-4 max-w-screen-xl space-y-8 px-6">
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-on-surface-variant">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search ingredients in your fridge..."
            className="h-14 w-full rounded-xl border-none bg-surface-container-lowest pl-12 pr-4 font-medium placeholder:text-on-surface-variant/50 shadow-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {actionErrorMessage ? (
          <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
            <p className="text-sm font-semibold text-error">{actionErrorMessage}</p>
          </div>
        ) : null}

        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-headline text-2xl font-bold tracking-tight">Categories</h2>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={
                  displayCategory === category.name
                    ? "flex-shrink-0 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary transition-all active:scale-95"
                    : "flex-shrink-0 rounded-xl bg-surface-container-low px-6 py-3 font-semibold text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
                }
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-headline text-2xl font-bold tracking-tight">Stock Inventory</h2>
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {isLoading ? "Loading..." : `${filteredFridgeItems.length} Items`}
              </span>
            </div>

            {expiredCount > 0 ? (
              <button
                type="button"
                onClick={openDeleteExpiredModal}
                disabled={isDeletingExpired}
                className="self-start rounded-xl bg-error-container/10 px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
              >
                {isDeletingExpired
                  ? "Deleting expired..."
                  : `Delete expired (${expiredCount})`}
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`loading-${index}`}
                  className="flex items-center gap-4 rounded-xl bg-surface-container-lowest p-4"
                >
                  <div className="h-16 w-16 animate-pulse rounded-lg bg-surface-container" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/5 animate-pulse rounded bg-surface-container" />
                    <div className="h-3 w-3/5 animate-pulse rounded bg-surface-container" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadErrorMessage ? (
            <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
              <p className="text-sm font-semibold text-error">Could not load fridge items.</p>
              <p className="mt-1 text-xs text-on-surface-variant">{loadErrorMessage}</p>
              <button
                type="button"
                onClick={() => void fetchFridgeItems()}
                className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary transition-transform active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFridgeItems.map((item) => {
                const visual = getPresentation(item.expiryDate);
                const isMenuOpen = menuOpenItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`${visual.cardClassName} ${isMenuOpen ? "z-30 overflow-visible" : "overflow-hidden"}`}
                  >
                    <div
                      className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg ${visual.iconBadgeClassName}`}
                    >
                      <img
                        src={getImageUrl(item.category)}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-headline text-lg font-bold">{item.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${visual.badgeClassName}`}>
                          {visual.badge}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-on-surface-variant">
                        {formatQuantity(item.quantity)} {item.unit} • {item.category}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={visual.dotClassName} />
                      <button
                        type="button"
                        onClick={() =>
                          setMenuOpenItemId((currentValue) =>
                            currentValue === item.id ? null : item.id,
                          )
                        }
                        className="text-on-surface-variant transition-colors hover:text-primary"
                        disabled={deletingItemId === item.id}
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>

                    {isMenuOpen ? (
                      <div className="absolute right-4 top-16 z-20 w-32 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="w-full px-4 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-container-low"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteItem(item)}
                          disabled={deletingItemId === item.id}
                          className="w-full px-4 py-2 text-left text-sm font-medium text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingItemId === item.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {filteredFridgeItems.length === 0 ? (
                <div className="rounded-xl bg-surface-container-low p-6 text-center">
                  <p className="font-semibold">
                    {searchQuery.trim()
                      ? `No fridge items found for "${searchQuery.trim()}".`
                      : "No fridge items found."}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="mt-8">
          <div className="glass-card relative overflow-hidden rounded-xl border-l-4 border-secondary p-6 shadow-lg">
            <div className="relative z-10 flex gap-4">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2 text-secondary">
                  <span
                    className="material-symbols-outlined text-sm"
                    style={{ fontVariationSettings: "\"FILL\" 1" }}
                  >
                    auto_awesome
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest">AI Insight</span>
                </div>

                {urgentFridgeItems.length > 0 ? (
                  <>
                    <h3 className="mb-2 font-headline text-xl font-bold">
                      Use these soon!
                    </h3>
                    <p className="mb-4 text-sm leading-relaxed text-on-surface/80">
                      These ingredients are close to expiring. Use them before they
                      go to waste.
                    </p>
                    <div className="mb-4 grid gap-2">
                      {urgentFridgeItems.map(({ item, expiryDays }) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-lowest/70 px-3 py-2"
                        >
                          <span className="text-sm font-bold">{item.name}</span>
                          <span className="shrink-0 text-xs font-semibold text-secondary">
                            {getExpiryStatusLabel(expiryDays)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/ai-recipe"
                      className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold text-on-secondary transition-transform active:scale-95"
                    >
                      Generate recipe ideas
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="mb-2 font-headline text-xl font-bold">
                      All fresh for now
                    </h3>
                    <p className="text-sm leading-relaxed text-on-surface/80">
                      No ingredients are close to expiring right now.
                    </p>
                  </>
                )}
              </div>
              <div className="hidden w-24 sm:block">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLGFDQhO1HKQs4lLWPKN51Y0xVWijkQcdsnBbACIwJgg8WBhXaGkLgoLVwuYDZFUT1ZfBN0lJ1GpGFjt1tqYq-i2RgBmBwbLCw6sa9sESiVXzsHgLFJMerwDDo3alVxohm3OjNjpC6lMSNNGYzowpxErqlFHxbNdpnaeV9Oo1zwcOy6C6a-sCP8UKu3WNgn2AIVUeuVSiLCcRj1D80k9TOFZN--h-MNarCuYScArG_baRNBoiuXriMp7T_eGws4maI5wLUAVLNvB1t"
                  alt="Salad"
                  className="h-full w-full rotate-6 scale-110 rounded-lg object-cover shadow-xl"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <button
        type="button"
        onClick={openAddModal}
        className="fixed bottom-28 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white shadow-2xl transition-all hover:scale-105 active:scale-90"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <FridgeItemModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialValues={modalInitialValues}
        isSubmitting={isSubmittingModal}
        errorMessage={modalErrorMessage}
        onClose={closeModal}
        onSubmit={submitModal}
      />

      {isDeleteExpiredModalOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          onClick={closeDeleteExpiredModal}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-6 editorial-shadow"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-error-container/10 text-error">
                <span className="material-symbols-outlined">delete</span>
              </div>
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface">
                  Delete expired items?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  This will permanently remove all expired fridge items from your
                  inventory.
                </p>
                <p className="mt-1 text-xs font-semibold text-on-surface-variant">
                  Fresh items will not be affected.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteExpiredModal}
                disabled={isDeletingExpired}
                className="rounded-xl border border-outline-variant/40 px-4 py-2 font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteExpiredItems()}
                disabled={isDeletingExpired}
                className="rounded-xl bg-error px-4 py-2 font-semibold text-on-error transition-opacity hover:opacity-95 disabled:opacity-70"
              >
                {isDeletingExpired ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-28 right-6 z-[100] w-[calc(100%-3rem)] max-w-sm">
          <div
            className={`rounded-2xl border p-4 shadow-xl ${
              toast.type === "success"
                ? "border-primary-container bg-primary-container text-on-primary-container"
                : "border-error-container/30 bg-error-container/10 text-error"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-xl">
                {toast.type === "success" ? "check_circle" : "error"}
              </span>
              <p className="text-sm font-semibold">{toast.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
