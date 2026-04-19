import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EDA Last-Mile — Sistema de Logística en Tiempo Real" },
      { name: "description", content: "Sistema de última milla con arquitectura orientada a eventos: Saga, Matching AND, Circuit Breaker, DLQ." },
    ],
  }),
  component: Home,
});

function Card({ to, title, desc, emoji }: { to: string; title: string; desc: string; emoji: string }) {
  return (
    <Link to={to} className="group rounded-xl border bg-card p-6 transition hover:border-primary hover:shadow-lg">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <span className="mt-4 inline-block text-sm text-primary group-hover:underline">Abrir →</span>
    </Link>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">⚡ EDA Last-Mile</h1>
            <p className="text-xs text-muted-foreground">Event-Driven Logistics · Realtime · Saga · Circuit Breaker</p>
          </div>
          <Link to="/admin" className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Observabilidad</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Sistema de Logística en Tiempo Real</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Implementación EDA con coreografía de eventos, correlación AND para matching, Saga orquestada
            para reembolsos, Circuit Breaker en notificaciones, DLQ con backoff exponencial e idempotencia.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card to="/cliente" title="Cliente" desc="Crear pedido, timeline en vivo, mapa con repartidor." emoji="🧑" />
          <Card to="/restaurante" title="Restaurante" desc="Confirmar pedidos pendientes." emoji="🍔" />
          <Card to="/repartidor" title="Repartidor" desc="Recibir asignaciones, emitir GPS cada 3s." emoji="🛵" />
          <Card to="/admin" title="Admin / EDA" desc="Topics, DLQ, Circuit Breaker, Sagas, Matching." emoji="📊" />
        </section>

        <section className="mt-12 rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold">Mapeo arquitectónico</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• <b>Kafka topics</b> → tabla <code>events</code> + Realtime fan-out</li>
            <li>• <b>Consumer Groups</b> → edge functions independientes con idempotencia</li>
            <li>• <b>Redis Pub/Sub GPS</b> → canal Realtime <code>gps:{`{orderId}`}</code> broadcast</li>
            <li>• <b>Matching AND</b> → tabla <code>matching_state</code> con TTL 10min</li>
            <li>• <b>Saga reembolsos</b> → orquestador <code>refund-saga</code> + compensación</li>
            <li>• <b>Circuit Breaker</b> → tabla <code>circuit_state</code>, umbral 50% / 60s</li>
            <li>• <b>DLQ</b> → tabla <code>dlq</code> con backoff exponencial</li>
            <li>• <b>Idempotencia</b> → tabla <code>processed_events</code> (event_id, consumer)</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
