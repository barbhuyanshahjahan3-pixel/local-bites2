import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pinIcon = (emoji: string) =>
  L.divIcon({
    html: `<div style="font-size:26px;line-height:1;transform:translate(-50%,-100%)">${emoji}</div>`,
    className: '',
    iconSize: [0, 0],
  });

export interface TrackingMapPoint {
  lat: number;
  lng: number;
}

export default function OrderTrackingMap({
  restaurant,
  drop,
  partner,
}: {
  restaurant?: TrackingMapPoint | null;
  drop?: TrackingMapPoint | null;
  partner?: TrackingMapPoint | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const partnerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points: L.LatLngExpression[] = [];

    if (restaurant) {
      L.marker([restaurant.lat, restaurant.lng], { icon: pinIcon('🏪') }).addTo(map).bindPopup('Restaurant');
      points.push([restaurant.lat, restaurant.lng]);
    }
    if (drop) {
      L.marker([drop.lat, drop.lng], { icon: pinIcon('📍') }).addTo(map).bindPopup('Your delivery address');
      points.push([drop.lat, drop.lng]);
    }
    if (partner) points.push([partner.lat, partner.lng]);

    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.lat, restaurant?.lng, drop?.lat, drop?.lng]);

  // Live rider position — updates smoothly as new socket events arrive,
  // without re-fitting/jumping the whole map view each time.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !partner) return;
    if (!partnerMarkerRef.current) {
      partnerMarkerRef.current = L.marker([partner.lat, partner.lng], { icon: pinIcon('🛵') })
        .addTo(map)
        .bindPopup('Delivery partner');
    } else {
      partnerMarkerRef.current.setLatLng([partner.lat, partner.lng]);
    }
  }, [partner?.lat, partner?.lng]);

  return <div ref={containerRef} className="w-full h-56 rounded-lg overflow-hidden border border-slate-800" />;
}
