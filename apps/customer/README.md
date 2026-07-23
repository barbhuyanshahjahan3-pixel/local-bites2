# Local Bites — Customer PWA

React + Vite + TypeScript + Tailwind PWA. Mobile-first, installable, bottom
tab navigation.

## Setup

```bash
cp .env.example .env   # VITE_API_URL + VITE_RAZORPAY_KEY_ID (public key only)
npm install
npm run dev
```

## Sign in

Customers register/login with just name + mobile number (no password) — the
backend finds-or-creates by mobile, so returning customers just re-enter the
same number.

## Features

- **Browse** — pick a city, browse open restaurants.
- **Search** — full-text food search + restaurant name search.
- **Restaurant page** — menu grouped by category, wishlist heart, add to cart.
- **Cart** — single-restaurant cart (switching restaurants prompts to clear).
- **Checkout** — collects name, mobile, delivery address; Cash on Delivery or
  online payment via Razorpay Checkout (loaded from
  `https://checkout.razorpay.com/v1/checkout.js` in `index.html`); on success
  shows the exact required confirmation message and verifies payment
  signature server-side before marking paid.
- **Order tracking** — live status timeline via Socket.IO, falls back to
  whatever's already in `statusHistory` on load. Once a rider is assigned
  (accepted/picked up/on the way), a live map (free OpenStreetMap tiles via
  Leaflet — no API key needed) shows the restaurant, your delivery address,
  and the delivery partner's position updating in real time as they move.
  Leave a rating + review once delivered.
- **Order history**, **Wishlist**, **Profile**, **Support/complaints** with
  status tracking.

## Icons

Add `public/icons/icon-192.png` and `public/icons/icon-512.png` before
building for production.

## Deployment

Netlify: build command `npm run build`, publish directory `dist`. Set
`VITE_API_URL` to your Render backend URL. Razorpay's live checkout requires
HTTPS (Netlify default) and a live key once you're out of test mode.
