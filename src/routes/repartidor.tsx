import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { publishEvent, publishGps } from "@/lib/eventosService";

export const Route = createFileRoute("/repartidor")({
  head: () => ({ meta: [{ title: "Repartidor — EDA Last-Mile" }] }),
  component: RepartidorPage,
});

type Order = {
  id: string; customer_name: string; restaurant_name: string; status: string;
  pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number;
  driver_id: string | null;
};
type Driver = { id: string; name: string; current_lat: number; current_lng: number };

function RepartidorPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState<string>("");
  const [assigned, setAssigned] = useState<Order | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    supabase.from("drivers").select("*").then(({ data }) => {
      const list = (data ?? []) as Driver[];
      setDrivers(list);
      if (list.length && !driverId) setDriverId(list[0].id);
    });
  }, []);

  // Buscar orden asignada a este repartidor
  useEffect(() => {
    if (!driverId) return;
    const fetchAssigned = async () => {
      const { data } = await supabase.from("orders").select("*")
        .eq("driver_id", driverId).in("status", ["matched","picked_up","in_transit"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      setAssigned((data as Order) ?? null);
    };
    fetchAssigned();
    const ch = supabase.channel(`driver-orders-${driverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `driver_id=eq.${driverId}` },
        () => fetchAssigned())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driverId]);

  // Emitir GPS cada 3s mientras hay orden activa
  useEffect(() => {
    if (!assigned) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      setPos(null);
      return;
    }
    // arrancar en pickup, ir hacia dropoff
    let cur = pos ?? { lat: assigned.pickup_lat, lng: assigned.pickup_lng };
    setPos(cur);
    const target = { lat: assigned.dropoff_lat, lng: assigned.dropoff_lng };
    tickRef.current = window.setInterval(() => {
      cur = { lat: cur.lat + (target.lat - cur.lat) * 0.08, lng: cur.lng + (target.lng - cur.lng) * 0.08 };
      setPos(cur);
      publishGps(assigned.id, cur.lat, cur.lng, driverId);
    }, 3000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [assigned?.id]);

  async function recoger() {
    if (!assigned) return;
    await supabase.from("orders").update({ status: "picked_up" }).eq("id", assigned.id);
    await publishEvent("pedido.recogido", assigned.id);
  }
  async function entregar() {
    if (!assigned) return;
    await supabase.from("orders").update({ status: "delivered" }).eq("id", assigned.id);
    await supabase.from("drivers").update({ available: true }).eq("id", driverId);
    await publishEvent("pedido.entregado", assigned.id);
    setAssigned(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Inicio</Link>
          <h1 className="font-semibold">🛵 Repartidor</h1>
          <div className="w-16" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <div className="rounded-xl border bg-card p-4">
          <label className="text-sm font-medium">Identidad</label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
            className="mt-2 w-full rounded-md border bg-background px-3 py-2">
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {!assigned ? (
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
            Esperando asignación… (matching requiere <code>pago.procesado</code> + <code>pedido.confirmado_por_restaurante</code>)
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Pedido #{assigned.id.slice(0,8)}</h3>
            <p className="text-sm text-muted-foreground">{assigned.restaurant_name} → {assigned.customer_name}</p>
            <p className="mt-2 text-xs">Estado: <span className="font-mono">{assigned.status}</span></p>
            {pos && <p className="mt-1 text-xs text-muted-foreground">GPS: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} (cada 3s)</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={recoger} disabled={assigned.status !== "matched"}
                className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">Recoger</button>
              <button onClick={entregar} disabled={assigned.status === "delivered"}
                className="rounded-md border px-3 py-1.5 text-sm">Entregar</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
