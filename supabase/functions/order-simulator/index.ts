// Simulador EDA: orquesta el ciclo completo del pedido publicando eventos
// y emitiendo GPS por Realtime broadcast (analogo a Redis Pub/Sub).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

async function publish(sb: any, topic: string, aggregate_id: string, payload: any) {
  await sb.from("events").insert({ id: crypto.randomUUID(), topic, aggregate_id, payload });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: cors });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ejecutamos la simulación de fondo, devolvemos rápido
    (async () => {
      const { data: order } = await sb.from("orders").select("*").eq("id", order_id).single();
      if (!order) return;

      const channel = sb.channel(`gps:${order_id}`, { config: { broadcast: { self: true } } });
      await channel.subscribe();

      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // 1) Restaurante acepta
      await wait(2500);
      await sb.from("orders").update({ status: "restaurant_confirmed" }).eq("id", order_id);
      await publish(sb, "pedido.aceptado_por_restaurante", order_id, { restaurant: order.restaurant_name });

      // 2) Preparando
      await wait(4000);
      await publish(sb, "pedido.en_preparacion", order_id, {});

      // 3) Repartidor asignado, va al local
      await wait(4000);
      const drivers = ["Carlos Mendoza", "Ana Rivera", "Luis Pérez", "María González", "Diego Torres"];
      const driverName = drivers[Math.floor(Math.random() * drivers.length)];
      const { data: driver } = await sb.from("drivers").insert({
        name: driverName,
        available: false,
        current_lat: order.pickup_lat - 0.008,
        current_lng: order.pickup_lng - 0.008,
      }).select().single();
      await sb.from("orders").update({ status: "matched", driver_id: driver.id }).eq("id", order_id);
      await publish(sb, "repartidor.asignado", order_id, { driver_id: driver.id, driver_name: driverName });

      // 4) GPS: ruta del repartidor → restaurante (10 pings)
      const startLat = driver.current_lat, startLng = driver.current_lng;
      for (let i = 1; i <= 10; i++) {
        await wait(1500);
        const t = i / 10;
        const lat = lerp(startLat, order.pickup_lat, t);
        const lng = lerp(startLng, order.pickup_lng, t);
        await channel.send({ type: "broadcast", event: "ping", payload: { lat, lng, driverId: driver.id, ts: Date.now() } });
        await sb.from("gps_pings").insert({ order_id, driver_id: driver.id, lat, lng });
      }

      // 5) Pickup
      await sb.from("orders").update({ status: "picked_up" }).eq("id", order_id);
      await publish(sb, "pedido.recogido", order_id, { driver_name: driverName });

      // 6) En camino → cliente (15 pings, + suave)
      await wait(1500);
      await sb.from("orders").update({ status: "in_transit" }).eq("id", order_id);
      await publish(sb, "pedido.en_camino", order_id, {});
      for (let i = 1; i <= 15; i++) {
        await wait(1500);
        const t = i / 15;
        const lat = lerp(order.pickup_lat, order.dropoff_lat, t);
        const lng = lerp(order.pickup_lng, order.dropoff_lng, t);
        await channel.send({ type: "broadcast", event: "ping", payload: { lat, lng, driverId: driver.id, ts: Date.now() } });
        await sb.from("gps_pings").insert({ order_id, driver_id: driver.id, lat, lng });
      }

      // 7) Entregado
      await sb.from("orders").update({ status: "delivered" }).eq("id", order_id);
      await publish(sb, "pedido.entregado", order_id, { driver_name: driverName });
      await sb.removeChannel(channel);
    })().catch((e) => console.error("sim error", e));

    return new Response(JSON.stringify({ ok: true, started: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
