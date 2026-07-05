import { create } from "zustand";
import { persist } from "zustand/middleware";
import { track } from "@/lib/analytics";
import type { CurrencyMode } from "@/lib/currency";

export type Country = "GLOBAL" | string;

export const detectCountryFromPhone = (_phone?: string): Country => "GLOBAL";

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
  // Optional modern variant model
  variants?: Variant[];
}

export interface VariantSize {
  size: string;
  stock: number;
}

export interface Variant {
  id: string;
  colorName: string;
  colorHex?: string;
  images: string[];
  price?: number;
  discount?: number;
  sizes?: VariantSize[];
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
  variantId?: string;
  variantColor?: string;
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
    selectedAccessories?: SelectedAccessory[],
    variantId?: string,
    variantColor?: string
  ) => void;

  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
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
      country: "GLOBAL",
      setCountry: (country) => set({ country }),

      currencyMode: "SAR",
      setCurrencyMode: (currencyMode) => set({ currencyMode }),

      setCustomer: (customer) => set({ customer }),

      addToCart: (product, quantity = 1, selectedSize, selectedAccessories, variantId, variantColor) => {
        const cart = get().cart;

        const accPrice = (selectedAccessories ?? []).reduce(
          (s, a) => s + a.price * a.quantity,
          0
        );

        // Determine unit price taking variant override into account
        const variant = variantId && (product as any).variants
          ? (product as any).variants.find((v: any) => v.id === variantId)
          : undefined;

        const unitPriceSource = variant && (variant.price ?? variant.discount !== undefined)
          ? (variant.price ?? product.price)
          : product.price;

        const unitDiscount = variant && variant.discount !== undefined ? variant.discount : product.discount;

        const unit = unitDiscount ? unitPriceSource * (1 - unitDiscount / 100) : unitPriceSource;

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

        const itemKey = `${product.id}-${variantId || ""}-${selectedSize || ""}-${accessoriesKey}`;

        const existingIndex = cart.findIndex((item) => {
          const existingAccKey = item.selectedAccessories
            ? item.selectedAccessories
                .map((a) => `${a.name_ar}:${a.quantity}`)
                .sort()
                .join("|")
            : "";

          return (
            `${item.product.id}-${item.variantId || ""}-${item.selectedSize || ""}-${existingAccKey}` === itemKey
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
            cart: [...cart, { product, quantity, selectedSize, selectedAccessories, variantId, variantColor }],
          });
        }
      },

      removeFromCart: (productId, variantId) => {
        set({
          cart: get().cart.filter((item) => {
            if (variantId) return !(item.product.id === productId && item.variantId === variantId);
            return item.product.id !== productId;
          }),
        });
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeFromCart(productId, variantId);
          return;
        }

        set({
          cart: get().cart.map((item) =>
            item.product.id === productId && (!variantId || item.variantId === variantId) ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => set({ cart: [] }),

      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),
      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      getCartTotal: () => {
        return get().cart.reduce((total, item) => {
          // Price may be overridden by variant
          const variant = item.variantId && (item.product as any).variants
            ? (item.product as any).variants.find((v: any) => v.id === item.variantId)
            : undefined;

          const basePrice = variant && variant.price !== undefined ? variant.price : item.product.price;
          const discount = variant && variant.discount !== undefined ? variant.discount : item.product.discount;

          const price = discount ? basePrice * (1 - discount / 100) : basePrice;

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