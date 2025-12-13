import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/store/useStore';

interface FavoritesState {
  favorites: Product[];
  addFavorite: (product: Product) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => boolean;
}

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (product) => {
        const favorites = get().favorites;
        if (!favorites.find(p => p.id === product.id)) {
          set({ favorites: [...favorites, product] });
        }
      },
      
      removeFavorite: (productId) => {
        set({ favorites: get().favorites.filter(p => p.id !== productId) });
      },
      
      isFavorite: (productId) => {
        return get().favorites.some(p => p.id === productId);
      },
      
      toggleFavorite: (product) => {
        const isFav = get().isFavorite(product.id);
        if (isFav) {
          get().removeFavorite(product.id);
          return false;
        } else {
          get().addFavorite(product);
          return true;
        }
      },
    }),
    {
      name: 'ermgold-favorites',
    }
  )
);
