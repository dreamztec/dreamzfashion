import { db } from "../../db/index";
import {
  customers,
  referralAttributions,
  referralClicks,
  referralPrograms,
  referralRewards,
  referrers,
} from "../../db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { appendLedger } from "./rewards-ledger.server";

/**
 * DREAMZ referral engine — two tracks (student ambassador / public).
 * All rates and thresholds come from referral_programs rows; nothing is
 * hard-coded. Rewards are created ONLY from verified payments, never from
 * clicks or registrations.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateReferralCode();
    const [existing] = await db
      .select({ id: referrers.id })
      .from(referrers)
      .where(eq(referrers.code, code))
      .limit(1);
    if (!existing) return code;
  }
  // Extremely unlikely fallback: longer code.
  return generateReferralCode() + generateReferralCode().slice(0, 3);
}

/**
 * Server-side attribution: record that a referral link was clicked and bind
 * the visitor session to the referrer. A click NEVER creates a reward.
 */
export async function recordReferralVisit(
  referrerId: number,
  sessionId: string,
  landingPath: string | null,
): Promise<void> {
  await db.insert(referralClicks).values({ referrerId, sessionId, landingPath });
  const [existing] = await db
    .select({ id: referralAttributions.id })
    .from(referralAttributions)
    .where(
      and(
        eq(referralAttributions.referrerId, referrerId),
        eq(referralAttributions.sessionId, sessionId),
      ),
    )
    .limit(1);
  if (!existing) {
    await db
      .insert(referralAttributions)
      .values({ referrerId, sessionId, status: "clicked" })
      .onConflictDoNothing();
  }
}

/** Mark the attribution as registered once the visitor creates an account. */
export async function markAttributionRegistered(
  sessionId: string,
  customerId: number,
): Promise<void> {
  if (!sessionId) return;
  await db
    .update(referralAttributions)
    .set({ customerId, status: "registered", updatedAt: new Date() })
    .where(
      and(
        eq(referralAttributions.sessionId, sessionId),
        eq(referralAttributions.status, "clicked"),
      ),
    );
}

/**
 * Mark the attribution as order_started when a referred visitor reaches
 * checkout with a real order (order row already created server-side).
 * Never creates a reward — only the verified-payment step does.
 */
export async function markAttributionOrderStarted(
  sessionId: string | null,
  customerId: number | null,
  orderNumber: string,
): Promise<void> {
  if (!sessionId && !customerId) return;
  const conds = [];
  if (sessionId) {
    conds.push(eq(referralAttributions.sessionId, sessionId));
  } else if (customerId) {
    conds.push(
      and(
        eq(referralAttributions.customerId, customerId),
        inArray(referralAttributions.status, ["clicked", "registered"]),
      )!,
    );
  }
  await db
    .update(referralAttributions)
    .set({ orderNumber, status: "order_started", updatedAt: new Date() })
    .where(
      and(
        ...conds,
        inArray(referralAttributions.status, ["clicked", "registered"]),
      ),
    );
}

/**
 * Verified purchase → referral rewards. Called ONLY from
 * runPostPaymentEngines after Paystack confirmation.
 *
 * Fraud guards:
 *  - self-referral: the buyer must not be the referrer's own customer row
 *  - duplicate: the (order_id, referrer_id) unique index backs the lookup
 *  - inactive referrer / inactive program: no reward
 */
export async function recordVerifiedPurchaseForReferrals(
  order: { id: number; orderNumber: string; total: number; customerId: number | null },
): Promise<void> {
  if (!order.customerId) return;

  // Find the buyer's referrer through their account attribution.
  const [attribution] = await db
    .select({
      id: referralAttributions.id,
      referrerId: referralAttributions.referrerId,
    })
    .from(referralAttributions)
    .where(
      and(
        eq(referralAttributions.customerId, order.customerId),
        inArray(referralAttributions.status, ["registered", "payment_verified"]),
      ),
    )
    .orderBy(sql`${referralAttributions.id} ASC`)
    .limit(1);
  if (!attribution) return;

  // Idempotency: this (order, referrer) pair can only ever be rewarded once.
  const [existingReward] = await db
    .select({ id: referralRewards.id })
    .from(referralRewards)
    .where(
      and(
        eq(referralRewards.orderId, order.id),
        eq(referralRewards.referrerId, attribution.referrerId),
      ),
    )
    .limit(1);
  if (existingReward) return;

  const [referrer] = await db
    .select()
    .from(referrers)
    .where(eq(referrers.id, attribution.referrerId))
    .limit(1);
  if (!referrer || referrer.status !== "approved") return;

  // Self-referral guard.
  if (referrer.customerId && referrer.customerId === order.customerId) return;

  const [program] = referrer.programId
    ? await db.select().from(referralPrograms).where(eq(referralPrograms.id, referrer.programId)).limit(1)
    : await db
        .select()
        .from(referralPrograms)
        .where(and(eq(referralPrograms.track, referrer.track), eq(referralPrograms.active, true)))
        .limit(1);
  if (!program || !program.active) return;
  if (order.total < program.minOrderKobo) return;

  // Compute the reward from the configured programme, not from client data.
  let amountKobo = 0;
  let amountPoints = 0;
  if (program.rewardType === "points") {
    amountPoints = program.pointsPerNaira1000
      ? Math.floor((order.total / 100000) * program.pointsPerNaira1000)
      : 0;
  } else if (program.rewardType === "credit" || program.rewardType === "cash" || program.rewardType === "voucher") {
    amountKobo = Math.floor((order.total * program.commissionBps) / 10000);
  }
  if (amountKobo <= 0 && amountPoints <= 0) return;

  await db.insert(referralRewards).values({
    referrerId: referrer.id,
    attributionId: attribution.id,
    buyerCustomerId: order.customerId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderTotalKobo: order.total,
    rewardType: program.rewardType,
    amountKobo,
    amountPoints,
    programId: program.id,
    status: program.requiresApproval ? "pending" : "approved",
  });

  // Credit the referrer's ledger (pending until admin approval).
  const [referrerCustomer] = referrer.customerId
    ? await db.select().from(customers).where(eq(customers.id, referrer.customerId)).limit(1)
    : [];
  if (referrerCustomer) {
    await appendLedger({
      customerId: referrerCustomer.id,
      currency: program.rewardType === "points" ? "points" : "credit",
      type: "earned_referral",
      amount: program.rewardType === "points" ? amountPoints : amountKobo,
      status: "pending",
      source: "referral",
      orderNumber: order.orderNumber,
      campaign: program.name,
      note: `Referral reward — ${order.orderNumber} (awaiting approval)`,
    });
  }

  await db
    .update(referralAttributions)
    .set({ status: "payment_verified", orderNumber: order.orderNumber, orderId: order.id, updatedAt: new Date() })
    .where(eq(referralAttributions.id, attribution.id));
}
