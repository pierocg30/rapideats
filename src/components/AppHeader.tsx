import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";

export function AppHeader() {
  const { count } = useCart();
  return (
    <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}>
            R
          </div>
          <div>
            <div className="text-base font-bold leading-none text-foreground">RapidEats</div>
            <div className="text-[10px] text-muted-foreground">Entrega en minutos</div>
          </div>
        </Link>
        <Link to="/cart" className="relative flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium hover:border-primary">
          <span>🛒 Carrito</span>
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
