// Consumer: notificaciones con Circuit Breaker simulando proveedor SMS.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { alreadyProcessed, markProcessed, sendToDLQ, cbAllow, cbRecord } from "../_shared/eda.ts";

const CONSUMER = "notifications-consumer";
const SERVICE = "sms-provider";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const evt = await req.json();
  try {
    if (await alreadyProcessed(sb, evt.event_id, CONSUMER))
      return new Response(JSON.stringify({ skipped: "duplicate" }), { headers: cors });

    const allow = await cbAllow(sb, SERVICE);
    if (!allow) {
      await sendToDLQ(sb, { event_id: evt.event_id, topic: evt.topic, consumer: CONSUMER, payload: evt, error: "circuit open", attempts: 1 });
      return new Response(JSON.stringify({ rejected: "circuit_open" }), { headers: cors });
    }

    // Simula fallo aleatorio del proveedor SMS (30%)
    const failed = Math.random() < 0.3;
    await cbRecord(sb, SERVICE, !failed);
    if (failed) {
      await sendToDLQ(sb, { event_id: evt.event_id, topic: evt.topic, consumer: CONSUMER, payload: evt, error: "SMS provider timeout", attempts: 1 });
      return new Response(JSON.stringify({ failed: true }), { status: 502, headers: cors });
    }

    // Publica notificación enviada
    await sb.from("events").insert({ topic: "notificacion.enviada", aggregate_id: evt.aggregate_id, payload: { source: evt.topic } });
    await markProcessed(sb, evt.event_id, CONSUMER);
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (e) {
    await sendToDLQ(sb, { event_id: evt.event_id, topic: evt.topic, consumer: CONSUMER, payload: evt, error: String(e), attempts: 1 });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
