import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RapidEats — Comida a domicilio en minutos" },
      { name: "description", content: "Pide comida de tus restaurantes favoritos y rastrea tu pedido en tiempo real." },
      { property: "og:title", content: "RapidEats — Comida a domicilio" },
      { property: "og:description", content: "Pide y rastrea tu pedido en tiempo real." },
    ],
  }),
  component: Home,
});

type Restaurant = {
  id: string; name: string; category: string; rating: number;
  delivery_minutes: number; delivery_fee: number; image_url: string;
};

function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Todos");

  useEffect(() => {
    supabase.from("restaurants").select("*").order("rating", { ascending: false })
      .then(({ data }) => setRestaurants((data ?? []) as Restaurant[]));
  }, []);

  const categories = ["Todos", ...Array.from(new Set(restaurants.map((r) => r.category)))];
  const filtered = restaurants.filter((r) =>
    (category === "Todos" || r.category === category) &&
    (search === "" || r.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <AppHeader />

      <section className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          ¿Qué se te antoja hoy? <span className="inline-block">🍕</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Pide a tu restaurante favorito y sigue tu pedido en tiempo real.</p>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm">
          <span className="pl-3 text-muted-foreground">🔍</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar restaurantes…"
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                category === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Link key={r.id} to="/restaurant/$id" params={{ id: r.id }}
              className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:shadow-lg"
              style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="relative h-44 overflow-hidden">
                <img src={r.image_url} alt={r.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                <div className="absolute right-3 top-3 rounded-full bg-card/95 px-2.5 py-1 text-xs font-semibold backdrop-blur">
                  ⭐ {Number(r.rating).toFixed(1)}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{r.name}</h3>
                    <p className="text-xs text-muted-foreground">{r.category}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>⏱ {r.delivery_minutes} min</span>
                  <span>•</span>
                  <span>🛵 ${Number(r.delivery_fee).toFixed(0)} envío</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No encontramos restaurantes.</p>
        )}
      </section>
    </div>
  );
}
