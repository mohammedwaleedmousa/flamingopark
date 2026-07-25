import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';

const syncedKey = (userId: string) => `flamingopark-favorites-db-synced:${userId}`;

const toProduct = (p: any): Product => ({
  id: p.id, name: p.name, nameAr: p.name_ar, slug: p.slug, price: Number(p.price),
  originalPrice: p.original_price ? Number(p.original_price) : undefined,
  discount: p.discount || undefined, description: p.description || '', descriptionAr: p.description_ar || '',
  images: p.images || [], category: p.category || '', brand: p.brand || '', inStock: p.in_stock ?? true,
  countries: p.countries || ['GLOBAL'], isFeatured: p.is_featured, isBestSeller: p.is_best_seller,
});

interface FavoritesState {
  favorites: Product[];
  addFavorite: (product: Product) => void;
  removeFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => boolean;
  syncWithDatabase: (userId: string, customerId?: string | null) => Promise<void>;
}

export const useFavorites = create<FavoritesState>()(persist((set, get) => ({
  favorites: [],
  addFavorite: (product) => {
    if (!get().favorites.some((p) => p.id === product.id)) set({ favorites: [...get().favorites, product] });
  },
  removeFavorite: (productId) => set({ favorites: get().favorites.filter((p) => p.id !== productId) }),
  isFavorite: (productId) => get().favorites.some((p) => p.id === productId),
  toggleFavorite: (product) => {
    const exists = get().isFavorite(product.id);
    if (exists) {
      get().removeFavorite(product.id);
      void supabase.auth.getUser().then(({ data }) => {
        if (data.user) void (supabase as any).from('customer_favorites').delete().eq('user_id', data.user.id).eq('product_id', product.id);
      });
      return false;
    }
    get().addFavorite(product);
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void (supabase as any).from('customer_favorites').upsert({ user_id: data.user.id, product_id: product.id }, { onConflict: 'user_id,product_id' });
    });
    return true;
  },
  syncWithDatabase: async (userId, customerId) => {
    const local = get().favorites;
    if (!localStorage.getItem(syncedKey(userId)) && local.length) {
      const { error } = await (supabase as any).from('customer_favorites').upsert(
        local.map((p) => ({ user_id: userId, customer_id: customerId || null, product_id: p.id })),
        { onConflict: 'user_id,product_id', ignoreDuplicates: true },
      );
      if (!error) localStorage.setItem(syncedKey(userId), '1');
    }
    const { data, error } = await (supabase as any)
      .from('customer_favorites')
      .select('products(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) set({ favorites: (data || []).map((r: any) => r.products).filter(Boolean).map(toProduct) });
  },
}), { name: 'flamingopark-favorites' }));
