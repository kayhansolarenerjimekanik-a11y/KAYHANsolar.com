"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CartItem } from "@/types/cart";

interface CartState {
  items: CartItem[];
  isHydrated: boolean;
  setHydrated: () => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      setHydrated: () => set({ isHydrated: true }),
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId,
          );
          const incomingQty = item.quantity ?? 1;
          if (existing) {
            const newQty = Math.min(
              existing.quantity + incomingQty,
              item.stockQuantity,
            );
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: newQty } : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...item,
                quantity: Math.min(incomingQty, item.stockQuantity),
              },
            ],
          };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? {
                    ...i,
                    quantity: Math.max(
                      0,
                      Math.min(quantity, i.stockQuantity),
                    ),
                  }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),
      clear: () => set({ items: [] }),
      getSubtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getItemCount: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "kayhan-cart",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.items = state.items.map((i) => ({
            ...i,
            hasFreeShipping: i.hasFreeShipping ?? false,
          }));
          state.setHydrated();
        }
      },
    },
  ),
);
