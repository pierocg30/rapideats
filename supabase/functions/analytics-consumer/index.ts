// Consumer group: analytics (solo registra métricas, idempotente).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { alreadyProcessed, markProcessed } from "../_shared/eda.ts";

const CONSUMER = "analytics-consumer";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const evt = await req.json();
  if (await alreadyProcessed(sb, evt.event_id, CONSUMER))
    return new Response(JSON.stringify({ skipped: true }), { headers: cors });
  // Aquí podrías actualizar dashboards/contadores; en MVP solo marcamos.
  await markProcessed(sb, evt.event_id, CONSUMER);
  return new Response(JSON.stringify({ ok: true }), { headers: cors });
});
