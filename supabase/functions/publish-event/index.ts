// Publisher: inserta evento en event store (Kafka analog).
// Los consumers escuchan via Realtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { topic, aggregate_id, payload, event_id } = await req.json();
    if (!topic) return new Response(JSON.stringify({ error: "topic required" }), { status: 400, headers: cors });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const id = event_id ?? crypto.randomUUID();
    const { error } = await sb.from("events").insert({
      id, topic, aggregate_id: aggregate_id ?? null, payload: payload ?? {},
    });
    if (error) throw error;

    // Trigger consumers (fan-out)
    const fnUrl = Deno.env.get("SUPABASE_URL")! + "/functions/v1";
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` };
    const consumers = ["matching-consumer", "notifications-consumer", "analytics-consumer"];
    await Promise.all(consumers.map(c =>
      fetch(`${fnUrl}/${c}`, { method: "POST", headers, body: JSON.stringify({ event_id: id, topic, aggregate_id, payload }) })
        .catch(() => null)
    ));

    return new Response(JSON.stringify({ ok: true, id }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
