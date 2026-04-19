import { supabase } from "@/integrations/supabase/client";

// Publica un evento llamando a la edge function (Kafka analog).
export async function publishEvent(topic: string, aggregate_id?: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("publish-event", {
    body: { topic, aggregate_id, payload, event_id: crypto.randomUUID() },
  });
  if (error) throw error;
  return data as { ok: boolean; id: string };
}

// Suscripción a la tabla events (consumer group del frontend = "ui-timeline")
export type EventRow = {
  id: string;
  topic: string;
  aggregate_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export function subscribeEvents(onEvent: (e: EventRow) => void, aggregateId?: string) {
  const ch = supabase
    .channel(`events:${aggregateId ?? "all"}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "events" },
      (p) => {
        const row = p.new as EventRow;
        if (aggregateId && row.aggregate_id !== aggregateId) return;
        onEvent(row);
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// GPS: canal Realtime broadcast — análogo a Redis Pub/Sub (baja latencia, sin persistencia obligatoria)
export function publishGps(orderId: string, lat: number, lng: number, driverId?: string) {
  const ch = supabase.channel(`gps:${orderId}`);
  ch.send({ type: "broadcast", event: "ping", payload: { lat, lng, driverId, ts: Date.now() } });
  // También persistimos histórico ligero
  supabase.from("gps_pings").insert({ order_id: orderId, driver_id: driverId ?? null, lat, lng }).then(() => null);
}

export function subscribeGps(orderId: string, onPing: (p: { lat: number; lng: number; ts: number }) => void) {
  const ch = supabase
    .channel(`gps:${orderId}`)
    .on("broadcast", { event: "ping" }, (msg) => onPing(msg.payload as any))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// Haversine
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Interpolación lineal entre dos puntos (para suavizar el movimiento del marcador)
export function interpolate(a: { lat: number; lng: number }, b: { lat: number; lng: number }, t: number) {
  return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
}
