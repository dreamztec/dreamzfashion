# Handover — DREAMZ Fashion commerce rebuild

## What was implemented

**Visual & brand reset**
- All bundled product, hero, gallery, promotional and logo imagery was removed
  from the site and the repository. Every media surface now renders an elegant
  neutral "Image coming soon" placeholder; the brand presents as a clean
  DREAMZ text wordmark until approved artwork is uploaded.
- Palette: warm cream/ivory background, dark readable typography (Cormorant
  Garamond + Jost), restrained rainbow accent hairlines as the house signature.
- New navigation: **Shop · Design Yours · Earn with DREAMZ · Corporate Orders**,
  with account, track-order, cart and WhatsApp support always reachable.
- Homepage headline is "Your dream. Your style. Made to wear." with
  **Shop DREAMZ** (primary) and **Design Yours** (secondary). The page explains
  what is sold before any partnership content.

**Commerce**
- Three customer-facing tiers — **DREAMZ Essentials / Signature / Bespoke** —
  editable per product in admin, kept separate from the "Complete Package"
  packaging option. Legacy product lines were mapped onto the tiers by an
  idempotent migration (nothing was dropped).
- Verified prices were preserved exactly. Products without an approved price
  (or with checkout not yet approved) show **"Request a quote"** and the
  server **rejects** those lines at checkout — no invented prices anywhere.
- **Deposit + balance payment plans**: admin-configurable terms (disabled by
  default; per-product eligibility). Deposit orders record `paid` vs
  `balance`; verification and the signed webhook credit each payment against
  the order; orders reach `paid` only when verified cash covers the total.
  Dispatch is blocked while a balance is outstanding unless an admin records
  an explicit override. Customers can pay the balance from the order-tracking
  page.
- **Catalogue structure for 50+ products**: the existing 30+ verified records
  were kept untouched, and ~29 unpublished draft entries (boots, shoes/loafers,
  bags, belts, wallets/purses/card holders) were prepared so the owner
  completes pricing, stock and imagery, then publishes.
- Product records now support: tier, private internal cost, per-variant
  colour/size/stock, made-to-order state, admin production/delivery copy,
  multiple uploaded images, size guide, returns terms, personalization with a
  stated charge, search metadata, and an admin "checkout approved" gate.
- Marketing consent checkbox at checkout, stored with the order (durable).
- **Fifth Anniversary Collection (12 June 2027)**: free early-access waitlist
  on the homepage and `/dreamz-5`, admin list + CSV export; counted
  separately from sales.

**Corporate orders** (`/corporate`)
- Enquiry form (company, contacts, products, quantity, budget, deadline,
  delivery location, branding requirements, reference link) → admin pipeline
  (enquiry → qualification → quote → acceptance → payment → production →
  delivery) → **formal quotation** with line items, branding/delivery charges,
  validity date, payment milestones and terms. Customers view and accept the
  quote at a token-gated link (`/corporate/quote/<number>?t=…`) and can pay
  agreed milestones through Paystack. No fabricated client logos anywhere.

**Earn with DREAMZ** (`/earn`)
- Three partner routes on one application form: **Referral Partner**
  (students/customers), **Creator Partner** (curated storefronts), **Trade
  Partner** (volume quotations). Free to apply, no purchase required.
- Unique links/codes with documented attribution (click → order → verified
  payment; configurable attribution window). Self-referral never earns.
- Creator storefronts (`/creator/<slug>`) go live only when an admin sets
  them live, presenting only admin-curated approved products. Creators can
  edit name/bio/Instagram and submit named-collection designs for review.
- Commission ledger with pending → eligible → paid states, reversal on
  refund/cancellation, and admin-reviewed payout requests (no automatic
  transfers). Partners see only their own data.
- Commission/earnings rates are all zero until the owner sets real terms in
  admin — nothing is promised anywhere.

**Admin control centre** (`/admin`, secret- or account-gated)
- **Roles**: owner / sales / operations, mapped from a Netlify Identity email
  in the new Team page; the master `ADMIN_SECRET` key remains owner-level.
  Every privileged RPC re-verifies the role server-side.
- Business metrics: paid sales (excluding cancelled), settled cash received,
  outstanding balances, average order value, checkout conversion (created →
  paid denominator, labelled), repeat purchase rate, unfulfilled orders,
  pending commissions, and goods contribution after recorded product costs —
  labelled **incomplete** while cost data is missing. Revenue is never shown
  as profit.
- Products: tier, internal cost, deposit eligibility/override, checkout gate,
  size guide/returns terms, publish state, plus the media picker flow.
- Orders: payment ledger per transaction (full/deposit/balance), timeline
  updates, dispatch guard with explicit override, CSV export.
- Corporate enquiries + quote builder; partner approvals/storefronts/
  commissions/payouts; waitlist + CSV; editable homepage, WhatsApp, delivery
  fees, deposit terms, partner terms, and payment-configuration status.
- Payment honesty: when `PAYSTACK_SECRET_KEY` is absent (or only test keys
  exist), checkout says so and directs to WhatsApp; the admin settings page
  states the configuration status. No fake payment success is possible.

**Design Yours** — the existing Design Lab brief + AI assistant (budget,
deadline, colours, materials, personalization, references, budget caps, DB-
first recommendations) was kept as the working flow; no 3D configurator was
built (no suitable models exist).

## What was tested

- Automated suite: **112 tests pass**, including new tests for tier mapping,
  quote-only gating, deposit arithmetic, and paid-state transitions
  (`npm test`, `npm run typecheck` both clean).
- Typecheck clean across the full rebuild.
- Local smoke test (Netlify dev + emulated database with all migrations
  applied): homepage, shop (all tiers), product page, earn, corporate,
  account, admin, policies and sitemap all return 200 with correct content;
  placeholders render everywhere; no bundled images are referenced.

## Preview URL

- Production: https://dreamzfashion.dreamz-gc.com (deploys from this branch).
- The deploy preview for this change is linked from the run that produced it.

## What requires credentials or business decisions

1. **`PAYSTACK_SECRET_KEY`** — set it on the deployment for live checkout.
   Verify whether the key you supply is live or test; the admin settings page
   reflects presence only. The webhook URL is
   `https://<your-domain>/api/webhooks/paystack`.
2. **`ADMIN_SECRET`** — set it to enable the admin dashboard master key
   (owner-level). Then add team members in Admin → Team with their DREAMZ
   account emails and roles.
3. **Deposit terms** — Admin → Settings → Deposits: enable, set the percent,
   balance window and terms text; then tick "Deposit-eligible" on the
   made-to-order products that should offer it. Disabled by default.
4. **Partner terms** — Admin → Settings → Partner commissions: set the
   commission rate (basis points), payout threshold and attribution window.
   Zero means no earnings exist yet, by design.
5. **Corporate quote milestones** — configured per quote in the admin quote
   builder; milestone payments run through Paystack once live keys exist.

## Where to upload images

Admin → **Media**: upload approved product/editorial photography (bulk
upload supported; files are stored in Netlify Blobs and served through the
Netlify Image CDN at `/api/media/…`). Copy a media URL from the Media page
into the product's cover-image field, or use the Products page media picker.
Upload your logo/branding the same way when ready — until then the site
shows the DREAMZ text wordmark and neutral placeholders.

## How to publish products

Admin → **Products**: each catalogue entry (including the prepared drafts)
has tier, price, stock/variants, availability, imagery, size guide, returns
terms and a **Checkout approved** flag. Set a real price, add stock and
imagery, tick *Checkout approved*, then **Publish**. Unpriced pieces remain
"Request a quote" even when published.

## How to configure payment terms and partner commissions

- **Deposits**: Admin → Settings → Deposits (enabled, percent, balance due
  window, terms text), then per-product in Admin → Products.
- **Partner commissions**: Admin → Settings → Partner terms (rate, payout
  threshold, attribution window). Payout requests are reviewed and marked
  paid with a transfer reference in Admin → Partners.
- **Delivery fees**: Admin → Settings → Delivery (default fee, free above).

## Explicitly incomplete / honest limitations

- Commission **eligibility timing** is manual: after fulfilment + the return
  window, admin marks commissions eligible (the states and reversal logic are
  implemented; no automated scheduler runs).
- Abandoned-checkout follow-up: abandoned payments are recorded, and contact
  data + consent are stored with the order, but **no automated messaging is
  sent** (no email/SMS provider is configured — deliberate until the owner
  approves messaging).
- AI design assistance rewrites/re-ranks database results and can sketch a
  labelled concept on request; it does not produce guaranteed-manufacturable
  designs or final quotations.
- The 3D configurator was intentionally not built (no suitable models).
- The legacy "Royale" commission request flow remains as an internal bespoke
  service; the customer-facing tier equivalent is **DREAMZ Bespoke** +
  Design Yours.
- The staging-uploads folder (customer-submitted WhatsApp reference images)
  was preserved untouched, per the requirement to keep private customer
  submissions intact.
