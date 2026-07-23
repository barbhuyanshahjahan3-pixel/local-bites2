// Real background push notifications — these reach the restaurant/delivery
// partner's phone even when they aren't running the site at all (app closed,
// browser closed), as long as the browser/OS still has network ("data on").
// This is different from Socket.IO, which only fires while a tab is open and
// connected. Delivered via the browser Push API + a service worker that's
// already registered once the user opts in (see each app's
// src/utils/pushNotifications.ts).
const webpush = require('web-push');

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:support@localbites.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  // Don't crash the server over this — just skip pushes silently so local
  // dev without VAPID keys still works (Socket.IO keeps working as before).
  console.warn(
    '[webPush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications are disabled. ' +
      'Run `npm run generate:vapid` and add them to .env to enable.'
  );
}

/**
 * Sends a push notification to every subscription in `subscriptions` (an
 * array of { endpoint, keys: { p256dh, auth } } as stored on the
 * Restaurant/DeliveryPartner document). Returns the list of endpoints that
 * are dead (expired/unsubscribed at the browser level, HTTP 404/410) so the
 * caller can remove them from the document — otherwise they'd pile up and
 * every future push would waste a request retrying a subscription that will
 * never work again.
 */
async function sendPushToSubscriptions(subscriptions, payload) {
  if (!configured || !subscriptions?.length) return { deadEndpoints: [] };

  const body = JSON.stringify(payload);
  const deadEndpoints = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.error('[webPush] send failed:', err.statusCode, err.body || err.message);
        }
      }
    })
  );

  return { deadEndpoints };
}

module.exports = { sendPushToSubscriptions, isPushConfigured: () => configured };
