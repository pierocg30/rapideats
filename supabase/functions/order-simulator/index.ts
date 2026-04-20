// Simulador EDA: orquesta el ciclo del pedido publicando eventos
// y emitiendo GPS por Realtime broadcast siguiendo una ruta real (OSRM).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function publish(sb: any, topic: string, aggregate_id: string, payload: any) {
  await sb.from("events").insert({ id: crypto.randomUUID(), topic, aggregate_id, payload });
}

// Llama a OSRM (servicio público) para obtener una ruta real por calles.
// Devuelve un array de [lat,lng]. Si falla, hace fallback a línea recta interpolada.
async function getRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }, fallbackSteps = 20): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { headers: { "User-Agent": "RapidEats-Sim/1.0" } });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const json = await res.json();
    const coords = json?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
    if (!coords || coords.length < 2) throw new Error("no coords");
    // OSRM devuelve [lng, lat] → invertir a [lat, lng]
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch (e) {
    console.warn("OSRM fallback:", e);
    const out: [number, number][] = [];
    for (let i = 0; i <= fallbackSteps; i++) {
      const t = i / fallbackSteps;
      out.push([from.lat + (to.lat - from.lat) * t, from.lng + (to.lng - from.lng) * t]);
    }
    return out;
  }
}

// Densifica la ruta interpolando puntos intermedios entre cada par consecutivo
// para que el movimiento sea fluido aunque OSRM dé pocos vértices.
function densify(route: [number, number][], minPoints = 30): [number, number][] {
  if (route.length >= minPoints) return route;
  const factor = Math.ceil(minPoints / Math.max(1, route.length - 1));
  const out: [number, number][] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const [a, b] = [route[i], route[i + 1]];
    for (let j = 0; j < factor; j++) {
      const t = j / factor;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  out.push(route[route.length - 1]);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: cors });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
      // Punto inicial del repartidor: ~600m del restaurante
      const startLat = order.pickup_lat - 0.006;
      const startLng = order.pickup_lng - 0.006;
      const { data: driver } = await sb.from("drivers").insert({
        name: driverName,
        available: false,
        current_lat: startLat,
        current_lng: startLng,
      }).select().single();
      await sb.from("orders").update({ status: "matched", driver_id: driver.id }).eq("id", order_id);
      await publish(sb, "repartidor.asignado", order_id, { driver_id: driver.id, driver_name: driverName });

      // 4) Ruta real driver → restaurante
      const routeToPickup = densify(
        await getRoute({ lat: startLat, lng: startLng }, { lat: order.pickup_lat, lng: order.pickup_lng }),
        30,
      );
      for (const [lat, lng] of routeToPickup) {
        await wait(700);
        await channel.send({ type: "broadcast", event: "ping", payload: { lat, lng, driverId: driver.id, ts: Date.now() } });
        await sb.from("gps_pings").insert({ order_id, driver_id: driver.id, lat, lng });
      }

      // 5) Pickup
      await sb.from("orders").update({ status: "picked_up" }).eq("id", order_id);
      await publish(sb, "pedido.recogido", order_id, { driver_name: driverName });
      await wait(1500);

      // 6) En camino → cliente (ruta real)
      await sb.from("orders").update({ status: "in_transit" }).eq("id", order_id);
      await publish(sb, "pedido.en_camino", order_id, {});
      const routeToDropoff = densify(
        await getRoute({ lat: order.pickup_lat, lng: order.pickup_lng }, { lat: order.dropoff_lat, lng: order.dropoff_lng }),
        50,
      );
      for (const [lat, lng] of routeToDropoff) {
        await wait(700);
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
