import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Country = 'YE' | 'SA';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  country: Country;
}

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  description: string;
  descriptionAr: string;
  images: string[];
  category: string;
  brand: string;
  inStock: boolean;
  countries: Country[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
}

export interface SelectedAccessory {
  name: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedAccessories?: SelectedAccessory[];
}

interface StoreState {
  country: Country | null;
  customer: Customer | null;
  cart: CartItem[];
  isCartOpen: boolean;
  setCountry: (country: Country) => void;
  setCustomer: (customer: Customer | null) => void;
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedAccessories?: SelectedAccessory[]) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  logout: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      country: null,
      customer: null,
      cart: [],
      isCartOpen: false,
      
      setCountry: (country) => set({ country }),
      setCustomer: (customer) => set({ customer }),
      
      addToCart: (product, quantity = 1, selectedSize, selectedAccessories) => {
        const cart = get().cart;
        // Create a unique key based on product + size + accessories
        const accessoriesKey = selectedAccessories
          ? selectedAccessories.map(a => `${a.name_ar}:${a.quantity}`).sort().join('|')
          : '';
        const itemKey = `${product.id}-${selectedSize || ''}-${accessoriesKey}`;
        
        const existingItemIndex = cart.findIndex(item => {
          const existingAccessoriesKey = item.selectedAccessories
            ? item.selectedAccessories.map(a => `${a.name_ar}:${a.quantity}`).sort().join('|')
            : '';
          const existingKey = `${item.product.id}-${item.selectedSize || ''}-${existingAccessoriesKey}`;
          return existingKey === itemKey;
        });
        
        if (existingItemIndex !== -1) {
          set({
            cart: cart.map((item, index) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ cart: [...cart, { product, quantity, selectedSize, selectedAccessories }] });
        }
      },
      
      removeFromCart: (productId) => {
        set({ cart: get().cart.filter(item => item.product.id !== productId) });
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        set({
          cart: get().cart.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        });
      },
      
      clearCart: () => set({ cart: [] }),
      
      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),
      
      getCartTotal: () => {
        return get().cart.reduce((total, item) => {
          const price = item.product.discount
            ? item.product.price * (1 - item.product.discount / 100)
            : item.product.price;
          
          // Add accessories total
          const accessoriesTotal = item.selectedAccessories
            ? item.selectedAccessories.reduce((sum, acc) => sum + (acc.price * acc.quantity), 0)
            : 0;
          
          return total + (price + accessoriesTotal) * item.quantity;
        }, 0);
      },
      
      getCartCount: () => {
        return get().cart.reduce((count, item) => count + item.quantity, 0);
      },

      logout: () => set({ customer: null, cart: [] }),
    }),
    {
      name: 'ermgold-store',
      partialize: (state) => ({ 
        country: state.country, 
        customer: state.customer, 
        cart: state.cart 
      }),
    }
  )
);

// Helper to detect country from phone number
export const detectCountryFromPhone = (phone: string): Country | null => {
  const cleanPhone = phone.replace(/\D/g, '');
  // Saudi: must start with 055 (or 966 with country code)
  if (cleanPhone.startsWith('966') || cleanPhone.startsWith('055')) {
    return 'SA';
  }
  // Yemen: starts with 7
  if (cleanPhone.startsWith('967') || cleanPhone.startsWith('7')) {
    return 'YE';
  }
  return null;
};
