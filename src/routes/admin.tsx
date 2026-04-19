import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin EDA — Observabilidad" }] }),
  component: AdminPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function AdminPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [dlq, setDlq] = useState<any[]>([]);
  const [cb, setCb] = useState<any[]>([]);
  const [matching, setMatching] = useState<any[]>([]);
  const [sagas, setSagas] = useState<any[]>([]);

  async function refresh() {
    const [e, d, c, m, s] = await Promise.all([
      supabase.from("events").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("dlq").select("*").order("created_at", { ascending: false }).limit(15),
      supabase.from("circuit_state").select("*"),
      supabase.from("matching_state").select("*").order("expires_at", { ascending: false }).limit(10),
      supabase.from("saga_executions").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setEvents(e.data ?? []); setDlq(d.data ?? []); setCb(c.data ?? []);
    setMatching(m.data ?? []); setSagas(s.data ?? []);
  }
  useEffect(() => {
    refresh();
    const ch = supabase.channel("admin-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "dlq" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "circuit_state" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "matching_state" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "saga_executions" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Inicio</Link>
          <h1 className="font-semibold">📊 Observabilidad EDA</h1>
          <button onClick={refresh} className="rounded-md border px-2 py-1 text-xs">↻</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title={`Topics (últimos ${events.length})`}>
            <ol className="max-h-72 space-y-1 overflow-auto text-xs">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 border-b py-1">
                  <span className="font-mono text-primary">{e.topic}</span>
                  <span className="text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Circuit Breaker">
            {cb.length === 0 && <p className="text-xs text-muted-foreground">Sin estado aún.</p>}
            {cb.map((c) => (
              <div key={c.service} className="mb-2 flex items-center justify-between rounded border p-2 text-xs">
                <div>
                  <div className="font-medium">{c.service}</div>
                  <div className="text-muted-foreground">ok: {c.successes} · fail: {c.failures}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                  c.status === "open" ? "bg-destructive/20 text-destructive"
                    : c.status === "half_open" ? "bg-yellow-500/20" : "bg-green-500/20"}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </Section>

          <Section title="DLQ (mensajes fallidos)">
            <ol className="max-h-72 space-y-1 overflow-auto text-xs">
              {dlq.length === 0 && <li className="text-muted-foreground">Vacía 🎉</li>}
              {dlq.map((d) => (
                <li key={d.id} className="rounded border border-destructive/30 bg-destructive/5 p-2">
                  <div className="flex justify-between">
                    <span className="font-mono">{d.consumer} ← {d.topic}</span>
                    <span>retry: {d.attempts}</span>
                  </div>
                  <div className="text-muted-foreground">{d.error}</div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Matching AND (TTL 10min)">
            <ol className="space-y-1 text-xs">
              {matching.length === 0 && <li className="text-muted-foreground">Sin estados activos.</li>}
              {matching.map((m) => (
                <li key={m.order_id} className="rounded border p-2">
                  <div className="font-mono">#{m.order_id.slice(0,8)}</div>
                  <div className="mt-1 flex gap-3">
                    <span className={m.payment_done ? "text-green-600" : "text-muted-foreground"}>
                      {m.payment_done ? "✓" : "○"} pago
                    </span>
                    <span className={m.restaurant_done ? "text-green-600" : "text-muted-foreground"}>
                      {m.restaurant_done ? "✓" : "○"} restaurante
                    </span>
                    {m.matched_at && <span className="text-primary">→ matched</span>}
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Sagas">
            <ol className="space-y-1 text-xs">
              {sagas.length === 0 && <li className="text-muted-foreground">Sin sagas ejecutadas.</li>}
              {sagas.map((s) => (
                <li key={s.id} className="flex justify-between rounded border p-2">
                  <span className="font-mono">{s.saga_type} #{s.id.slice(0,6)}</span>
                  <span className={`font-mono ${
                    s.status === "completed" ? "text-green-600"
                      : s.status === "compensated" ? "text-yellow-600"
                      : s.status === "failed" ? "text-destructive" : ""}`}>
                    {s.status} (paso {s.current_step})
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
          💡 Para ver los patrones en acción: crea un pedido en <Link to="/cliente" className="underline">/cliente</Link>,
          paga, confirma desde <Link to="/restaurante" className="underline">/restaurante</Link>, abre <Link to="/repartidor" className="underline">/repartidor</Link> para ver GPS y prueba un reembolso (Saga).
        </div>
      </main>
    </div>
  );
}
