// Computes the distance (in km) between a restaurant and a delivery address.
//
// By default this uses the Haversine formula — pure math, completely free,
// no API key or network call needed. It's a straight-line ("as the crow
// flies") distance, which is what most small delivery platforms use for
// per-km charging.
//
// If GOOGLE_MAPS_API_KEY is set in the environment, we instead call Google's
// Distance Matrix API to get actual road/driving distance, which is more
// accurate in cities with rivers, one-way systems, etc. If that call fails
// for any reason (no key, network issue, no route found), we silently fall
// back to the Haversine distance so order placement never breaks.
const https = require('https');

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function fetchGoogleDistanceKm(lat1, lng1, lat2, lng2, apiKey) {
  return new Promise((resolve, reject) => {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${lat1},${lng1}&destinations=${lat2},${lng2}&units=metric&key=${apiKey}`;
    https
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const el = json.rows?.[0]?.elements?.[0];
            if (el?.status === 'OK' && el.distance?.value != null) {
              resolve(el.distance.value / 1000); // meters -> km
            } else {
              reject(new Error('No route found'));
            }
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Returns { distanceKm, source } where source is 'google' or 'haversine'.
 * Never throws — always resolves to a usable distance.
 */
async function getDistanceKm(lat1, lng1, lat2, lng2) {
  const straightLineKm = haversineKm(lat1, lng1, lat2, lng2);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { distanceKm: straightLineKm, source: 'haversine' };
  }
  try {
    const roadKm = await fetchGoogleDistanceKm(lat1, lng1, lat2, lng2, apiKey);
    return { distanceKm: roadKm, source: 'google' };
  } catch {
    return { distanceKm: straightLineKm, source: 'haversine' };
  }
}

/**
 * Computes the delivery charge for a given distance using the platform's
 * per-km rate, with an optional minimum and maximum clamp so charges never
 * go below a floor or above a ceiling super admin has configured.
 */
function computeDeliveryCharge(distanceKm, { perKmRate, minCharge, maxCharge, flatFallback }) {
  if (!perKmRate || distanceKm == null) return flatFallback ?? 30;
  let charge = Math.round(distanceKm * perKmRate);
  if (minCharge != null) charge = Math.max(charge, minCharge);
  if (maxCharge != null) charge = Math.min(charge, maxCharge);
  return charge;
}

module.exports = { haversineKm, getDistanceKm, computeDeliveryCharge };
