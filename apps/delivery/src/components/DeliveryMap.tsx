import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Emoji-based divIcons avoid the classic "Leaflet + bundler" broken default-marker-image
// problem entirely — no asset imports/paths to get wrong across build tools.
const pinIcon = (emoji: string) =>
  L.divIcon({
    html: `<div style="font-size:26px;line-height:1;transform:translate(-50%,-100%)">${emoji}</div>`,
    className: '',
    iconSize: [0, 0],
  });

export interface DeliveryMapPoint {
  lat: number;
  lng: number;
}

export default function DeliveryMap({
  pickup,
  drop,
  self,
}: {
  pickup?: DeliveryMapPoint | null;
  drop?: DeliveryMapPoint | null;
  self?: DeliveryMapPoint | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selfMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Static pickup/drop markers + initial bounds fit.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points: L.LatLngExpression[] = [];

    if (pickup) {
      L.marker([pickup.lat, pickup.lng], { icon: pinIcon('🏪') }).addTo(map).bindPopup('Pickup (restaurant)');
      points.push([pickup.lat, pickup.lng]);
    }
    if (drop) {
      L.marker([drop.lat, drop.lng], { icon: pinIcon('📍') }).addTo(map).bindPopup('Drop (customer)');
      points.push([drop.lat, drop.lng]);
    }
    if (self) points.push([self.lat, self.lng]);

    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

  // Live-updating "you are here" marker as geolocation changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !self) return;
    if (!selfMarkerRef.current) {
      selfMarkerRef.current = L.marker([self.lat, self.lng], { icon: pinIcon('🛵') })
        .addTo(map)
        .bindPopup('You');
    } else {
      selfMarkerRef.current.setLatLng([self.lat, self.lng]);
    }
  }, [self?.lat, self?.lng]);

  const navTarget = drop || pickup;
  const navUrl = navTarget
    ? `https://www.google.com/maps/dir/?api=1&destination=${navTarget.lat},${navTarget.lng}&travelmode=driving`
    : null;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="w-full h-56 rounded-lg overflow-hidden border border-slate-800" />
      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary w-full text-sm text-center block"
        >
          🧭 Open turn-by-turn navigation
        </a>
      )}
    </div>
  );
}
