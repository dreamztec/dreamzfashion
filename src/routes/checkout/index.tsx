import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  initializeCheckout,
  type CheckoutInput,
} from "@/server/checkout.functions";
import { getShippingConfig, getSiteSettings } from "@/server/catalog.functions";
import { validateVoucherCode } from "@/server/voucher.functions";
import { getCheckoutOptions, checkDepositEligibility } from "@/server/checkout.public.functions";
import { useCart } from "@/store/cart";
import { formatNaira, NIGERIAN_STATES } from "@/lib/format";
import { BRAND } from "@/lib/config";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/checkout/")({
  loader: async () => {
    const [shipping, settings, options] = await Promise.all([
      getShippingConfig(),
      getSiteSettings(),
      getCheckoutOptions(),
    ]);
    // BNPL is only surfaced when a provider is actually configured and the
    // admin flag is on — an honest configuration state, never a fake option.
    return {
      shipping,
      bnplAvailable: options.bnplAvailable,
      depositTerms: {
        enabled: (options.deposits as { enabled?: boolean }).enabled ?? false,
        percent: (options.deposits as { defaultPercent?: number }).defaultPercent ?? 50,
        termsText: (options.deposits as { termsText?: string }).termsText ?? "",
        balanceDueDays: (options.deposits as { balanceDueDays?: number }).balanceDueDays ?? 0,
      },
      whatsappNumber:
        ((settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "") as string,
    };
  },
  head: () => ({
    meta: [
      { title: `Checkout — ${BRAND.name}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { shipping, whatsappNumber, bnplAvailable, depositTerms } = Route.useLoaderData() as {
    shipping: { defaultFee: number; freeThreshold: number };
    whatsappNumber: string;
    bnplAvailable: boolean;
    depositTerms: { enabled: boolean; percent: number; termsText: string; balanceDueDays: number };
  };
  const { items, subtotal, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [payDeposit, setPayDeposit] = useState(false);
  const [depositEligible, setDepositEligible] = useState<{ eligible: boolean; checked: boolean }>({
    eligible: false,
    checked: false,
  });
  const total = subtotal();
  const deliveryFee =
    total >= (shipping.freeThreshold ?? 150000) ? 0 : (shipping.defaultFee ?? 3500);
  const remainingForFree = Math.max(0, (shipping.freeThreshold ?? 150000) - total);

  // Deposit eligibility is a server question (the order creation re-verifies
  // it); this only decides whether the option is offered.
  useEffect(() => {
    if (depositTerms.enabled && items.length > 0) {
      checkDepositEligibility({ data: items.map((i) => i.productId) })
        .then((res) => setDepositEligible({ eligible: res.eligible, checked: true }))
        .catch(() => setDepositEligible({ eligible: false, checked: true }));
    }
  }, [items, depositTerms.enabled]);

  // Voucher entry — validated server-side; the discount itself is computed
  // again during order creation. Nothing here is trusted for pricing.
  const [voucherInput, setVoucherInput] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; valueLabel: string } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherBusy, setVoucherBusy] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    try {
      void fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "begin_checkout",
          data: { items: items.length, valueKobo: total },
        }),
        keepalive: true,
      });
    } catch {
      /* analytics must never break checkout */
    }
    // Fires once per checkout view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center">
        <h1 className="font-editorial text-3xl mb-4">Your cart is empty</h1>
        <p className="text-stone mb-8">Add a piece before proceeding to checkout.</p>
        <Link
          to="/shop"
          search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }}
          className="btn-lux btn-lux-primary"
        >
          Shop Collection
        </Link>
      </div>
    );
  }

  async function applyVoucher(e: FormEvent) {
    e.preventDefault();
    setVoucherBusy(true);
    setVoucherError(null);
    try {
      const res = await validateVoucherCode({ data: { code: voucherInput } });
      if (!res.ok) {
        setVoucherError(res.reason ?? "We couldn't validate this voucher.");
        setVoucher(null);
      } else {
        setVoucher({ code: res.voucher.code, valueLabel: res.voucher.valueLabel });
      }
    } catch {
      setVoucherError("We couldn't validate this voucher right now. Please try again.");
    } finally {
      setVoucherBusy(false);
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      const payload: CheckoutInput = {
        name: String(formData.get("name") || ""),
        phone: String(formData.get("phone") || ""),
        email: String(formData.get("email") || ""),
        state: String(formData.get("state") || ""),
        city: String(formData.get("city") || ""),
        address: String(formData.get("address") || ""),
        deliveryNote: String(formData.get("deliveryNote") || ""),
        giftNote: String(formData.get("giftNote") || ""),
        items: items.map((i) => ({
          productId: i.productId,
          variantLabel: i.variantLabel,
          purchaseOption: i.purchaseOption,
          customization: i.customization,
          quantity: i.quantity,
        })),
        voucherCode: voucher?.code ?? "",
        paymentPlan: payDeposit && depositEligible.eligible ? "deposit" : "full",
        marketingConsent,
        referralSessionId: readReferralSession(),
      };
      const result = await initializeCheckout({ data: payload });
      clear();
      if ("fullyCovered" in result && result.fullyCovered) {
        window.location.href = result.orderUrl;
        return;
      }
      window.location.href = result.authorizationUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not start the payment. You have not been charged. Please try again or chat with us.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-32 pb-24">
      <div className="text-center mb-12">
        <p className="overline-label mb-3">Secure Checkout</p>
        <h1 className="font-editorial text-4xl sm:text-5xl">Almost Yours</h1>
      </div>

      <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr]">
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-6">
            Delivery Details
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="input-lux-label">Full Name</label>
              <input id="name" name="name" required minLength={2} autoComplete="name" className="input-lux" placeholder="Ada Obi" />
            </div>
            <div>
              <label htmlFor="phone" className="input-lux-label">Phone (WhatsApp preferred)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                className="input-lux"
                placeholder="0803 000 0000"
              />
            </div>
            <div>
              <label htmlFor="email" className="input-lux-label">Email (for your receipt)</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="input-lux"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="state" className="input-lux-label">Delivery State</label>
              <select id="state" name="state" required defaultValue="" className="input-lux">
                <option value="" disabled>Select state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="city" className="input-lux-label">City</label>
              <input id="city" name="city" required minLength={2} className="input-lux" placeholder="Ikeja" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="input-lux-label">Delivery Address</label>
              <input
                id="address"
                name="address"
                required
                minLength={6}
                autoComplete="street-address"
                className="input-lux"
                placeholder="12 Allen Avenue, off Toyin Street"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="deliveryNote" className="input-lux-label">
                Delivery Notes <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                id="deliveryNote"
                name="deliveryNote"
                rows={2}
                className="input-lux"
                placeholder="Landmark, delivery window, gate details…"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="giftNote" className="input-lux-label">
                Gift Message <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <textarea
                id="giftNote"
                name="giftNote"
                rows={2}
                maxLength={300}
                className="input-lux"
                placeholder="A note to include with the gift box…"
              />
            </div>
          </div>

          {/* Deposit option — only when the server confirms eligibility */}
          {depositEligible.eligible && (
            <div className="mt-8 border border-ink/15 px-5 py-5">
              <p className="input-lux-label">How would you like to pay?</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPayDeposit(false)}
                  aria-pressed={!payDeposit}
                  className={`text-left border px-4 py-3.5 transition-colors ${
                    !payDeposit ? "border-ink bg-ink/[0.03]" : "border-ink/20 hover:border-ink/50"
                  }`}
                >
                  <span className="block text-[0.68rem] uppercase tracking-btn">Pay in Full</span>
                  <span className="block text-xs text-stone mt-0.5">
                    {formatNaira(total + deliveryFee)} now — nothing more to pay.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayDeposit(true)}
                  aria-pressed={payDeposit}
                  className={`text-left border px-4 py-3.5 transition-colors ${
                    payDeposit ? "border-ink bg-ink/[0.03]" : "border-ink/20 hover:border-ink/50"
                  }`}
                >
                  <span className="block text-[0.68rem] uppercase tracking-btn">
                    Pay {depositTerms.percent}% Deposit
                  </span>
                  <span className="block text-xs text-stone mt-0.5">
                    {formatNaira(Math.round((total * depositTerms.percent) / 100) + deliveryFee)} now
                    {depositTerms.balanceDueDays > 0
                      ? `, balance within ${depositTerms.balanceDueDays} days`
                      : ", balance before dispatch"}
                  </span>
                </button>
              </div>
              <p className="mt-3 text-xs text-stone leading-relaxed">
                {depositTerms.termsText ||
                  "Deposit orders enter production once the deposit clears. The balance must be fully paid before your piece is dispatched. Cancellation terms are confirmed with your order confirmation."}
              </p>
            </div>
          )}

          {/* Marketing consent — explicit, stored with the order */}
          <label className="mt-6 flex items-start gap-2.5 text-xs text-stone leading-relaxed">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Email me occasional updates — new arrivals and the anniversary
              collection. No spam; unsubscribe anytime.
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-6 border border-oxblood/40 bg-oxblood/5 text-oxblood text-sm px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-lux btn-lux-primary w-full mt-8"
          >
            {submitting
              ? "Connecting to Paystack…"
              : payDeposit && depositEligible.eligible
                ? `Pay ${depositTerms.percent}% Deposit with Paystack`
                : "Pay with Paystack"}
          </button>
          {bnplAvailable && (
            <p className="mt-3 text-center text-xs text-stone">
              Pay in Installments — a Buy Now, Pay Later option handled by our
              payment partner and subject to approval, is available during
              payment.
            </p>
          )}
          <p className="mt-4 text-center text-xs text-stone">
            Card, bank transfer and USSD supported. Payments are processed
            securely by Paystack — card details never touch our servers.
          </p>
        </form>

        {/* Summary */}
        <aside className="lg:border-l lg:border-ink/10 lg:pl-12">
          <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-6">
            Order Summary
          </h2>
          <ul className="divide-y divide-ink/10">
            {items.map((item) => (
              <li key={item.id} className="py-4 flex justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.variantLabel && <p className="text-xs text-stone mt-0.5">{item.variantLabel}</p>}
                  <p className="text-xs text-stone mt-0.5 uppercase tracking-wide">
                    {item.purchaseOption === "complete_package"
                      ? "Complete Package"
                      : "Product Only"}
                  </p>
                  {item.customization && (
                    <p className="text-xs text-gold mt-0.5 uppercase tracking-wide">Custom piece</p>
                  )}
                  <p className="text-xs text-stone mt-1">Qty {item.quantity}</p>
                </div>
                <span className="whitespace-nowrap">{formatNaira(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone">Subtotal</dt>
              <dd>{formatNaira(total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone">Delivery</dt>
              <dd>{deliveryFee === 0 ? "Complimentary" : formatNaira(deliveryFee)}</dd>
            </div>
            {deliveryFee > 0 && remainingForFree > 0 && (
              <p className="text-xs text-stone">
                Add {formatNaira(remainingForFree)} more for complimentary
                nationwide delivery.
              </p>
            )}
            {voucher && (
              <div className="flex justify-between text-forest">
                <dt>Voucher ({voucher.code})</dt>
                <dd>applied at confirmation</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ink/10 pt-3 mt-3">
              <dt className="uppercase tracking-btn text-xs self-center">Total</dt>
              <dd className="font-editorial text-2xl">{formatNaira(total + deliveryFee)}</dd>
            </div>
          </dl>

          {/* Voucher — server-validated; final discount is computed again server-side */}
          <div className="mt-6 border-t border-ink/10 pt-5">
            {voucher ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="text-forest">✓ {voucher.code}</span>{" "}
                  <span className="text-stone">— {voucher.valueLabel}</span>
                </p>
                <button type="button" onClick={() => { setVoucher(null); setVoucherInput(""); }} className="text-xs underline text-stone">
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={applyVoucher} className="flex gap-2">
                <input
                  className="input-lux flex-1 uppercase tracking-[0.15em]"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                  placeholder="Voucher code"
                  aria-label="Voucher code"
                  minLength={4}
                  maxLength={40}
                />
                <button type="submit" className="btn-lux btn-lux-outline !py-2.5 !px-5 whitespace-nowrap" disabled={voucherBusy || voucherInput.trim().length < 4}>
                  {voucherBusy ? "Checking…" : "Apply"}
                </button>
              </form>
            )}
            {voucherError && <p className="text-xs text-brand-red mt-2">{voucherError}</p>}
            <p className="text-[0.66rem] text-stone mt-2">
              The final discount is confirmed server-side before payment. If a
              voucher covers the entire order, no card charge is made.
            </p>
          </div>
          <div className="mt-8 space-y-3 text-center">
            <WhatsAppCTAButton
              message={GENERAL_INQUIRY}
              whatsappNumber={whatsappNumber}
              label={`Questions? Message ${BRAND.shortName} on WhatsApp`}
            />
            <p className="text-xs text-stone">
              Prefer to call?{" "}
              <a href={CONTACT.phoneHref} className="underline hover:text-ink">
                {CONTACT.phoneDisplay}
              </a>{" "}
              ·{" "}
              <a href={`mailto:${CONTACT.email}`} className="underline hover:text-ink break-all">
                {CONTACT.email}
              </a>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** First-party referral attribution stored at /r/CODE click time. */
function readReferralSession(): string | undefined {
  try {
    const raw = localStorage.getItem("dfk-ref");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { sessionId?: unknown };
    return typeof parsed.sessionId === "string" ? parsed.sessionId : undefined;
  } catch {
    return undefined;
  }
}
