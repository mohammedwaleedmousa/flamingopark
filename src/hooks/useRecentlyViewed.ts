import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/store/useStore";

const MAX_ITEMS = 12;

interface RecentlyViewedState {
  items: Product[];
  add: (product: Product) => void;
  clear: () => void;
}

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (product) => {
        const filtered = get().items.filter((p) => p.id !== product.id);
        const next = [product, ...filtered].slice(0, MAX_ITEMS);
        set({ items: next });
      },
      clear: () => set({ items: [] }),
    }),
    { name: "flamingo-recently-viewed" }
  )
);