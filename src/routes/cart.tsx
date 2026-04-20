import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { useCart } from "@/lib/cart";
import { publishEvent } from "@/lib/eventosService";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Carrito — RapidEats" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [name, setName] = useState("Juan Pérez");
  const [phone, setPhone] = useState("+52 55 1234 5678");
  const [address, setAddress] = useState("Av. Insurgentes Sur 1234, Col. Del Valle, CDMX");
  const [notes, setNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const deliveryFee = cart.count > 0 ? 18 : 0;
  const serviceFee = cart.count > 0 ? Math.round(cart.subtotal * 0.05) : 0;
  const total = cart.subtotal + deliveryFee + serviceFee;

  async function checkout() {
    if (cart.items.length === 0) return;
    setPaying(true);
    try {
      const restaurantId = cart.items[0].restaurant_id;
      const { data: r } = await supabase.from("restaurants").select("*").eq("id", restaurantId).single();

      // Punto de entrega aleatorio cerca del restaurante (~1-2km)
      const dropoffLat = (r?.lat ?? 19.4326) + (Math.random() * 0.02 - 0.005);
      const dropoffLng = (r?.lng ?? -99.1332) + (Math.random() * 0.02 - 0.005);

      const { data: order, error } = await supabase.from("orders").insert({
        customer_name: name,
        restaurant_name: r?.name ?? "Restaurante",
        restaurant_id: restaurantId,
        items: cart.items.map((x) => ({ name: x.name, qty: x.qty, price: x.price })),
        total,
        status: "created",
        pickup_lat: r?.lat ?? 19.4326,
        pickup_lng: r?.lng ?? -99.1332,
        dropoff_lat: dropoffLat,
        dropoff_lng: dropoffLng,
        delivery_address: address,
        eta_minutes: (r?.delivery_minutes ?? 30),
        notes,
      }).select().single();
      if (error) throw error;

      // EDA: publicar evento creado y simular pago inmediato
      await publishEvent("pedido.creado", order.id, { customer: name, total });
      await supabase.from("orders").update({ status: "payment_processed" }).eq("id", order.id);
      await publishEvent("pago.procesado", order.id, { amount: total, method: "card" });

      // Disparar simulación end-to-end (restaurante acepta → prepara → repartidor → entrega)
      await supabase.functions.invoke("order-simulator", { body: { order_id: order.id } });

      cart.clear();
      navigate({ to: "/track/$id", params: { id: order.id } });
    } catch (e: any) {
      alert(e.message ?? "Error al procesar pago");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Seguir comprando</Link>
        <h1 className="mt-2 text-2xl font-bold">Tu carrito</h1>

        {cart.items.length === 0 ? (
          <div className="mt-10 rounded-2xl border bg-card p-10 text-center">
            <div className="text-5xl">🛒</div>
            <p className="mt-3 text-muted-foreground">Tu carrito está vacío.</p>
            <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
              Explorar restaurantes
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-3">
              {cart.items.map((it) => (
                <div key={it.product_id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                  {it.image_url && <img src={it.image_url} alt={it.name} className="h-16 w-16 rounded-xl object-cover" />}
                  <div className="flex-1">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-sm text-muted-foreground">${it.price.toFixed(0)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cart.setQty(it.product_id, it.qty - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-secondary">−</button>
                    <span className="w-6 text-center font-semibold">{it.qty}</span>
                    <button onClick={() => cart.setQty(it.product_id, it.qty + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-secondary">+</button>
                  </div>
                  <button onClick={() => cart.remove(it.product_id)}
                    className="ml-2 text-xs text-muted-foreground hover:text-destructive">✕</button>
                </div>
              ))}
            </div>

            <section className="mt-6 rounded-2xl border bg-card p-4">
              <h2 className="font-semibold">Datos de entrega</h2>
              <div className="mt-3 grid gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre"
                  className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono"
                  className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección"
                  className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas para el repartidor (opcional)"
                  rows={2}
                  className="rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            </section>

            <section className="mt-6 rounded-2xl border bg-card p-4">
              <h2 className="font-semibold">Resumen</h2>
              <div className="mt-3 space-y-1 text-sm">
                <Row label="Subtotal" value={`$${cart.subtotal.toFixed(0)}`} />
                <Row label="Costo de envío" value={`$${deliveryFee.toFixed(0)}`} />
                <Row label="Cargo de servicio" value={`$${serviceFee.toFixed(0)}`} />
                <div className="my-2 border-t" />
                <Row label="Total" value={`$${total.toFixed(0)}`} bold />
              </div>
              <button onClick={checkout} disabled={paying}
                className="mt-4 w-full rounded-full py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                style={{ background: "var(--gradient-primary)" }}>
                {paying ? "Procesando pago…" : `Pagar $${total.toFixed(0)} con tarjeta`}
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Pago simulado · genera eventos EDA</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold text-foreground" : "text-muted-foreground"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
