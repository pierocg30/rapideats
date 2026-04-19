// Saga orquestada: reembolso.
// Pasos: 1) validar orden  2) reembolsar pago  3) liberar repartidor  4) marcar refunded
// Compensación si falla: revertir paso anterior.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { order_id, force_fail_step } = await req.json();
    const { data: order } = await sb.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (!order) return new Response(JSON.stringify({ error: "order not found" }), { status: 404, headers: cors });

    const { data: saga } = await sb.from("saga_executions").insert({
      saga_type: "refund", order_id, status: "running", context: { previous_status: order.status, driver_id: order.driver_id },
    }).select().single();

    const log = async (i: number, name: string, status: string, output: any = null, error: string | null = null) => {
      await sb.from("saga_steps").insert({ saga_id: saga.id, step_index: i, name, status, output, error });
      await sb.from("saga_executions").update({ current_step: i, updated_at: new Date().toISOString() }).eq("id", saga.id);
    };
    const compensate = async (uptoStep: number, reason: string) => {
      // Revierte: si liberamos driver, lo reasignamos; si cambiamos estado, lo restauramos.
      if (uptoStep >= 3) await sb.from("drivers").update({ available: false }).eq("id", order.driver_id);
      await sb.from("orders").update({ status: order.status }).eq("id", order_id);
      await sb.from("saga_executions").update({ status: "compensated", updated_at: new Date().toISOString() }).eq("id", saga.id);
      await sb.from("events").insert({ topic: "saga.compensated", aggregate_id: order_id, payload: { saga_id: saga.id, reason } });
    };

    try {
      // Paso 1
      await log(1, "validate_order", "done", { status: order.status });
      if (force_fail_step === 1) throw new Error("forced fail step 1");
      // Paso 2: reembolsar
      if (force_fail_step === 2) { await log(2, "refund_payment", "failed", null, "gateway error"); throw new Error("refund failed"); }
      await log(2, "refund_payment", "done", { amount: order.total });
      // Paso 3: liberar repartidor
      if (order.driver_id) await sb.from("drivers").update({ available: true }).eq("id", order.driver_id);
      if (force_fail_step === 3) { await log(3, "release_driver", "failed", null, "could not release"); throw new Error("release failed"); }
      await log(3, "release_driver", "done", { driver_id: order.driver_id });
      // Paso 4: estado refunded
      await sb.from("orders").update({ status: "refunded", driver_id: null }).eq("id", order_id);
      await log(4, "mark_refunded", "done");

      await sb.from("saga_executions").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", saga.id);
      await sb.from("events").insert({ topic: "reembolso.completado", aggregate_id: order_id, payload: { saga_id: saga.id } });
      return new Response(JSON.stringify({ ok: true, saga_id: saga.id }), { headers: cors });
    } catch (e) {
      await compensate((saga as any).current_step ?? 0, String(e));
      return new Response(JSON.stringify({ compensated: true, error: String(e) }), { status: 200, headers: cors });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
