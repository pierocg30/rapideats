import { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

// Mini mapa SVG (sin dependencias externas) — proyección equirectangular local.
export function MiniMap({
  pickup, dropoff, driver, height = 260,
}: { pickup: LatLng; dropoff: LatLng; driver?: LatLng | null; height?: number }) {
  const points = [pickup, dropoff, driver].filter(Boolean) as LatLng[];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const pad = 0.005;
  const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad, maxLng = Math.max(...lngs) + pad;
  const W = 600, H = height;
  const proj = (p: LatLng) => ({
    x: ((p.lng - minLng) / (maxLng - minLng || 1)) * W,
    y: H - ((p.lat - minLat) / (maxLat - minLat || 1)) * H,
  });
  const P = proj(pickup), D = proj(dropoff), R = driver ? proj(driver) : null;

  // animar driver
  const [render, setRender] = useState<LatLng | null>(driver ?? null);
  const prev = useRef<LatLng | null>(driver ?? null);
  useEffect(() => {
    if (!driver) return;
    const from = prev.current ?? driver;
    const to = driver;
    const start = performance.now();
    const dur = 1500;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setRender({ lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t });
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [driver?.lat, driver?.lng]);

  const RR = render ? proj(render) : R;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border bg-muted/30" style={{ height }}>
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      <line x1={P.x} y1={P.y} x2={D.x} y2={D.y} stroke="oklch(0.7 0.15 250)" strokeWidth="2" strokeDasharray="6 4"/>
      <g>
        <circle cx={P.x} cy={P.y} r="9" fill="oklch(0.65 0.18 145)" />
        <text x={P.x + 12} y={P.y + 4} fontSize="11" fill="currentColor">Restaurante</text>
      </g>
      <g>
        <circle cx={D.x} cy={D.y} r="9" fill="oklch(0.6 0.22 25)" />
        <text x={D.x + 12} y={D.y + 4} fontSize="11" fill="currentColor">Cliente</text>
      </g>
      {RR && (
        <g>
          <circle cx={RR.x} cy={RR.y} r="11" fill="oklch(0.7 0.18 60)" stroke="white" strokeWidth="2"/>
          <text x={RR.x + 14} y={RR.y + 4} fontSize="11" fill="currentColor">🛵 Repartidor</text>
        </g>
      )}
    </svg>
  );
}
