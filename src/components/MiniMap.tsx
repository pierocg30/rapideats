import { useEffect, useMemo, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

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
  const [Lib, setLib] = useState<any>(null);

  // Carga Leaflet + react-leaflet solo en cliente (evita "window is not defined" en SSR)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [L, RL] = await Promise.all([
        import("leaflet"),
        import("react-leaflet"),
        import("leaflet/dist/leaflet.css" as any),
      ]);
      if (!mounted) return;
      setLib({ L: L.default ?? L, RL });
    })();
    return () => { mounted = false; };
  }, []);

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

  const center = useMemo<[number, number]>(
    () => [(pickup.lat + dropoff.lat) / 2, (pickup.lng + dropoff.lng) / 2],
    [pickup.lat, pickup.lng, dropoff.lat, dropoff.lng],
  );

  if (!Lib) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground"
        style={{ height }}
      >
        Cargando mapa…
      </div>
    );
  }

  const { L, RL } = Lib;
  const { MapContainer, TileLayer, Marker, Polyline, useMap } = RL;

  const makeIcon = (emoji: string, bg: string, size = 36) =>
    L.divIcon({
      className: "rapideats-marker",
      html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:${size * 0.55}px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25);">${emoji}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

  const restaurantIcon = makeIcon("🍔", "#10b981");
  const customerIcon = makeIcon("🏠", "#ef4444");
  const driverIcon = makeIcon("🛵", "#f59e0b", 42);

  function FitBounds({ points }: { points: LatLng[] }) {
    const map = useMap();
    useEffect(() => {
      if (points.length < 2) return;
      const bounds = L.latLngBounds(points.map((p: LatLng) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }, [map, JSON.stringify(points)]);
    return null;
  }

  const allPoints = [pickup, dropoff, smooth].filter(Boolean) as LatLng[];
  const routeLine: [number, number][] = smooth
    ? [[pickup.lat, pickup.lng], [smooth.lat, smooth.lng], [dropoff.lat, dropoff.lng]]
    : [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]];

  return (
    <div className="overflow-hidden rounded-xl border" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={routeLine}
          pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.75, dashArray: "8 8" }}
        />
        <Marker position={[pickup.lat, pickup.lng]} icon={restaurantIcon} />
        <Marker position={[dropoff.lat, dropoff.lng]} icon={customerIcon} />
        {smooth && <Marker position={[smooth.lat, smooth.lng]} icon={driverIcon} />}
        <FitBounds points={allPoints} />
      </MapContainer>
    </div>
  );
}
