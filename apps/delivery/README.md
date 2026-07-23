# Local Bites — Delivery Partner PWA

React + Vite + TypeScript + Tailwind PWA for delivery riders.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

## Login

Delivery partner accounts are created by Super Admin or Admin. Sign in with
your access code + temp password, then set a permanent password.

## Features

- **Online/Offline toggle** — requests browser geolocation and reports it to
  the server; joins the Socket.IO delivery pool for your city while online.
- **Available** — unclaimed, ready-for-pickup orders in your city. Fetched on
  load and refreshed instantly when the server broadcasts a new one. First
  to accept wins (server rejects the second accept with a 409).
- **Current** — your single active delivery: customer name/mobile/address
  (only visible to the assigned partner), a live map (free OpenStreetMap
  tiles via Leaflet — no API key needed) showing the restaurant pickup
  point, the customer's drop point, and your own live position, plus a
  one-tap "Open turn-by-turn navigation" link to Google Maps; order items;
  and a step-by-step pickup → on the way → delivered flow. Can reject to
  re-queue for another rider. While you have an active delivery, your GPS
  position is reported to the server every ~12s so the customer can watch
  you approach on their own tracking map.
- **History** — completed deliveries, with a PDF export button (streams
  from the backend's `pdfkit`-generated PDF).
- **Earnings** — running total earned and deliveries completed.

## Icons

Add `public/icons/icon-192.png` and `public/icons/icon-512.png` before
building for production.

## Deployment

Netlify: build command `npm run build`, publish directory `dist`. Set
`VITE_API_URL` to your Render backend URL. Geolocation and installability
require HTTPS, which Netlify provides by default.
