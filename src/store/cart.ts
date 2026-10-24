import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  productId: number;
  sku: string | null;
  slug: string;
  name: string;
  variantLabel: string | null;
  purchaseOption: "product_only" | "complete_package";
  customization: Record<string, string> | null;
  imageUrl: string | null;
  unitPrice: number; // kobo — display only; the server re-prices at checkout
  quantity: number;
  maxStock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "id">) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

/**
 * Server rendering must never disagree with the client's first paint: cart
 * contents only exist in localStorage, so UI that reflects them (header badge,
 * WhatsApp float offset) reads through this gate and renders the empty state
 * until the persisted store has rehydrated.
 */
let cartHydrated = false;
export const useCartHydrated = create<{ hydrated: boolean }>(() => ({ hydrated: false }));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      add: (item) => {
        const customizationKey = item.customization
          ? JSON.stringify(item.customization)
          : "";
        const id = `${item.productId}::${item.variantLabel ?? ""}::${item.purchaseOption}::${customizationKey}`;
        const existing = get().items.find((i) => i.id === id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === id
                ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.maxStock) }
                : i,
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, id }] });
        }
        set({ isOpen: true });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQuantity: (id, quantity) =>
        set({
          items: get()
            .items.map((i) =>
              i.id === id ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) } : i,
            )
            .filter((i) => i.quantity > 0),
        }),
      clear: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "dfk-cart",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

if (typeof window !== "undefined") {
  // With synchronous localStorage the rehydrate pass can finish before this
  // subscription is registered — check the flag first, then listen.
  const syncFlag = () => {
    cartHydrated = true;
    useCartHydrated.setState({ hydrated: true });
  };
  if (useCart.persist.hasHydrated()) syncFlag();
  else useCart.persist.onFinishHydration(syncFlag);
}

export function hasCartHydrated(): boolean {
  return cartHydrated || useCart.persist.hasHydrated();
}