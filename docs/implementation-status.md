# Implementation status: production storefront completion (2026-10-24)

This is the resume point for the next session. Read it before doing any discovery.

## Discovery (done, do not repeat)

- **The 17 recent PNG uploads are not in this project.** I checked the repo, `public/`, the Netlify Blobs `dfk-media` store and the `media_assets`/`product_images` tables. The only Blobs object is a customer design reference. Their drafts `DFK-DFT-150 … 166` stay unpublished. The details are in `docs/upload-reconciliation.md`.
- **No 3D models exist.** There are no `.glb`/`.gltf` files, no D5EX starter zip and no three.js dependency.
- **Database.** The preview branch mirrors production: 33 published products, 0 orders, 1 referrer (public track), partner `commissionBps = 0` (no approved creator rate), deposits disabled.
- **Payment.** `PAYSTACK_SECRET_KEY` is absent from the build environment. Checkout detects this through `getPaymentProvider("paystack")`.
- **Product imagery.**
  - 18 product images are house posters with prices and text printed on the artwork (`POSTER_FILES` in `src/lib/img.ts`).
  - The DREAMZ Originals images are clean photographs.
  - Boot of Many Colours has a clean studio photo, the approved hero image, now at `public/img/products/boot-of-many-colours-studio.jpg`.
- **Git commits** are created by the platform, not by the agent. The checkpoints are recorded here instead.

## Defects found and fixed

1. **Delivery units.** Admin enters delivery settings in ₦ (fee 3,500, free above 150,000), but checkout compared them with kobo totals. Every order was therefore shown as "Complimentary". The fix is in `src/lib/delivery.ts`.
2. **Orphan orders.** When payment was unavailable, `initializeCheckout` created the order and only then threw an error, leaving orphan `pending_payment` orders.
3. **Commission reversals.** `reverseCommissionsForOrder` was never called, and no refund path existed.
4. **Payouts.**
   - Payout requests didn't link the commissions they covered.
   - A payout could be marked "paid" without a transfer reference.
   - The payout threshold was labelled ₦ but saved as kobo.
5. **Commission terms.** Commission was calculated on the total including delivery. Codes typed at checkout weren't supported, and attribution wasn't saved on the order.
6. **Wrong location.** The About page said "from Lagos", which isn't in the approved business details. It now says "from Nigeria".
7. **Public references.** Customer design references were served from the public, immutable-cached `/api/media` route.

## Checkpoints

| Stage | State |
|---|---|
| 1. Homepage hero + navigation | Done. The hero copy is exact, the CTAs go to `/custom` and `/shop`, and the nav is Design Yours, See Samples, Creators & Partners, About, Help. |
| A. 17-upload reconciliation | Done. All 17 are inaccessible, and each one is recorded. |
| B. Cart → delivery → unpaid order request | Done. Verified in a real browser on the local dev server. |
| C. Creators & Partners | Done. Code/link, attribution, dashboard and ledger are tested. The rate is still unset in production. |
| D. 3D configurator | **Blocked: no models.** The written-spec workspace, reference uploads and design-to-order flow are done and browser-verified. |
| 6. Customer experience | Partial. The items handled are listed in the results. |
| 7. Verify | 165 tests pass and typecheck is clean. 40 browser checks passed: 39 directly, and 1 confirmed by a database query (see Verification). |

## Attribution and commission rules (`src/lib/attribution.ts`)

- Codes are case-insensitive. An explicit, valid checkout code takes precedence over a referral link.
- Attribution is saved on the order (`orders.referrer_id`, `referral_code`, `attribution_source`, `attribution_outcome`) when it is created, including for unpaid requests.
- The commission lifecycle:
  - an unpaid order earns nothing
  - a verified full payment creates one pending row per order and partner, protected by a unique index, so duplicate payment events do nothing
  - the row becomes eligible after delivery plus `returnWindowDays` (default 2, matching the 48-hour returns policy)
  - a refund or cancellation reverses it
  - it becomes paid only through a payout with a recorded transfer reference
- The commission basis is merchandise after discounts, excluding delivery.
- Only creator and trade tracks earn cash commission.
- Self-purchases (same account, email or phone) never earn commission. A purchase benefit applies only if the owner sets `selfPurchaseBenefitBps`.
- While `commissionBps = 0`, the site shows "Rate confirmed on approval", and the admin can't approve creator or trade partners.

## 3D dependency (what is needed to finish stage D)

The model needs to be a GLB (glTF 2.0, Draco or Meshopt compressed, ideally under 5 MB) of **Boot of Many Colours** at real-world scale, with separately named meshes for:

- `toe_cap`, `front_vamp`, `cross_vamp`, `instep_panel`, `rear_vamp`, `heel_quarter`, `shaft`, `eyestay`, `collar`
- `sole`, `laces`, `eyelets`

Each panel needs its own UVs plus leather normal and roughness maps, and the stitching should be baked into normal maps. Height options need separately authored geometry variants or morph targets.

When the model exists:

1. Set `model3d` and `has3d: true` in `src/lib/design-templates.ts` and bump `modelVersion`.
2. Add a lazy-loaded viewer. The part keys already match the saved design format.
