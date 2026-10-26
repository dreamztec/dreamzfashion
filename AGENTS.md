# AGENTS.md

DREAMZ FASHION KONCEPTZ (DFK) — luxury fashion e-commerce platform. Nigeria-first.

## Project Overview

TanStack Start (React 19) application on Netlify with a managed Postgres
database (Netlify Database + Drizzle ORM), Paystack payments, and a luxury
editorial design system. Phase 1 (commerce foundation) is implemented;
customization, AI, and customer-ecosystem layers are architecturally prepared
but intentionally not built yet.

## Directory Structure

```
├── db/
│   ├── schema.ts            # Drizzle schema: catalog, commerce, system tables
│   └── index.ts             # Drizzle client (Netlify Database adapter)
├── netlify/database/migrations/  # Auto-applied SQL migrations (drizzle-kit generate)
├── public/img/              # Brand + product imagery (Netlify Image CDN transforms these)
├── scripts/generate-images.mjs  # One-off AI image generation via Netlify AI Gateway
├── src/
│   ├── components/          # Header, Footer, CartDrawer, ProductCard, EditorialTile, whatsapp.tsx
│   ├── lib/                 # config (brand constants), format (NGN/states/phones), img (Image CDN helper)
│   ├── routes/              # TanStack file-based routes
│   │   ├── __root.tsx       # Shell: header, footer, cart drawer, WhatsApp float, settings loader
│   │   ├── index.tsx        # Cinematic homepage
│   │   ├── shop/            # /shop and /shop/$category
│   │   ├── product/$slug.tsx    # Product detail (variants, gallery, JSON-LD)
│   │   ├── checkout/        # /checkout, /checkout/callback (Paystack verify)
│   │   ├── track-order.tsx  # Order lookup (order number + phone/email)
│   │   ├── custom.tsx, bespoke.tsx, lookbook.tsx, about.tsx, feedback.tsx
│   │   ├── admin/           # overview, products, orders, bespoke, feedback, settings (secret-gated)
│   │   ├── api/webhooks/paystack.ts  # HMAC-verified webhook
│   │   └── sitemap.xml.ts   # Dynamic sitemap route
│   ├── server/              # Server-only code
│   │   ├── catalog.server.ts    # DB queries
│   │   ├── catalog.functions.ts # createServerFn wrappers
│   │   ├── checkout.functions.ts # order creation, payment verify, tracking
│   │   ├── payments.server.ts   # PaymentProvider abstraction (Paystack active, CredPal dormant)
│   │   ├── admin.functions.ts   # Admin RPC, secret-gated via ADMIN_SECRET
│   │   └── seed.server.ts       # Idempotent first-run seeding
│   └── store/cart.ts        # Zustand cart (localStorage-persisted)
└── vite.config.ts           # TanStack Start + Netlify + Tailwind plugins
```

## Critical Conventions

- **Commercial collections** — products carry `tier`:
  `essentials | originals | royale` (DREAMZ Essentials / Originals / Royale).
  Legacy stored values (`signature`, `bespoke`) are presented under the new
  names by `normalizeTier()` and were migrated in
  `20261026082530_collection_structure_hero_flag_image_kind`. The customer
  label is `resolveCollection()` in `src/server/catalog.server.ts`: an
  admin-set `collection` string wins, otherwise the tier label. Automatic
  classification (`src/lib/collection.ts`) only SUGGESTS — ambiguous products
  (exactly 3 colours, exactly ₦50,000, missing colour data) are flagged
  "Needs Category Confirmation" in the admin review queue and are NEVER
  guessed or relabelled. The admin's manual choice always overrides.
- **Homepage hero** — an explicit `homepage_hero` product flag chosen in the
  admin (never a hard-coded SKU); fallbacks: bestseller flag, then the Boot
  of Many Colours SKU.
- **Product imagery** — clean product photography displays `contain`
  (whole product visible; per-product `image_fit='cover'` is only for
  lifestyle/editorial). Images go through `img()` / `imgSrcSet()` at
  640/960/1280/1600 via the Netlify Image CDN.
- **Quote-only products** — `price = 0` or `checkout_ready = false` means the
  storefront shows "Request a quote" and the server REJECTS the line at
  checkout. Never invent prices.
- **Deposits** — orders may use `paymentPlan: 'full' | 'deposit'`. Deposit
  amounts are computed server-side from the `deposits` settings key (disabled
  by default; per-product `deposit_eligible` flag). `confirmOrderPaid`
  credits each payment against `paid_kobo`; orders reach `paid` only when
  cash covers `total`. Dispatch is blocked while a balance is outstanding
  unless an admin records an explicit override.
- **Partners** — one `referrers` row per partner with track
  `student | public | referral | creator | trade`. Creator storefronts live
  in `partner_profiles` (live only when admin sets `storefront_status=live`,
  public at `/creator/$slug`). Commissions live in `commissions`
  (pending → eligible → paid, reversed on refund/cancel), payouts in
  `payout_requests` (admin-reviewed; no automatic transfers).
- **Admin roles** — `admin_users` maps a Netlify Identity email to
  `owner | sales | operations`; the master `ADMIN_SECRET` header remains
  owner-level. Server functions gate via `requireAdminRole([...])`.

- **Prices are integers in kobo** (₦150,000.00 = `15000000`). Format only via
  `formatNaira()` in `src/lib/format.ts`.
- **Server prices are never trusted from the client.** `initializeCheckout`
  re-prices every line from the database before creating an order.
- **The site ships with NO bundled product/hero/gallery imagery.** Every
  media surface renders the neutral "Image coming soon" placeholder
  (`src/components/brand.tsx`) until the administrator uploads approved
  photography in the admin dashboard (stored in Netlify Blobs, served via
  `/api/media/…`). Never add stock photos, AI images, or internet images.
  The brand presents as a clean text wordmark (`Wordmark`) until approved
  branding is uploaded. Legacy `/img/…` URLs in DB rows are filtered at the
  data layer (`displayableImages` in `src/server/catalog.server.ts`) — keep
  that filter.
- **Images go through `img()` / `imgSrcSet()`** from `src/lib/img.ts` so the
  Netlify Image CDN serves optimized WebP/AVIF at the right size.
- **The WhatsApp number is centralized**: admin settings (DB) with
  `DFK_WHATSAPP_NUMBER` env fallback. Never hardcode `wa.me` links — use the
  helpers in `src/components/whatsapp.tsx`.
- **Never fake integrations.** Paystack checkout throws a human-readable error
  when `PAYSTACK_SECRET_KEY` is absent; CredPal reports `configured: false`
  until its env vars exist. Honest configuration states everywhere.
- **Schema changes require migrations**: edit `db/schema.ts`, then run
  `npx drizzle-kit generate --name describe_change` (outputs to
  `netlify/database/migrations/`). Never edit applied migrations.
- **Seeding** (`src/server/seed.server.ts`) is idempotent and runs on first
  catalog/settings request; it no-ops once products exist.
- **Brand assets**: logo/product image files were removed in the rebuild
  (wordmark-era). Only `public/img/staging-uploads/` (customer submissions)
  and `public/img/media-locked/` remain, untouched. Never regenerate artwork;
  the administrator uploads approved assets.

## Admin Dashboard

`/admin` is gated by `ADMIN_SECRET` (server-side check on every RPC; the
session token lives in `sessionStorage`). Sections: overview, products
(CRUD + publish state + media picker), orders (status timeline updates),
bespoke requests, feedback, settings (hero, announcement, WhatsApp, delivery
fees). Route-level auth is intentionally thin — every privileged mutation
re-verifies the secret server-side.

## Roadmap (phases deliberately not built yet)

- Phase 2: DREAMZ Design Lab (customization engine; `customizable` flag and
  `/custom` page exist as the seam).
- Phase 3: AI content engine (AI Gateway is configured; use
  `NETLIFY_AI_GATEWAY_KEY`/`NETLIFY_AI_GATEWAY_BASE_URL` server-side).
- Phase 4: accounts, wishlist, reviews, rewards. Phase 5: CredPal BNPL
  (`PaymentProvider` abstraction already registers it), analytics, currencies.
- Phase 6: Fifth Anniversary Collection (12 June 2027) — free early-access
  waitlist is live (`waitlist` table, `/dreamz-5`); counted separately from
  sales. 3D configurator intentionally not built (no suitable models).
