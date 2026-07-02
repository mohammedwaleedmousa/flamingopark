import { create } from "zustand";
import { persist } from "zustand/middleware";
import { track } from "@/lib/analytics";
import type { CurrencyMode } from "@/lib/currency";

export type Country = "YE" | "SA";

export const detectCountryFromPhone = (_phone?: string): Country => "YE";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  country?: Country;
}

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  price: number;
  costPrice?: number;
  originalPrice?: number;
  discount?: number;
  description: string;
  descriptionAr: string;
  images: string[];
  category: string;
  brand: string;
  inStock: boolean;
  countries?: Country[];
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
  customer: Customer | null;
  cart: CartItem[];
  isCartOpen: boolean;
  country: Country;
  setCountry: (c: Country) => void;

  currencyMode: CurrencyMode;
  setCurrencyMode: (m: CurrencyMode) => void;

  setCustomer: (customer: Customer | null) => void;

  addToCart: (
    product: Product,
    quantity?: number,
    selectedSize?: string,
    selectedAccessories?: SelectedAccessory[]
  ) => void;

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
      customer: null,
      cart: [],
      isCartOpen: false,
      country: "YE",
      setCountry: (country) => set({ country }),

      currencyMode: "SAR",
      setCurrencyMode: (currencyMode) => set({ currencyMode }),

      setCustomer: (customer) => set({ customer }),

      addToCart: (product, quantity = 1, selectedSize, selectedAccessories) => {
        const cart = get().cart;

        const accPrice = (selectedAccessories ?? []).reduce(
          (s, a) => s + a.price * a.quantity,
          0
        );

        const unit = product.discount
          ? product.price * (1 - product.discount / 100)
          : product.price;

        track({
          event_type: "add_to_cart",
          product_id: product.id,
          value: (unit + accPrice) * quantity,
          metadata: {
            name: product.nameAr || product.name,
            quantity,
          },
        });

        const accessoriesKey = selectedAccessories
          ? selectedAccessories
              .map((a) => `${a.name_ar}:${a.quantity}`)
              .sort()
              .join("|")
          : "";

        const itemKey = `${product.id}-${selectedSize || ""}-${accessoriesKey}`;

        const existingIndex = cart.findIndex((item) => {
          const existingAccKey = item.selectedAccessories
            ? item.selectedAccessories
                .map((a) => `${a.name_ar}:${a.quantity}`)
                .sort()
                .join("|")
            : "";

          return (
            `${item.product.id}-${item.selectedSize || ""}-${existingAccKey}` === itemKey
          );
        });

        if (existingIndex !== -1) {
          set({
            cart: cart.map((item, i) =>
              i === existingIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            cart: [...cart, { product, quantity, selectedSize, selectedAccessories }],
          });
        }
      },

      removeFromCart: (productId) => {
        set({
          cart: get().cart.filter((item) => item.product.id !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        set({
          cart: get().cart.map((item) =>
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

          const accessoriesTotal = item.selectedAccessories
            ? item.selectedAccessories.reduce(
                (sum, acc) => sum + acc.price * acc.quantity,
                0
              )
            : 0;

          return total + (price + accessoriesTotal) * item.quantity;
        }, 0);
      },

      getCartCount: () =>
        get().cart.reduce((count, item) => count + item.quantity, 0),

      logout: () => set({ customer: null, cart: [] }),
    }),
    {
      name: "flamingo-store",
      partialize: (state) => ({
        customer: state.customer,
        cart: state.cart,
        currencyMode: state.currencyMode,
      }),
    }
  )
);