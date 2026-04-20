import { useEffect, useMemo, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

// Componente interno que carga Leaflet de forma imperativa (sin react-leaflet)
// para evitar el error "Map container is already initialized" en StrictMode/HMR.
function LeafletMap({
  pickup,
  dropoff,
  driver,
  height,
}: {
  pickup: LatLng;
  dropoff: LatLng;
  driver?: LatLng | null;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ pickup?: any; dropoff?: any; driver?: any; route?: any }>({});
  const LRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Init mapa una sola vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      await import("leaflet/dist/leaflet.css" as any);
      if (cancelled || !containerRef.current) return;
      const L = (mod as any).default ?? mod;
      LRef.current = L;

      // Si ya existe un mapa en el contenedor (HMR / StrictMode), límpialo
      if ((containerRef.current as any)._leaflet_id) {
        try { (containerRef.current as any)._leaflet_id = null; } catch {}
      }

      const map = L.map(containerRef.current, {
        center: [(pickup.lat + dropoff.lat) / 2, (pickup.lng + dropoff.lng) / 2],
        zoom: 14,
        scrollWheelZoom: false,
        zoomControl: true,
      });
      mapRef.current = map;

      // Tiles estilo Google-like (CartoDB Voyager — limpio y moderno)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      const makeIcon = (emoji: string, bg: string, size = 38) =>
        L.divIcon({
          className: "rapideats-marker",
          html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:${size * 0.55}px;border:3px solid white;box-shadow:0 6px 16px rgba(0,0,0,0.3);">${emoji}</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

      markersRef.current.pickup = L.marker([pickup.lat, pickup.lng], { icon: makeIcon("🍔", "#10b981") }).addTo(map).bindPopup("Restaurante");
      markersRef.current.dropoff = L.marker([dropoff.lat, dropoff.lng], { icon: makeIcon("🏠", "#ef4444") }).addTo(map).bindPopup("Tu dirección");

      const initialRoute: [number, number][] = [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]];
      markersRef.current.route = L.polyline(initialRoute, {
        color: "#3b82f6", weight: 5, opacity: 0.8, dashArray: "10 8",
      }).addTo(map);

      const bounds = L.latLngBounds([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar marcador del driver + ruta
  useEffect(() => {
    if (!ready || !driver || !mapRef.current || !LRef.current) return;
    const L = LRef.current;
    const map = mapRef.current;
    const m = markersRef.current;

    const driverIcon = L.divIcon({
      className: "rapideats-marker",
      html: `<div style="width:44px;height:44px;border-radius:9999px;background:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:24px;border:3px solid white;box-shadow:0 6px 16px rgba(0,0,0,0.35);animation:rapidPulse 1.5s ease-in-out infinite;">🛵</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (!m.driver) {
      m.driver = L.marker([driver.lat, driver.lng], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      m.driver.setLatLng([driver.lat, driver.lng]);
    }

    // Ruta dinámica: pickup → driver → dropoff
    if (m.route) {
      m.route.setLatLngs([
        [pickup.lat, pickup.lng],
        [driver.lat, driver.lng],
        [dropoff.lat, dropoff.lng],
      ]);
    }
  }, [ready, driver?.lat, driver?.lng, pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}

export function MiniMap({
  pickup,
  dropoff,
  driver,
  height = 320,
}: {
  pickup: LatLng;
  dropoff: LatLng;
  driver?: LatLng | null;
  height?: number;
}) {
  // Interpolación suave del repartidor
  const [smooth, setSmooth] = useState<LatLng | null>(driver ?? null);
  const prev = useRef<LatLng | null>(driver ?? null);
  useEffect(() => {
    if (!driver) return;
    const from = prev.current ?? driver;
    const to = driver;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setSmooth({
        lat: from.lat + (to.lat - from.lat) * e,
        lng: from.lng + (to.lng - from.lng) * e,
      });
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [driver?.lat, driver?.lng]);

  // Solo cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const key = useMemo(() => `${pickup.lat},${pickup.lng}-${dropoff.lat},${dropoff.lng}`, [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng]);

  return (
    <div className="relative overflow-hidden rounded-xl border shadow-sm" style={{ height }}>
      <style>{`@keyframes rapidPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
      {mounted ? (
        <LeafletMap key={key} pickup={pickup} dropoff={dropoff} driver={smooth} height={height} />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando mapa…</div>
      )}
    </div>
  );
}
