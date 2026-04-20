import { useEffect, useState } from "react";

export type CartItem = {
  product_id: string;
  restaurant_id: string;
  name: string;
  price: number;
  image_url?: string;
  qty: number;
};

const KEY = "cart:v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart:updated"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => read());
  useEffect(() => {
    const refresh = () => setItems(read());
    window.addEventListener("cart:updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cart:updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return {
    items,
    add: (item: Omit<CartItem, "qty">, qty = 1) => {
      const cur = read();
      const idx = cur.findIndex((x) => x.product_id === item.product_id);
      // Si cambia restaurante, vaciar carrito
      if (cur.length && cur[0].restaurant_id !== item.restaurant_id) {
        write([{ ...item, qty }]);
        return;
      }
      if (idx >= 0) cur[idx].qty += qty;
      else cur.push({ ...item, qty });
      write(cur);
    },
    remove: (product_id: string) => write(read().filter((x) => x.product_id !== product_id)),
    setQty: (product_id: string, qty: number) => {
      const cur = read().map((x) => x.product_id === product_id ? { ...x, qty } : x).filter((x) => x.qty > 0);
      write(cur);
    },
    clear: () => write([]),
    subtotal: items.reduce((s, x) => s + x.price * x.qty, 0),
    count: items.reduce((s, x) => s + x.qty, 0),
  };
}
