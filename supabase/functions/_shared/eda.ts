// Helpers compartidos: idempotencia, DLQ, circuit breaker.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function alreadyProcessed(sb: SupabaseClient, eventId: string, consumer: string) {
  const { data } = await sb.from("processed_events").select("event_id").eq("event_id", eventId).eq("consumer", consumer).maybeSingle();
  return !!data;
}
export async function markProcessed(sb: SupabaseClient, eventId: string, consumer: string) {
  await sb.from("processed_events").insert({ event_id: eventId, consumer }).then(() => null, () => null);
}
export async function sendToDLQ(sb: SupabaseClient, args: { event_id: string; topic: string; consumer: string; payload: any; error: string; attempts: number; }) {
  const backoffMs = Math.min(60_000, 1000 * Math.pow(2, args.attempts));
  await sb.from("dlq").insert({
    event_id: args.event_id, topic: args.topic, consumer: args.consumer,
    payload: args.payload, error: args.error, attempts: args.attempts,
    next_retry_at: new Date(Date.now() + backoffMs).toISOString(),
  });
}

// Circuit breaker: 50% errores en 60s -> abierto
export async function cbAllow(sb: SupabaseClient, service: string): Promise<boolean> {
  const { data } = await sb.from("circuit_state").select("*").eq("service", service).maybeSingle();
  if (!data) {
    await sb.from("circuit_state").insert({ service }).then(() => null, () => null);
    return true;
  }
  if (data.status === "open") {
    const opened = new Date(data.opened_at ?? data.updated_at).getTime();
    if (Date.now() - opened > 30_000) {
      await sb.from("circuit_state").update({ status: "half_open", updated_at: new Date().toISOString() }).eq("service", service);
      return true;
    }
    return false;
  }
  return true;
}
export async function cbRecord(sb: SupabaseClient, service: string, ok: boolean) {
  const { data } = await sb.from("circuit_state").select("*").eq("service", service).maybeSingle();
  if (!data) return;
  let { failures, successes, window_start, status } = data as any;
  const winAge = Date.now() - new Date(window_start).getTime();
  if (winAge > 60_000) { failures = 0; successes = 0; window_start = new Date().toISOString(); }
  if (ok) successes++; else failures++;
  const total = failures + successes;
  let newStatus = status;
  let opened_at = data.opened_at;
  if (status === "half_open") {
    newStatus = ok ? "closed" : "open";
    if (newStatus === "open") opened_at = new Date().toISOString();
  } else if (total >= 4 && failures / total >= 0.5) {
    newStatus = "open";
    opened_at = new Date().toISOString();
  }
  await sb.from("circuit_state").update({
    failures, successes, window_start, status: newStatus, opened_at,
    updated_at: new Date().toISOString(),
  }).eq("service", service);
}
