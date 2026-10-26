import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Catalog ──────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").default(""),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    categorySlug: text("category_slug").notNull(),
    subcategory: text("subcategory"),
    collection: text("collection"),
    // Once the house approves a product's home collection, automatic
    // suggestions must never move it. Admin can deliberately unlock/change it.
    collectionLocked: boolean("collection_locked").notNull().default(false),
    // Explicit merchandising order for the front-page Originals edit.
    // null = not in the curated front edit.
    frontOriginalRank: integer("front_original_rank"),
    price: integer("price").notNull(), // kobo — "Product Only" price
    completePackagePrice: integer("complete_package_price"), // kobo — "Complete Package" price; null = single-price product
    packageContents: jsonb("package_contents").$type<string[]>().notNull().default([]),
    compareAtPrice: integer("compare_at_price"),
    currency: text("currency").notNull().default("NGN"),
    shortDescription: text("short_description").notNull().default(""),
    fullDescription: text("full_description").notNull().default(""),
    materials: text("materials"),
    colors: jsonb("colors").$type<string[]>().notNull().default([]),
    sizes: jsonb("sizes").$type<string[]>().notNull().default([]),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    availability: text("availability").notNull().default("in_stock"),
    featured: boolean("featured").notNull().default(false),
    newArrival: boolean("new_arrival").notNull().default(false),
    bestseller: boolean("bestseller").notNull().default(false),
    // Explicit admin controls, never derived from a SKU or automatic rules.
    homepageHero: boolean("homepage_hero").notNull().default(false),
    customizable: boolean("customizable").notNull().default(false),
    // Product line: essentials (ready-to-wear) | originals (house collections
    // and signature releases) | royale (bespoke client service showcase).
    // This is a brand line, NOT a price band — never derive it from price.
    productLine: text("product_line").notNull().default("essentials"),
    // Customer-facing commercial tier, editable in admin and kept separate
    // from packaging: essentials | signature | bespoke.
    // Bespoke products are quote-only by definition.
    tier: text("tier").notNull().default("essentials"),
    // Private internal unit cost in kobo. Never sent to the storefront —
    // used only for admin contribution reporting. null = cost not yet recorded
    // (margin figures are then labelled "incomplete").
    internalCostKobo: integer("internal_cost_kobo"),
    // Deposit plan: when true (and a house default percent is configured) the
    // product can be bought with a deposit + balance. depositPercent overrides
    // the house default per product (whole percent, 1–90).
    depositEligible: boolean("deposit_eligible").notNull().default(false),
    depositPercent: integer("deposit_percent"),
    // Optional personalization offered at a clearly stated extra charge.
    personalizationLabel: text("personalization_label"),
    personalizationChargeKobo: integer("personalization_charge_kobo"),
    sizeGuide: text("size_guide"),
    returnsTerms: text("returns_terms"),
    // Admin gate: when false, checkout is blocked even if the product is
    // published and priced (e.g. while imagery or variant data is incomplete).
    checkoutReady: boolean("checkout_ready").notNull().default(true),
    careInformation: text("care_information"),
    deliveryInformation: text("delivery_information"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    // "contain" shows the whole product (default — clean product photography
    // is never cropped); "cover" fills the frame for lifestyle/editorial
    // imagery or poster artwork the admin chooses to fill with.
    imageFit: text("image_fit").notNull().default("contain"),
    status: text("status").notNull().default("published"), // draft | published | archived
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.categorySlug), index("products_tier_idx").on(t.tier)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    position: integer("position").notNull().default(0),
    // Image role: product (clean product photography) | lifestyle (editorial
    // scene) | catalogue (poster/artwork). Photography defaults to "contain"
    // display; lifestyle may crop ("cover").
    kind: text("kind").notNull().default("product"),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    color: text("color"),
    size: text("size"),
    price: integer("price"), // nullable = inherits product price
    stockQuantity: integer("stock_quantity").notNull().default(0),
    sku: text("sku"),
  },
  (t) => [index("product_variants_product_idx").on(t.productId)],
);

// ── Commerce ─────────────────────────────────────────────────────────

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  state: text("state").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  deliveryNote: text("delivery_note"),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  // Voucher discount applied server-side (kobo) — filled at order creation.
  discountKobo: integer("discount_kobo").notNull().default(0),
  voucherCode: text("voucher_code"),
  // Payment plan: full (single charge) | deposit (deposit now, balance later).
  // Deposit amounts are computed server-side from admin-configured terms —
  // never trusted from the client.
  paymentPlan: text("payment_plan").notNull().default("full"),
  depositKobo: integer("deposit_kobo").notNull().default(0), // due at checkout under a deposit plan
  balanceKobo: integer("balance_kobo").notNull().default(0), // outstanding after the deposit clears
  paidKobo: integer("paid_kobo").notNull().default(0), // verified cash received so far
  balanceDueAt: timestamp("balance_due_at"), // agreed deadline for the balance
  // Explicit marketing consent captured at checkout. Contact preferences
  // live in durable storage, never in the browser.
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  // Set when the order was placed by a signed-in customer (verified JWT).
  customerId: integer("customer_id"),
  total: integer("total").notNull(),
  currency: text("currency").notNull().default("NGN"),
  paymentStatus: text("payment_status").notNull().default("pending"), // pending_payment | deposit_paid | paid | failed | abandoned | refunded
  paymentReference: text("payment_reference"),
  paymentMethod: text("payment_method"),
  giftNote: text("gift_note"),
  status: text("status").notNull().default("order_received"), // lifecycle statuses
  timeline: jsonb("timeline")
    .$type<Array<{ status: string; at: string; note?: string }>>()
    .notNull()
    .default([]),
  adminNotes: text("admin_notes"),
  // Browser-generated submission key: a retried or double-clicked submit
  // returns the existing order instead of creating a duplicate.
  clientRequestId: text("client_request_id").unique(),
  // Partner attribution, resolved server-side and saved on the order so it
  // survives an unpaid request through to later verified payment.
  // source: checkout_code (explicit code wins) | referral_link
  // outcome: commission | self_purchase | self_purchase_benefit | not_eligible
  referrerId: integer("referrer_id"),
  referralCode: text("referral_code"),
  attributionSource: text("attribution_source"),
  attributionOutcome: text("attribution_outcome"),
  // Owner-configured creator self-purchase benefit applied (kobo).
  selfPurchaseBenefitKobo: integer("self_purchase_benefit_kobo").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id"),
    sku: text("sku"),
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label"),
    size: text("size"),
    purchaseOption: text("purchase_option").notNull().default("product_only"),
    customization: jsonb("customization").$type<Record<string, string>>(),
    imageUrl: text("image_url"),
    unitPrice: integer("unit_price").notNull(),
    // Snapshot of the product's private internal cost at order time (kobo).
    // Null when cost was not recorded — contribution is then "incomplete".
    unitCostKobo: integer("unit_cost_kobo"),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

// ── Media library (admin-managed, product vs editorial separation) ───

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull(),
    title: text("title").notNull().default(""),
    altText: text("alt_text").notNull().default(""),
    // PRODUCT | CAMPAIGN | LOOKBOOK | HOMEPAGE | PARTNERSHIPS | SOCIAL | BRAND | OTHER
    category: text("category").notNull().default("OTHER"),
    // true = lifestyle/editorial media; product media must be intentionally marked
    isLifestyle: boolean("is_lifestyle").notNull().default(false),
    productId: integer("product_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("media_assets_category_idx").on(t.category)],
);

// ── Payments ledger (one row per Paystack transaction attempt) ───────

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    // Null for corporate quote milestone payments, which settle against a
    // quote rather than a shop order.
    orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }),
    reference: text("reference").notNull().unique(),
    amountKobo: integer("amount_kobo").notNull(),
    currency: text("currency").notNull().default("NGN"),
    // full | deposit | balance | quote_milestone — what this charge is for.
    kind: text("kind").notNull().default("full"),
    // Corporate quote milestone this charge settles (null for shop orders).
    corporateQuoteId: integer("corporate_quote_id"),
    // initialized | success | failed | abandoned
    status: text("status").notNull().default("initialized"),
    channel: text("channel"),
    gateway: text("gateway").notNull().default("paystack"),
    // Idempotency: set once, on the first successful confirmation.
    processedAt: timestamp("processed_at"),
    gatewayEventId: text("gateway_event_id"),
    rawResult: jsonb("raw_result").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_status_idx").on(t.status)],
);

// ── Design requests (Design Lab leads) ───────────────────────────────

export const designRequests = pgTable(
  "design_requests",
  {
    id: serial("id").primaryKey(),
    requestNumber: text("request_number").notNull().unique(),
    sessionId: text("session_id"),
    customerName: text("customer_name"),
    email: text("email"),
    phone: text("phone"),
    specification: jsonb("specification").$type<Record<string, unknown>>().notNull().default({}),
    aiSummary: text("ai_summary"),
    recommendedProductIds: jsonb("recommended_product_ids").$type<number[]>().notNull().default([]),
    referenceImageUrl: text("reference_image_url"),
    conceptImageUrl: text("concept_image_url"),
    budgetMin: integer("budget_min"),
    budgetMax: integer("budget_max"),
    status: text("status").notNull().default("new"), // new | contacted | quoted | won | archived
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("design_requests_status_idx").on(t.status)],
);

// ── Custom designs (Design Your Dream workspace) ─────────────────────
// A versioned, server-validated specification the artisan builds from.
// Reopened with designId + editToken; carried into cart and order lines.

export const customDesigns = pgTable(
  "custom_designs",
  {
    id: serial("id").primaryKey(),
    designId: text("design_id").notNull().unique(), // DZD-XXXXXXXX
    editToken: text("edit_token").notNull(),
    productId: integer("product_id").notNull(),
    // Model/version of the design template (brief template until an
    // authored 3D model exists — see src/lib/design-templates.ts).
    modelId: text("model_id").notNull(),
    modelVersion: text("model_version").notNull(),
    configVersion: integer("config_version").notNull().default(1),
    parts: jsonb("parts").$type<Record<string, string>>().notNull().default({}),
    materials: jsonb("materials").$type<Record<string, string>>().notNull().default({}),
    geometry: jsonb("geometry").$type<Record<string, string>>().notNull().default({}),
    size: text("size"),
    referenceIds: jsonb("reference_ids").$type<string[]>().notNull().default([]),
    previewKey: text("preview_key"),
    notes: text("notes"),
    // quote_required until the house prices the design.
    priceStatus: text("price_status").notNull().default("quote_required"),
    quotedPriceKobo: integer("quoted_price_kobo"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("custom_designs_product_idx").on(t.productId)],
);

// Customer inspiration uploads (Netlify Blobs key design-refs/<id>).
// Private: served only to holders of the random reference id.
export const designReferences = pgTable("design_references", {
  id: serial("id").primaryKey(),
  refId: text("ref_id").notNull().unique(),
  blobKey: text("blob_key").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  originalName: text("original_name"),
  designId: text("design_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Product reviews (architecture now; moderation before display) ────

export const productReviews = pgTable(
  "product_reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerName: text("customer_name").notNull(),
    email: text("email").notNull(),
    orderNumber: text("order_number"),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("product_reviews_product_idx").on(t.productId)],
);

// ── Partnerships / CRM ───────────────────────────────────────────────

export const partnershipEnquiries = pgTable("partnership_enquiries", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  city: text("city").notNull(),
  stateCountry: text("state_country").notNull(),
  businessType: text("business_type").notNull(),
  presence: text("presence").notNull(), // store | online | both
  productInterest: text("product_interest").notNull(),
  orderVolume: text("order_volume").notNull(),
  // Which SELL DREAMZ programme the partner is applying for:
  // bulk (A) | credit (B) | commission (C) | undecided
  partnershipCategory: text("partnership_category").notNull().default("undecided"),
  message: text("message"),
  status: text("status").notNull().default("new"), // new | contacted | approved | declined
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Custom / Bespoke ─────────────────────────────────────────────────

export const bespokeRequests = pgTable("bespoke_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  productType: text("product_type").notNull(),
  color: text("color"),
  material: text("material"),
  size: text("size"),
  budget: text("budget"),
  deadline: text("deadline"),
  referenceUrl: text("reference_url"),
  message: text("message"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  orderNumber: text("order_number"),
  feedbackType: text("feedback_type").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── System ───────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    eventName: text("event_name").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("analytics_events_name_idx").on(t.eventName)],
);

// ── BNPL provider transactions ───────────────────────────────────────

export const bnplTransactions = pgTable(
  "bnpl_transactions",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // e.g. credpal
    // BNPL_APPLICATION_STARTED | BNPL_PENDING | BNPL_APPROVED | BNPL_DECLINED |
    // BNPL_CANCELLED
    status: text("status").notNull().default("BNPL_APPLICATION_STARTED"),
    providerReference: text("provider_reference"),
    checkoutUrl: text("checkout_url"),
    rawResult: jsonb("raw_result").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("bnpl_transactions_order_idx").on(t.orderId)],
);

// ── Customer accounts (Netlify Identity — password never stored here) ─

/**
 * Mirror of Netlify Identity users. Authentication lives in Netlify Identity
 * (JWT via the nf_jwt cookie); this table holds profile/commerce linkage.
 * The auth identity is never trusted from the client — every server function
 * validates the request's JWT against Netlify Identity and reads user_id from
 * the verified token.
 */
export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    identityUserId: text("identity_user_id").notNull().unique(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull().default(""),
    phone: text("phone"),
    // Profile extras used by tasks & support
    city: text("city"),
    state: text("state"),
    referralCode: text("referral_code").notNull().unique(),
    isStudentAmbassador: boolean("is_student_ambassador").notNull().default(false),
    studentSchool: text("student_school"),
    referrerId: integer("referrer_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("customers_referrer_idx").on(t.referrerId)],
);

// ── Reward accounts + ledgers ────────────────────────────────────────

export const rewardAccounts = pgTable(
  "reward_accounts",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .unique()
      .references(() => customers.id, { onDelete: "cascade" }),
    pointsAvailable: integer("points_available").notNull().default(0),
    pointsPending: integer("points_pending").notNull().default(0),
    pointsLifetime: integer("points_lifetime").notNull().default(0),
    creditKobo: integer("credit_kobo").notNull().default(0), // DREAMZ shopping credit
    creditPendingKobo: integer("credit_pending_kobo").notNull().default(0),
    // DREAMZ-internal wallet totals. External TisasNG balances are NOT stored
    // here — TisasNG connection is a linking record (see tisasngConnections).
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

/**
 * Unified activity ledger — one row per reward/points/credit event.
 * Balances on reward_accounts are derived from and reconciled with this.
 * Never mutated by frontend code.
 */
export const rewardLedger = pgTable(
  "reward_ledger",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    // points | credit
    currency: text("currency").notNull().default("points"),
    // earned_purchase | earned_referral | earned_task | redeemed |
    // voucher_claimed | adjustment | expired
    type: text("type").notNull(),
    amount: integer("amount").notNull(), // positive = credit, negative = debit
    // pending | approved | redeemed | expired | reversed
    status: text("status").notNull().default("approved"),
    source: text("source").notNull().default("dreamz"), // dreamz | tisasng | referral | campaign
    orderNumber: text("order_number"),
    reference: text("reference"),
    campaign: text("campaign"),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("reward_ledger_customer_idx").on(t.customerId),
    index("reward_ledger_type_idx").on(t.type),
  ],
);

// ── TisasNG (external rewards — documented endpoints only) ───────────

/**
 * Link between a DREAMZ account and the customer's external TisasNG reward
 * identity. Created only after a successful server-side verification with a
 * DOCUMENTED TisasNG endpoint. Feature-flagged: TISASNG_LINKING_ENABLED.
 */
export const tisasngConnections = pgTable(
  "tisasng_connections",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id")
      .notNull()
      .unique()
      .references(() => customers.id, { onDelete: "cascade" }),
    // Only identifiers officially returned by TisasNG APIs are stored here.
    externalId: text("external_id").notNull(),
    externalLabel: text("external_label"),
    status: text("status").notNull().default("connected"), // connected | unlinked
    lastVerifiedAt: timestamp("last_verified_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
);

/**
 * Server-to-server transactions with the TisasNG API (balance checks,
 * documented gift operations). Responses are logged for audit, never exposed
 * publicly — they may include wallet balances.
 */
export const externalRewardTransactions = pgTable(
  "external_reward_transactions",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("tisasng"),
    operation: text("operation").notNull(), // balance_check | gift | link_verify
    status: text("status").notNull().default("ok"), // ok | error
    reference: text("reference"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("ext_reward_tx_customer_idx").on(t.customerId)],
);

// ── Vouchers (printed DREAMZ voucher codes) ──────────────────────────

export const vouchers = pgTable(
  "vouchers",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    campaign: text("campaign"),
    // fixed | percentage | product | category | campaign_reward
    type: text("type").notNull().default("fixed"),
    // kobo for fixed-value vouchers; basis points (1000 = 10%) for percentage
    value: integer("value").notNull().default(0),
    currency: text("currency").notNull().default("NGN"),
    minimumSpend: integer("minimum_spend").notNull().default(0), // kobo
    maximumDiscount: integer("maximum_discount"), // kobo cap for percentage vouchers
    eligibleProducts: jsonb("eligible_products").$type<number[]>().notNull().default([]),
    eligibleCategories: jsonb("eligible_categories").$type<string[]>().notNull().default([]),
    validFrom: timestamp("valid_from"),
    expiresAt: timestamp("expires_at"),
    singleUse: boolean("single_use").notNull().default(true),
    assignedCustomerId: integer("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    // imported | available | claimed | reserved | redeemed | expired | cancelled
    status: text("status").notNull().default("available"),
    claimedByCustomerId: integer("claimed_by_customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimed_at"),
    redeemedOrderId: integer("redeemed_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    redeemedAt: timestamp("redeemed_at"),
    claimToken: text("claim_token"),
    updatedAt: timestamp("updated_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("vouchers_status_idx").on(t.status),
    index("vouchers_claimed_by_idx").on(t.claimedByCustomerId),
  ],
);

/**
 * Guest checkout with a voucher: the voucher is held (applied) while payment
 * is pending, permanently redeemed only after verified payment, and released
 * if the payment fails or the order is cancelled.
 */
export const voucherRedemptions = pgTable(
  "voucher_redemptions",
  {
    id: serial("id").primaryKey(),
    voucherId: integer("voucher_id")
      .notNull()
      .references(() => vouchers.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // held | redeemed | released
    status: text("status").notNull().default("held"),
    discountKobo: integer("discount_kobo").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    releasedAt: timestamp("released_at"),
    redeemedAt: timestamp("redeemed_at"),
  },
  (t) => [index("voucher_redemptions_order_idx").on(t.orderId)],
);

// ── Referrals ────────────────────────────────────────────────────────

/**
 * Referral programme configuration (student + general public tracks).
 * Admin-configurable; no commission rate is hard-coded.
 */
export const referralPrograms = pgTable(
  "referral_programs",
  {
    id: serial("id").primaryKey(),
    // student | public — one programme per track
    track: text("track").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    // points | credit | voucher | cash
    rewardType: text("reward_type").notNull().default("points"),
    // Basis points of order value (e.g. 500 = 5%) for cash/credit; ignored for
    // points-type rewards which use pointsPerNaira1000 below.
    commissionBps: integer("commission_bps").notNull().default(0),
    pointsPerNaira1000: integer("points_per_naira_1000").notNull().default(0),
    minOrderKobo: integer("min_order_kobo").notNull().default(0),
    payoutThresholdKobo: integer("payout_threshold_kobo").notNull().default(0),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    eligibilityNote: text("eligibility_note").notNull().default(""),
    active: boolean("active").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
);

/**
 * DREAMZ referrers — a customer (or student applicant) with a referral code.
 * Separate from customers so student applicants without an account yet can
 * be reviewed by admin before approval.
 */
export const referrers = pgTable(
  "referrers",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    track: text("track").notNull().default("public"), // student | public
    // pending | approved | rejected | suspended
    status: text("status").notNull().default("pending"),
    displayName: text("display_name").notNull().default(""),
    email: text("email"),
    phone: text("phone"),
    school: text("school"),
    socialProfile: text("social_profile"),
    agreedTerms: boolean("agreed_terms").notNull().default(false),
    // Partner business setup: digital | physical | both. Paid plans are
    // annual business-support memberships, never a requirement to earn from
    // genuine product sales (Scout remains free).
    sellingMode: text("selling_mode").notNull().default("digital"),
    partnerPlan: text("partner_plan").notNull().default("scout"),
    // undecided | bulk | credit | commission — relevant to physical/both.
    physicalModel: text("physical_model").notNull().default("undecided"),
    // not_required | payment_requested | paid | waived
    membershipPaymentStatus: text("membership_payment_status").notNull().default("not_required"),
    membershipStartsAt: timestamp("membership_starts_at"),
    membershipExpiresAt: timestamp("membership_expires_at"),
    // Optional single-level introducer code. There is deliberately no
    // recursive parent/downline relation.
    introducerCode: text("introducer_code"),
    programId: integer("program_id").references(() => referralPrograms.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("referrers_status_idx").on(t.status)],
);

export const referralClicks = pgTable(
  "referral_clicks",
  {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id")
      .notNull()
      .references(() => referrers.id, { onDelete: "cascade" }),
    landingPath: text("landing_path"),
    sessionId: text("session_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("referral_clicks_referrer_idx").on(t.referrerId)],
);

/**
 * Attribution chains a referred visitor to their DREAMZ account (or guest
 * order). Rewards are only created from verified orders — never from clicks.
 */
export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id")
      .notNull()
      .references(() => referrers.id, { onDelete: "cascade" }),
    // clicked | registered | order_started | payment_verified
    status: text("status").notNull().default("clicked"),
    sessionId: text("session_id"),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    orderNumber: text("order_number"),
    orderId: integer("order_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("referral_attributions_referrer_idx").on(t.referrerId),
    index("referral_attributions_session_idx").on(t.sessionId),
  ],
);

/**
 * Referral rewards — created only after verified payment, once per order.
 * Amounts in kobo (cash/credit) or points. Statuses: pending → approved →
 * paid | rejected | reversed.
 */
export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id")
      .notNull()
      .references(() => referrers.id, { onDelete: "cascade" }),
    attributionId: integer("attribution_id").references(() => referralAttributions.id, {
      onDelete: "set null",
    }),
    buyerCustomerId: integer("buyer_customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    orderNumber: text("order_number"),
    orderTotalKobo: integer("order_total_kobo").notNull().default(0),
    rewardType: text("reward_type").notNull().default("points"), // points | credit | voucher | cash
    amountKobo: integer("amount_kobo").notNull().default(0),
    amountPoints: integer("amount_points").notNull().default(0),
    programId: integer("program_id").references(() => referralPrograms.id, {
      onDelete: "set null",
    }),
    // pending | approved | paid | redeemed | rejected | reversed
    status: text("status").notNull().default("pending"),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("referral_rewards_order_uidx").on(t.orderId, t.referrerId),
    index("referral_rewards_referrer_idx").on(t.referrerId),
    index("referral_rewards_status_idx").on(t.status),
  ],
);

// ── Campaigns & task engine ──────────────────────────────────────────

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  // student | public | all
  audience: text("audience").notNull().default("all"),
  // Task requirements + reward are admin-configured JSON:
  // { tasks: [{ key, label, type, target }], reward: { type, value }, ... }
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  status: text("status").notNull().default("draft"), // draft | active | ended
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskProgress = pgTable(
  "task_progress",
  {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    taskKey: text("task_key").notNull(),
    progress: integer("progress").notNull().default(0),
    target: integer("target").notNull().default(1),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    rewardGrantedAt: timestamp("reward_granted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("task_progress_uidx").on(t.campaignId, t.customerId, t.taskKey),
    index("task_progress_customer_idx").on(t.customerId),
  ],
);

// ── Royale (premium bespoke client service) ──────────────────────────

export const royaleRequests = pgTable(
  "royale_requests",
  {
    id: serial("id").primaryKey(),
    requestNumber: text("request_number").notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    productType: text("product_type").notNull().default(""),
    designDirection: text("design_direction"),
    colors: text("colors"),
    materials: text("materials"),
    size: text("size"),
    monogram: text("monogram"),
    hardware: text("hardware"),
    sole: text("sole"),
    finishing: text("finishing"),
    occasion: text("occasion"),
    budgetMin: integer("budget_min"), // kobo
    budgetMax: integer("budget_max"), // kobo; null = no maximum
    deadline: text("deadline"),
    referenceImageUrl: text("reference_url"),
    inspirationNotes: text("inspiration_notes"),
    status: text("status").notNull().default("new"), // new | contacted | consultation | quoted | won | archived
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("royale_requests_status_idx").on(t.status)],
);

// ── Corporate orders (enquiry → qualification → quote → acceptance) ──

export const corporateEnquiries = pgTable(
  "corporate_enquiries",
  {
    id: serial("id").primaryKey(),
    enquiryNumber: text("enquiry_number").notNull().unique(),
    companyName: text("company_name").notNull(),
    contactPerson: text("contact_person").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    productInterests: text("product_interests").notNull().default(""),
    quantity: text("quantity").notNull().default(""),
    budgetRange: text("budget_range").notNull().default(""),
    deadline: text("deadline"),
    deliveryLocation: text("delivery_location").notNull().default(""),
    brandingRequirements: text("branding_requirements"),
    referenceUrl: text("reference_url"),
    message: text("message"),
    // new | qualified | quoted | accepted | production | delivered | closed
    status: text("status").notNull().default("new"),
    // Free-text follow-up tasks for the sales workflow.
    nextAction: text("next_action"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("corporate_enquiries_status_idx").on(t.status)],
);

export const corporateQuotes = pgTable(
  "corporate_quotes",
  {
    id: serial("id").primaryKey(),
    quoteNumber: text("quote_number").notNull().unique(),
    enquiryId: integer("enquiry_id").references(() => corporateEnquiries.id, {
      onDelete: "set null",
    }),
    companyName: text("company_name").notNull(),
    contactPerson: text("contact_person").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    // [{ description, quantity, unitPriceKobo }]
    lines: jsonb("lines")
      .$type<Array<{ description: string; quantity: number; unitPriceKobo: number }>>()
      .notNull()
      .default([]),
    brandingChargeKobo: integer("branding_charge_kobo").notNull().default(0),
    deliveryChargeKobo: integer("delivery_charge_kobo").notNull().default(0),
    subtotalKobo: integer("subtotal_kobo").notNull().default(0),
    totalKobo: integer("total_kobo").notNull().default(0),
    validUntil: timestamp("valid_until"),
    // [{ label, percent, note }] — payment milestones agreed with the client.
    milestones: jsonb("milestones")
      .$type<Array<{ label: string; percent: number; note?: string }>>()
      .notNull()
      .default([]),
    terms: text("terms"),
    deliveryExpectation: text("delivery_expectation"),
    // draft | sent | accepted | declined | expired | production | delivered
    status: text("status").notNull().default("draft"),
    // Secret token required (besides the quote number) to view the quote.
    accessToken: text("access_token").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("corporate_quotes_status_idx").on(t.status)],
);

// ── Earn with DREAMZ — partner system ────────────────────────────────

/**
 * Extended partner profile for creator and trade partners (referral partners
 * use the plain referrers row). Created on approval; storefronts go live only
 * after an admin sets storefrontStatus = 'live'.
 */
export const partnerProfiles = pgTable(
  "partner_profiles",
  {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id")
      .notNull()
      .unique()
      .references(() => referrers.id, { onDelete: "cascade" }),
    // creator | trade (referral partners have no profile row)
    partnerType: text("partner_type").notNull().default("creator"),
    storeName: text("store_name"),
    storeSlug: text("store_slug").unique(),
    bio: text("bio"),
    instagram: text("instagram"),
    // Product ids the creator may present on their storefront — curated and
    // approved by DREAMZ. Never the whole catalogue.
    curatedProductIds: jsonb("curated_product_ids").$type<number[]>().notNull().default([]),
    // off | pending | live — an admin turns the storefront on.
    storefrontStatus: text("storefront_status").notNull().default("off"),
    // Trade partners: negotiated per-order via quotes; no self-serve pricing.
    tradeNote: text("trade_note"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("partner_profiles_referrer_idx").on(t.referrerId)],
);

/**
 * Commission ledger for creator and trade partners (referral-track rewards
 * continue through referral_rewards). One row per (order, partner).
 * pending → eligible (after fulfilment + return period) → paid, with
 * reversed for refunds/cancellations.
 */
export const commissions = pgTable(
  "commissions",
  {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id")
      .notNull()
      .references(() => referrers.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    orderNumber: text("order_number"),
    orderTotalKobo: integer("order_total_kobo").notNull().default(0),
    rateBps: integer("rate_bps").notNull().default(0),
    amountKobo: integer("amount_kobo").notNull().default(0),
    // pending | eligible | paid | reversed
    status: text("status").notNull().default("pending"),
    eligibleAt: timestamp("eligible_at"),
    paidAt: timestamp("paid_at"),
    payoutRequestId: integer("payout_request_id"),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    uniqueIndex("commissions_order_partner_uidx").on(t.orderId, t.referrerId),
    index("commissions_status_idx").on(t.status),
    index("commissions_referrer_idx").on(t.referrerId),
  ],
);

/**
 * Payout requests — partners ask, the house reviews and records the transfer
 * reference. No automatic money movement.
 */
export const payoutRequests = pgTable(
  "payout_requests",
  {
    id: serial("id").primaryKey(),
    referrerId: integer("referrer_id")
      .notNull()
      .references(() => referrers.id, { onDelete: "cascade" }),
    amountKobo: integer("amount_kobo").notNull(),
    // requested | approved | paid | rejected
    status: text("status").notNull().default("requested"),
    destination: text("destination"), // bank/account hint provided by the partner
    adminReference: text("admin_reference"), // transfer reference recorded by admin
    note: text("note"),
    requestedAt: timestamp("created_at").defaultNow(),
    processedAt: timestamp("processed_at"),
  },
  (t) => [index("payout_requests_referrer_idx").on(t.referrerId), index("payout_requests_status_idx").on(t.status)],
);

// ── Anniversary waitlist (free early-access signup) ──────────────────

export const waitlist = pgTable(
  "waitlist",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    phone: text("phone"),
    interest: text("interest").notNull().default(""), // what they hope to see
    source: text("source").notNull().default("anniversary"),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    // Waitlist registrations are counted separately from sales, never merged.
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("waitlist_email_source_uidx").on(t.email, t.source)],
);

// ── Admin users (role-based access: owner | sales | operations) ──────

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull().default(""),
    // owner | sales | operations — checked server-side on every privileged RPC.
    role: text("role").notNull().default("operations"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("admin_users_role_idx").on(t.role)],
);

export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type DesignRequest = typeof designRequests.$inferSelect;
export type ProductReview = typeof productReviews.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type PartnershipEnquiry = typeof partnershipEnquiries.$inferSelect;
export type BnplTransaction = typeof bnplTransactions.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type RewardAccount = typeof rewardAccounts.$inferSelect;
export type RewardLedgerEntry = typeof rewardLedger.$inferSelect;
export type TisasngConnection = typeof tisasngConnections.$inferSelect;
export type ExternalRewardTransaction = typeof externalRewardTransactions.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type VoucherRedemption = typeof voucherRedemptions.$inferSelect;
export type ReferralProgram = typeof referralPrograms.$inferSelect;
export type Referrer = typeof referrers.$inferSelect;
export type ReferralClick = typeof referralClicks.$inferSelect;
export type ReferralAttribution = typeof referralAttributions.$inferSelect;
export type ReferralReward = typeof referralRewards.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type TaskProgressRow = typeof taskProgress.$inferSelect;
export type RoyaleRequest = typeof royaleRequests.$inferSelect;
export type CorporateEnquiry = typeof corporateEnquiries.$inferSelect;
export type CorporateQuote = typeof corporateQuotes.$inferSelect;
export type PartnerProfile = typeof partnerProfiles.$inferSelect;
export type Commission = typeof commissions.$inferSelect;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
