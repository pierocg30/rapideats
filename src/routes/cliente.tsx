import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publishEvent, subscribeEvents, subscribeGps, type EventRow } from "@/lib/eventosService";
import { MiniMap } from "@/components/MiniMap";

export const Route = createFileRoute("/cliente")({
  head: () => ({ meta: [{ title: "Cliente — EDA Last-Mile" }] }),
  component: ClientePage,
});

type Order = {
  id: string; customer_name: string; restaurant_name: string; total: number; status: string;
  driver_id: string | null;
  pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number;
};

function ClientePage() {
  const [customer, setCustomer] = useState("Juan Pérez");
  const [restaurant, setRestaurant] = useState("La Pizzería");
  const [creating, setCreating] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);

  // Suscripción a eventos del pedido
  useEffect(() => {
    if (!order) return;
    const unsubE = subscribeEvents((e) => setEvents((prev) => [e, ...prev].slice(0, 50)), order.id);
    const unsubG = subscribeGps(order.id, (p) => setDriverPos({ lat: p.lat, lng: p.lng }));
    // refrescar orden cuando cambie
    const ch = supabase.channel(`order:${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (p) => setOrder(p.new as Order))
      .subscribe();
    return () => { unsubE(); unsubG(); supabase.removeChannel(ch); };
  }, [order?.id]);

  async function createOrder() {
    setCreating(true);
    setEvents([]); setDriverPos(null);
    const { data, error } = await supabase.from("orders").insert({
      customer_name: customer, restaurant_name: restaurant,
      items: [{ name: "Pizza Margherita", qty: 1, price: 180 }],
      total: 180, status: "created",
    }).select().single();
    setCreating(false);
    if (error) { alert(error.message); return; }
    setOrder(data as Order);
    await publishEvent("pedido.creado", data.id, { customer, restaurant });
  }

  async function pagar() {
    if (!order) return;
    await supabase.from("orders").update({ status: "payment_processed" }).eq("id", order.id);
    await publishEvent("pago.procesado", order.id, { amount: order.total });
  }

  async function pedirReembolso() {
    if (!order) return;
    await supabase.functions.invoke("refund-saga", { body: { order_id: order.id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Inicio</Link>
          <h1 className="font-semibold">🧑 Cliente</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {!order ? (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Nuevo pedido</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input className="rounded-md border bg-background px-3 py-2" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Tu nombre" />
              <input className="rounded-md border bg-background px-3 py-2" value={restaurant} onChange={(e) => setRestaurant(e.target.value)} placeholder="Restaurante" />
            </div>
            <button onClick={createOrder} disabled={creating}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {creating ? "Creando..." : "Crear pedido (publica pedido.creado)"}
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Pedido #{order.id.slice(0, 8)}</h2>
                  <p className="text-sm text-muted-foreground">{order.restaurant_name} · ${order.total}</p>
                  <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium">{order.status}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={pagar} disabled={order.status !== "created"}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
                    Pagar
                  </button>
                  <button onClick={pedirReembolso}
                    className="rounded-md border border-destructive px-3 py-1.5 text-sm text-destructive">
                    Reembolso (Saga)
                  </button>
                  <button onClick={() => setOrder(null)} className="rounded-md border px-3 py-1.5 text-sm">Nuevo</button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Mapa en vivo</h3>
                <MiniMap
                  pickup={{ lat: order.pickup_lat, lng: order.pickup_lng }}
                  dropoff={{ lat: order.dropoff_lat, lng: order.dropoff_lng }}
                  driver={driverPos}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Posición del repartidor vía Realtime broadcast (canal <code>gps:{order.id.slice(0,8)}</code>).
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">Timeline de eventos</h3>
                <ol className="space-y-2 text-sm">
                  {events.length === 0 && <li className="text-muted-foreground">Esperando eventos…</li>}
                  {events.map((e) => (
                    <li key={e.id} className="rounded-md border-l-2 border-primary bg-muted/30 p-2">
                      <div className="font-mono text-xs text-primary">{e.topic}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
