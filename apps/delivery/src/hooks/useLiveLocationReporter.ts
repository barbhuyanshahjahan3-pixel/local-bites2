import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const REPORT_INTERVAL_MS = 12000; // don't hammer the server/battery — every ~12s is plenty for a live map

/**
 * Call with `active = true` while the partner has a delivery_accepted /
 * picked_up / on_the_way order. Returns the partner's own last-known
 * position (for their "you are here" marker) — the actual reporting to the
 * backend happens on a throttled interval internally.
 */
export function useLiveLocationReporter(active: boolean) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!active || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(point);

        const now = Date.now();
        if (now - lastSentRef.current >= REPORT_INTERVAL_MS) {
          lastSentRef.current = now;
          api.patch('/api/delivery/location', point).catch(() => {
            // Non-critical — the customer's map just won't update this tick;
            // next successful geolocation fix will retry.
          });
        }
      },
      () => {
        // Permission denied or unavailable — map still works with pickup/drop
        // pins, just without the live "you are here" marker.
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);

  return position;
}
