/**
 * Panier : état + reducer (useReducer dans cartContext.tsx).
 */

export type CartItem = {
  productId: string;
  name: string;
  photo: string;
  salePrice: number;
  moq: number;
  stock: number;
  quantity: number;
};

export type CartState = { items: CartItem[] };

export type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "CLEAR_CART" };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const incoming = action.payload;
      const cap = (q: number, item: CartItem) =>
        Math.min(Math.max(item.moq, q), item.stock);

      const existing = state.items.find((i) => i.productId === incoming.productId);
      if (existing) {
        const mergedQty = cap(existing.quantity + incoming.quantity, {
          ...existing,
          ...incoming,
        });
        return {
          items: state.items.map((i) =>
            i.productId === incoming.productId
              ? { ...i, ...incoming, quantity: mergedQty }
              : i,
          ),
        };
      }
      return {
        items: [...state.items, { ...incoming, quantity: cap(incoming.quantity, incoming) }],
      };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.productId !== action.productId) };
    case "UPDATE_QUANTITY": {
      const { productId, quantity } = action;
      const item = state.items.find((i) => i.productId === productId);
      if (!item) return state;
      const next = Math.min(Math.max(quantity, item.moq, 1), item.stock);
      if (Number.isNaN(next) || next < item.moq) {
        return state;
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity: next } : i,
        ),
      };
    }
    case "CLEAR_CART":
      return { items: [] };
    default:
      return state;
  }
}
