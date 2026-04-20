import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { MiniMap } from "@/components/MiniMap";
import { subscribeEvents, subscribeGps, haversineKm, type EventRow } from "@/lib/eventosService";

const TOPIC_META: Record<string, { label: string; icon: string; tone: string }> = {
  "pedido.creado": { label: "Pedido creado", icon: "🧾", tone: "bg-muted text-foreground" },
  "pago.procesado": { label: "Pago confirmado", icon: "💳", tone: "bg-emerald-100 text-emerald-700" },
  "pedido.aceptado_por_restaurante": { label: "Restaurante aceptó tu pedido", icon: "✅", tone: "bg-emerald-100 text-emerald-700" },
  "pedido.en_preparacion": { label: "Preparando tu pedido", icon: "👨‍🍳", tone: "bg-amber-100 text-amber-700" },
  "repartidor.asignado": { label: "Repartidor asignado", icon: "🛵", tone: "bg-sky-100 text-sky-700" },
  "pedido.recogido": { label: "Pedido recogido del local", icon: "📦", tone: "bg-indigo-100 text-indigo-700" },
  "pedido.en_camino": { label: "En camino a tu casa", icon: "🚚", tone: "bg-blue-100 text-blue-700" },
  "pedido.entregado": { label: "¡Pedido entregado!", icon: "🎉", tone: "bg-primary/15 text-primary" },
};

function prettyTopic(topic: string) {
  return TOPIC_META[topic] ?? {
    label: topic.replace(/\./g, " · ").replace(/_/g, " "),
    icon: "📌",
    tone: "bg-muted text-foreground",
  };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const Route = createFileRoute("/track/$id")({
  head: () => ({ meta: [{ title: "Sigue tu pedido — RapidEats" }] }),
  component: TrackPage,
});

type Order = {
  id: string; customer_name: string; restaurant_name: string; total: number;
  status: string; driver_id: string | null;
  pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number;
  delivery_address: string | null; eta_minutes: number | null;
  items: Array<{ name: string; qty: number; price: number }>;
  created_at: string;
};

const STEPS = [
  { key: "payment_processed", label: "Pago confirmado", icon: "💳", desc: "Tu pago se procesó correctamente" },
  { key: "restaurant_confirmed", label: "Restaurante aceptó", icon: "✅", desc: "Tu pedido fue aceptado" },
  { key: "in_preparation", label: "Preparando tu pedido", icon: "👨‍🍳", desc: "Cocinando con cariño" },
  { key: "matched", label: "Repartidor en camino al local", icon: "🛵", desc: "Va a recoger tu pedido" },
  { key: "picked_up", label: "Pedido recogido", icon: "📦", desc: "Saliendo del restaurante" },
  { key: "in_transit", label: "En camino a tu casa", icon: "🚚", desc: "¡Casi llega!" },
  { key: "delivered", label: "Entregado", icon: "🎉", desc: "¡Provecho!" },
] as const;

function statusIndex(order: Order, events: EventRow[]) {
  if (order.status === "delivered") return 6;
  if (order.status === "in_transit") return 5;
  if (order.status === "picked_up") return 4;
  if (order.status === "matched") return 3;
  if (events.some((e) => e.topic === "pedido.en_preparacion")) return 2;
  if (order.status === "restaurant_confirmed") return 1;
  if (order.status === "payment_processed" || order.status === "created") return 0;
  return 0;
}

function TrackPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);

  // Cargar orden + suscripciones
  useEffect(() => {
    supabase.from("orders").select("*").eq("id", id).single()
      .then(({ data }) => setOrder(data as unknown as Order));
    supabase.from("events").select("*").eq("aggregate_id", id).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setEvents((data ?? []) as EventRow[]));

    const ch = supabase.channel(`order:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (p) => setOrder(p.new as unknown as Order))
      .subscribe();

    const unsubE = subscribeEvents((e) => setEvents((prev) => [e, ...prev].slice(0, 100)), id);
    const unsubG = subscribeGps(id, (p) => setDriverPos({ lat: p.lat, lng: p.lng }));

    return () => { supabase.removeChannel(ch); unsubE(); unsubG(); };
  }, [id]);

  const idx = order ? statusIndex(order, events) : 0;

  // ETA: distancia restante / velocidad estimada
  const eta = useMemo(() => {
    if (!order) return null;
    if (order.status === "delivered") return 0;
    const target = idx >= 4 ? { lat: order.dropoff_lat, lng: order.dropoff_lng } : { lat: order.pickup_lat, lng: order.pickup_lng };
    const from = driverPos ?? { lat: order.pickup_lat, lng: order.pickup_lng };
    const km = haversineKm(from, target);
    const speedKmh = 25;
    let mins = Math.max(1, Math.round((km / speedKmh) * 60));
    if (idx <= 2) mins += 8; // tiempo cocción restante estimado
    return mins;
  }, [order, driverPos, idx]);

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-3xl px-4 py-10 text-center text-muted-foreground">Cargando pedido…</div>
      </div>
    );
  }

  const isDone = order.status === "delivered";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Inicio</Link>

        {/* Hero ETA */}
        <div className="mt-3 overflow-hidden rounded-3xl border" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-soft)" }}>
          <div className="p-6 text-primary-foreground sm:p-8">
            <div className="text-xs uppercase tracking-wider opacity-90">Pedido #{order.id.slice(0, 8)}</div>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              {isDone ? "¡Disfruta tu pedido! 🎉" : eta != null ? `Llega en ~${eta} min` : "Calculando…"}
            </h1>
            <p className="mt-1 text-sm opacity-90">
              {isDone ? "Esperamos verte pronto." : STEPS[idx]?.desc ?? ""}
            </p>
          </div>
        </div>

        {/* Mapa */}
        <section className="mt-6 rounded-2xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Ubicación en vivo</h2>
          <MiniMap
            pickup={{ lat: order.pickup_lat, lng: order.pickup_lng }}
            dropoff={{ lat: order.dropoff_lat, lng: order.dropoff_lng }}
            driver={driverPos}
            height={300}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            📍 Entregando en: <span className="text-foreground">{order.delivery_address ?? "—"}</span>
          </p>
        </section>

        {/* Stepper */}
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Estado del pedido</h2>
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const done = i < idx;
              const active = i === idx;
              return (
                <li key={s.key} className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 text-base ${
                    done ? "border-accent bg-accent text-accent-foreground" :
                    active ? "border-primary bg-primary text-primary-foreground animate-pulse" :
                    "border-border bg-background text-muted-foreground"
                  }`}>
                    {done ? "✓" : s.icon}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className={`text-sm font-medium ${active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Resumen */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Tu pedido</h3>
            <div className="text-sm text-muted-foreground">{order.restaurant_name}</div>
            <ul className="mt-3 space-y-1 text-sm">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>{it.qty}× {it.name}</span><span>${(it.price * it.qty).toFixed(0)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t pt-2 text-sm font-bold">
              <span>Total</span><span>${Number(order.total).toFixed(0)}</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Línea de tiempo</h3>
            <ol className="max-h-64 space-y-2 overflow-y-auto pr-2 text-xs">
              {events.length === 0 && <li className="text-muted-foreground">Sin eventos aún…</li>}
              {events.map((e) => (
                <li key={e.id} className="rounded-lg border-l-2 border-primary bg-muted/30 p-2">
                  <div className="font-mono text-[11px] text-primary">{e.topic}</div>
                  <div className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {isDone && (
          <Link to="/" className="mt-6 block w-full rounded-full py-3 text-center text-sm font-bold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}>
            Hacer otro pedido
          </Link>
        )}
      </main>
    </div>
  );
}
