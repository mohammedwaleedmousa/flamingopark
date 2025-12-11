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

export interface CartItem {
  product: Product;
  quantity: number;
}

interface StoreState {
  country: Country | null;
  customer: Customer | null;
  cart: CartItem[];
  isCartOpen: boolean;
  setCountry: (country: Country) => void;
  setCustomer: (customer: Customer | null) => void;
  addToCart: (product: Product, quantity?: number) => void;
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
      
      addToCart: (product, quantity = 1) => {
        const cart = get().cart;
        const existingItem = cart.find(item => item.product.id === product.id);
        
        if (existingItem) {
          set({
            cart: cart.map(item =>
              item.product.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({ cart: [...cart, { product, quantity }] });
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
          return total + price * item.quantity;
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
  if (cleanPhone.startsWith('966') || cleanPhone.startsWith('05')) {
    return 'SA';
  }
  if (cleanPhone.startsWith('967') || cleanPhone.startsWith('07')) {
    return 'YE';
  }
  return null;
};
