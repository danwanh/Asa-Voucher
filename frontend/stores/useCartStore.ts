import { create } from "zustand";
import { getCart } from "@/services/cart.service";

interface CartState {
  count: number;
  setCount: (count: number) => void;
  refresh: () => Promise<void>;
}

export const useCartStore = create<CartState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  refresh: async () => {
    try {
      const cart = await getCart();
      set({ count: cart.items.reduce((sum, item) => sum + item.quantity, 0) });
    } catch {
      set({ count: 0 });
    }
  }
}));

export const selectCartCount = (state: CartState) => state.count;
