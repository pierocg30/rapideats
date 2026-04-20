import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/restaurant/$id")({
  head: () => ({ meta: [{ title: "Restaurante — RapidEats" }] }),
  component: RestaurantPage,
});

type Restaurant = {
  id: string; name: string; category: string; rating: number;
  delivery_minutes: number; delivery_fee: number; image_url: string;
};
type Product = {
  id: string; restaurant_id: string; name: string; description: string;
  price: number; image_url: string; category: string;
};

function RestaurantPage() {
  const { id } = Route.useParams();
  const [r, setR] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string>("");
  const cart = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("restaurants").select("*").eq("id", id).single()
      .then(({ data }) => setR(data as Restaurant));
    supabase.from("products").select("*").eq("restaurant_id", id).order("category")
      .then(({ data }) => {
        const list = (data ?? []) as Product[];
        setProducts(list);
        if (list[0]) setActiveCat(list[0].category);
      });
  }, [id]);

  const cats = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {r && (
        <>
          <div className="relative h-56 w-full overflow-hidden sm:h-72">
            <img src={r.image_url} alt={r.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          </div>

          <div className="mx-auto -mt-20 max-w-6xl px-4 sm:px-6">
            <div className="rounded-2xl border bg-card p-5 shadow-lg" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Inicio</Link>
                  <h1 className="mt-1 text-2xl font-bold text-foreground">{r.name}</h1>
                  <p className="text-sm text-muted-foreground">{r.category}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-secondary px-3 py-1 font-medium">⭐ {Number(r.rating).toFixed(1)}</span>
                  <span className="rounded-full bg-secondary px-3 py-1">⏱ {r.delivery_minutes} min</span>
                  <span className="rounded-full bg-secondary px-3 py-1">🛵 ${Number(r.delivery_fee).toFixed(0)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 sticky top-[72px] z-20 bg-background/80 py-2 backdrop-blur">
              {cats.map((c) => (
                <button key={c} onClick={() => setActiveCat(c)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium ${
                    activeCat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"
                  }`}>
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4 pb-32 sm:grid-cols-2">
              {products.filter((p) => p.category === activeCat).map((p) => (
                <div key={p.id} className="flex gap-4 overflow-hidden rounded-2xl border bg-card p-3 transition hover:shadow-md">
                  <img src={p.image_url} alt={p.name} className="h-24 w-24 flex-shrink-0 rounded-xl object-cover" loading="lazy" />
                  <div className="flex flex-1 flex-col">
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-bold text-foreground">${Number(p.price).toFixed(0)}</span>
                      <button
                        onClick={() => cart.add({
                          product_id: p.id, restaurant_id: p.restaurant_id,
                          name: p.name, price: Number(p.price), image_url: p.image_url,
                        })}
                        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
                        + Agregar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {cart.count > 0 && (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card p-3 shadow-lg sm:p-4">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="font-semibold">{cart.count} producto{cart.count > 1 ? "s" : ""}</div>
                  <div className="text-muted-foreground">Subtotal ${cart.subtotal.toFixed(0)}</div>
                </div>
                <button onClick={() => navigate({ to: "/cart" })}
                  className="rounded-full px-6 py-3 text-sm font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}>
                  Ver carrito →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
