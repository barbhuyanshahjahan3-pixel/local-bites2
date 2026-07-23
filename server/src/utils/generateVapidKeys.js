// Run once: `npm run generate:vapid`
// Prints a fresh VAPID keypair. Paste the values into your .env (server) and
// into each frontend app's .env as VITE_VAPID_PUBLIC_KEY. Never regenerate
// these after real users have subscribed — existing subscriptions would stop
// receiving pushes until they re-subscribe.
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();

console.log('\nAdd these to server/.env:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:support@localbites.app\n`);
console.log('Add this to apps/restaurant/.env and apps/delivery/.env:\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
