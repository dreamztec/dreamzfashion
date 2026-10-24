# DREAMZ FASHION KONCEPTZ

**YOUR DREAM OUTFIT**

A luxury fashion e-commerce platform for DREAMZ FASHION KONCEPTZ (DFK) — a
contemporary African fashion house specializing in bespoke and ready-to-wear
leather footwear, bags and accessories. Built Nigeria-first: NGN pricing,
Nigerian states, Paystack checkout, and WhatsApp as a first-class conversion
channel.

## Key Technologies

| Layer | Technology |
|---|---|
| Framework | TanStack Start (React 19, TanStack Router) |
| Styling | Tailwind CSS 4 with a custom luxury design system |
| Database | Netlify Database (managed Postgres) via Drizzle ORM |
| Payments | Paystack (server-side initialize + verify + webhook) |
| Images | Netlify Image CDN (on-demand WebP/AVIF, responsive) |
| Hosting | Netlify (SSR via the Netlify/Vite plugin) |

## Running Locally

```bash
npm install
npm run dev        # http://localhost:3000
```

A `.env` file is not required to browse the catalog — the database provisions
and seeds itself on first request. Online checkout activates automatically
once `PAYSTACK_SECRET_KEY` is set in the environment.

## Environment Variables

Required for checkout: `PAYSTACK_SECRET_KEY` (server-side only — never
exposed to the browser; also signs the Paystack webhook).
Required for the admin dashboard: `ADMIN_SECRET`.
Optional: `SITE_URL` (canonical origin used in sitemap/OG/JSON-LD),
`DFK_WHATSAPP_NUMBER` (fallback WhatsApp line; the admin Settings page is the
primary source), `NETLIFY_AI_GATEWAY_KEY`/`NETLIFY_AI_GATEWAY_BASE_URL`
(auto-injected by Netlify when the AI Gateway is enabled) and
`DREAMZ_AI_TEXT_MODEL` / `DREAMZ_AI_IMAGE_MODEL` (model overrides for the
Design Lab).

## Automated Tests

```bash
npm test         # vitest — pricing, webhook signatures, idempotency, filters
npm run typecheck
```

## Customer Journey

Browse → Search → Product → Variant → Cart → Checkout → Pay (Paystack) →
Order confirmation → Track Order. Guest checkout throughout — no account
required. Made-to-order pieces can use admin-configured deposit + balance
plans. Unpriced pieces are quote-only ("Request a quote").

## Brand & Imagery

The site presents a clean DREAMZ text wordmark and neutral "Image coming
soon" placeholders until approved photography/branding is uploaded in the
admin dashboard (Admin → Media, stored in Netlify Blobs). Never add stock
photos, AI images or internet images. See `docs/handover.md` for the full
operating handover (products, deposits, partners, corporate quotes).
