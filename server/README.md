# Local Bites — Backend API

Node.js + Express + MongoDB backend for the Local Bites food delivery platform.
Launch city: Hojai. Built so additional cities (Nagaon, Lumding, Guwahati, ...)
can be added via the Super Admin panel with zero code changes — every
restaurant, delivery partner, and order is scoped to a `City` document.

## Roles & Auth

Five roles share one JWT-based auth system:

| Role             | Self-register? | Created by         | Login              |
|------------------|-----------------|---------------------|---------------------|
| customer         | yes             | —                   | mobile number       |
| restaurant       | no              | Super Admin         | access code + password |
| delivery_partner | no              | Super Admin / Admin | access code + password |
| admin            | no              | Super Admin         | access code + password |
| super_admin      | no (seeded once)| —                   | access code + password |

Staff accounts (restaurant/delivery/admin/super_admin) are issued a
temporary password and **must** change it on first login
(`mustChangePassword` flag, enforced server-side).

## Local setup

```bash
cd server
cp .env.example .env   # fill in Mongo URI, JWT secret, Cloudinary, Razorpay keys
npm install
npm run generate:vapid   # one-time: prints VAPID keys for push notifications — paste into .env
npm run seed:superadmin   # one-time: creates the single initial Super Admin
npm run dev
```

Also copy the `VITE_VAPID_PUBLIC_KEY` line printed by `generate:vapid` into
`apps/restaurant/.env` and `apps/delivery/.env` — without it, the "turn on
notifications" button in those apps will show a config error.

The seed script prints the Super Admin's access code and temporary password —
save them, then log in via `POST /api/auth/staff-login` with
`{ role: "super_admin", accessCode, password }` and immediately call
`POST /api/auth/change-password`.

From there, the Super Admin creates the first city (Hojai), then restaurants
and delivery partners, via `/api/superadmin/*`.

## Order workflow

```
placed → restaurant_accepted → preparing → ready_for_pickup
       → delivery_accepted → picked_up → on_the_way → delivered
(branches: restaurant_rejected, delivery_rejected → re-queued, cancelled)
```

Every transition is appended to `Order.statusHistory` with who made it, which
feeds the "who rejected the order" analytics requirement directly.

## Privacy rule

Restaurants receive order items only — never the customer's phone number or
delivery address (`getRestaurantOrders` explicitly excludes those fields).
Only the assigned delivery partner receives that information, via
`GET /api/delivery/orders/:id`.

## Real-time (Socket.IO)

Clients connect with `{ auth: { token: <jwt> } }`. Rooms:
`customer:<id>`, `restaurant:<id>`, `partner:<id>`,
`delivery-pool:<cityId>`, `admin-room`. See `src/sockets/`.

## Push notifications (Web Push)

Socket.IO above only reaches a restaurant/delivery partner while their
dashboard tab is open and connected. For alerts that reach their phone even
with the app fully closed, the restaurant and delivery apps also register
for browser Push notifications (`src/utils/webPush.js`, VAPID-based). New
paid orders push to the restaurant; orders becoming `ready_for_pickup` (or
re-queued after a rejection) push to every online delivery partner in that
city. See `npm run generate:vapid` above for setup.

## Payments

Razorpay order created at checkout (`placeOrder`), verified via HMAC
signature at `POST /api/payments/verify`. Cash on Delivery orders are marked
`paid` automatically on delivery confirmation.

## Deployment

### Backend → Render
1. Push this `server/` directory to a Git repo.
2. New Web Service on Render, root directory `server`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all variables from `.env.example` in Render's Environment settings.
5. After first deploy, run `npm run seed:superadmin` once via Render Shell.

### Frontend apps → Netlify
Each frontend app (Customer PWA, Restaurant Dashboard, Delivery PWA, Admin,
Super Admin) deploys as its own Netlify site (or as separate paths behind one
site). Set `VITE_API_URL` to the Render backend URL and `VITE_SOCKET_URL` to
the same host. Netlify build command: `npm run build`, publish directory:
`dist`.

### MongoDB Atlas
Create a free-tier cluster, add Render's outbound IPs (or `0.0.0.0/0` for
simplicity during setup, then restrict), and put the connection string in
`MONGO_URI`.

### Cloudinary / Razorpay
Create accounts, generate API keys, add to environment variables on both
Render (backend) and wherever image uploads originate.

## What's not in this reference implementation yet

This backend covers the full data model, auth, and order/analytics workflow.
Still to build: the five frontend apps (Customer PWA, Restaurant Dashboard,
Delivery Partner PWA, Admin Dashboard, Super Admin Dashboard), PWA manifest/
service worker for each, and OTP verification for customer mobile login
(currently instant-verify as a placeholder — swap in an SMS provider before
going live).
