"use client";

import { cartReducer, type CartItem } from "@/lib/cartStore";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type { CartItem } from "@/lib/cartStore";

type CartContextValue = {
  cartItems: CartItem[];
  cartTotal: number;
  cartCount: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const initialState = { items: [] as CartItem[] };

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "REMOVE_ITEM", productId });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", productId, quantity });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const { cartTotal, cartCount } = useMemo(() => {
    const total = state.items.reduce(
      (sum, i) => sum + i.salePrice * i.quantity,
      0,
    );
    const count = state.items.reduce((sum, i) => sum + i.quantity, 0);
    return { cartTotal: total, cartCount: count };
  }, [state.items]);

  const value = useMemo(
    () => ({
      cartItems: state.items,
      cartTotal,
      cartCount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [state.items, cartTotal, cartCount, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart doit être utilisé dans un CartProvider");
  }
  return ctx;
}
