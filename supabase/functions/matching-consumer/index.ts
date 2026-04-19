// Consumer group: matching. Implementa correlación AND.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { alreadyProcessed, markProcessed, sendToDLQ } from "../_shared/eda.ts";

const CONSUMER = "matching-consumer";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const evt = await req.json();
  try {
    if (await alreadyProcessed(sb, evt.event_id, CONSUMER))
      return new Response(JSON.stringify({ skipped: "duplicate" }), { headers: cors });

    if (!["pago.procesado", "pedido.confirmado_por_restaurante"].includes(evt.topic)) {
      await markProcessed(sb, evt.event_id, CONSUMER);
      return new Response(JSON.stringify({ ignored: true }), { headers: cors });
    }

    const orderId = evt.aggregate_id;
    // Upsert matching state
    const { data: existing } = await sb.from("matching_state").select("*").eq("order_id", orderId).maybeSingle();
    const now = new Date();
    const expired = existing && new Date(existing.expires_at) < now;
    const base = (!existing || expired)
      ? { order_id: orderId, payment_done: false, restaurant_done: false, expires_at: new Date(Date.now() + 10*60*1000).toISOString(), matched_at: null }
      : existing;

    if (evt.topic === "pago.procesado") base.payment_done = true;
    if (evt.topic === "pedido.confirmado_por_restaurante") base.restaurant_done = true;

    await sb.from("matching_state").upsert(base);

    if (base.payment_done && base.restaurant_done && !base.matched_at) {
      // Asignar repartidor disponible
      const { data: driver } = await sb.from("drivers").select("*").eq("available", true).limit(1).maybeSingle();
      if (driver) {
        await sb.from("drivers").update({ available: false }).eq("id", driver.id);
        await sb.from("orders").update({ driver_id: driver.id, status: "matched" }).eq("id", orderId);
        await sb.from("matching_state").update({ matched_at: new Date().toISOString() }).eq("order_id", orderId);
        // Publicar evento de match
        await sb.from("events").insert({ topic: "repartidor.asignado", aggregate_id: orderId, payload: { driver_id: driver.id, driver_name: driver.name } });
      }
    }

    await markProcessed(sb, evt.event_id, CONSUMER);
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (e) {
    await sendToDLQ(sb, { event_id: evt.event_id, topic: evt.topic, consumer: CONSUMER, payload: evt, error: String(e), attempts: 1 });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
