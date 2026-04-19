import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publishEvent } from "@/lib/eventosService";

export const Route = createFileRoute("/restaurante")({
  head: () => ({ meta: [{ title: "Restaurante — EDA Last-Mile" }] }),
  component: RestaurantePage,
});

type Order = { id: string; customer_name: string; restaurant_name: string; total: number; status: string; created_at: string };

function RestaurantePage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    const { data } = await supabase.from("orders").select("*")
      .in("status", ["created", "payment_processed", "restaurant_confirmed", "matched"])
      .order("created_at", { ascending: false }).limit(20);
    setOrders((data ?? []) as Order[]);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("rest-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function confirmar(o: Order) {
    await supabase.from("orders").update({ status: "restaurant_confirmed" }).eq("id", o.id);
    await publishEvent("pedido.confirmado_por_restaurante", o.id, { restaurant: o.restaurant_name });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Inicio</Link>
          <h1 className="font-semibold">🍔 Restaurante</h1>
          <div className="w-16" />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="mb-4 text-lg font-semibold">Pedidos entrantes</h2>
        <div className="space-y-3">
          {orders.length === 0 && <p className="text-sm text-muted-foreground">Sin pedidos aún.</p>}
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
              <div>
                <div className="font-medium">{o.restaurant_name} · {o.customer_name}</div>
                <div className="text-xs text-muted-foreground">#{o.id.slice(0,8)} · ${o.total} · <span className="font-mono">{o.status}</span></div>
              </div>
              <button onClick={() => confirmar(o)}
                disabled={o.status !== "payment_processed" && o.status !== "created"}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
                Confirmar
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
