import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  initializeCheckout,
  previewCheckout,
  type CheckoutInput,
} from "@/server/checkout.functions";
import { getSiteSettings } from "@/server/catalog.functions";
import { getCheckoutOptions, checkDepositEligibility } from "@/server/checkout.public.functions";
import { useCart, useCartHydrated } from "@/store/cart";
import { deliveryReasonLabel } from "@/lib/delivery";
import { formatNaira, NIGERIAN_STATES } from "@/lib/format";
import { BRAND } from "@/lib/config";
import { WhatsAppCTAButton, GENERAL_INQUIRY } from "@/components/whatsapp";
import { CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/checkout/")({
  loader: async () => {
    const [settings, options] = await Promise.all([
      getSiteSettings(),
      getCheckoutOptions(),
    ]);
    // BNPL is only surfaced when a provider is actually configured and the
    // admin flag is on — an honest configuration state, never a fake option.
    return {
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

type Preview = Awaited<ReturnType<typeof previewCheckout>>;
type Pricing = Extract<Preview, { ok: true }>["pricing"];

const OUTCOME_COPY: Record<string, string> = {
  commission: "Your creator earns commission once this order is paid and fulfilled.",
  not_eligible: "Code recorded on your order. This partner type doesn't earn commission on it.",
  self_purchase: "This is your own creator code — self-purchases never earn commission.",
  self_purchase_benefit: "Creator purchase benefit applied. Self-purchases never earn commission.",
};

function newRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-req`;
  }
}

function Checkout() {
  const { whatsappNumber, bnplAvailable, depositTerms } = Route.useLoaderData() as {
    whatsappNumber: string;
    bnplAvailable: boolean;
    depositTerms: { enabled: boolean; percent: number; termsText: string; balanceDueDays: number };
  };
  const { items, clear } = useCart();
  const hydrated = useCartHydrated((s) => s.hydrated);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [payDeposit, setPayDeposit] = useState(false);
  const [depositEligible, setDepositEligible] = useState<{ eligible: boolean; checked: boolean }>({
    eligible: false,
    checked: false,
  });
  const [deliveryState, setDeliveryState] = useState("");
  const [contact, setContact] = useState({ email: "", phone: "" });
  const requestId = useRef<string>("");
  if (!requestId.current) requestId.current = newRequestId();

  // Codes are validated and priced on the server (see previewCheckout).
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [partnerInput, setPartnerInput] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  useEffect(() => {
    // A creator link (?code=) pre-fills the code; an explicit entry wins.
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    if (fromUrl) {
      setPartnerInput(fromUrl.toUpperCase());
      setPartnerCode(fromUrl.toUpperCase());
    }
  }, []);

  const lineKey = JSON.stringify(items.map((i) => [i.id, i.quantity]));
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let cancelled = false;
    setPreviewBusy(true);
    const t = setTimeout(() => {
      previewCheckout({
        data: {
          items: toLines(items),
          state: deliveryState,
          voucherCode,
          partnerCode,
          referralSessionId: readReferralSession() ?? "",
          email: contact.email,
          phone: contact.phone,
        },
      })
        .then((res) => {
          if (cancelled) return;
          setPreview(res);
          if (!res.ok && voucherCode && /voucher/i.test(res.error)) {
            setVoucherError(res.error);
            setVoucherCode("");
          }
        })
        .catch(() => {
          if (!cancelled) setPreview({ ok: false, paymentAvailable: false, error: "We couldn't calculate your total just now. Please refresh to try again." });
        })
        .finally(() => !cancelled && setPreviewBusy(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, lineKey, deliveryState, voucherCode, partnerCode, contact.email, contact.phone]);

  // Deposit eligibility is a server question (re-verified at order creation).
  useEffect(() => {
    if (depositTerms.enabled && items.length > 0) {
      checkDepositEligibility({ data: items.map((i) => i.productId) })
        .then((res) => setDepositEligible({ eligible: res.eligible, checked: true }))
        .catch(() => setDepositEligible({ eligible: false, checked: true }));
    }
  }, [items, depositTerms.enabled]);

  if (!hydrated) {
    return <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center text-stone">Loading your cart…</div>;
  }

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
          See Samples
        </Link>
      </div>
    );
  }

  const pricing: Pricing | null = preview && preview.ok ? preview.pricing : null;
  const paymentOnline = Boolean(preview?.paymentAvailable) && !pricing?.hasQuoteLines;
  const canDeposit = paymentOnline && depositEligible.eligible;

  const submit = async (form: HTMLFormElement, mode: "pay" | "request") => {
    if (submitting) return; // duplicate-submit guard (the server is idempotent too)
    setError(null);
    setSubmitting(true);
    const formData = new FormData(form);
    try {
      const payload: CheckoutInput = {
        name: String(formData.get("name") || ""),
        phone: String(formData.get("phone") || ""),
        email: String(formData.get("email") || ""),
        state: deliveryState,
        city: String(formData.get("city") || ""),
        address: String(formData.get("address") || ""),
        deliveryNote: String(formData.get("deliveryNote") || ""),
        giftNote: String(formData.get("giftNote") || ""),
        items: toLines(items),
        voucherCode,
        partnerCode,
        paymentPlan: payDeposit && canDeposit ? "deposit" : "full",
        mode: paymentOnline ? mode : "request",
        clientRequestId: requestId.current,
        marketingConsent,
        referralSessionId: readReferralSession(),
      };
      const result = await initializeCheckout({ data: payload });
      clear();
      if ("authorizationUrl" in result && result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      window.location.href = result.orderUrl ?? `/order/${result.orderNumber}`;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not send your order. You have not been charged. Please try again or chat with us.",
      );
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit(e.currentTarget, paymentOnline ? "pay" : "request");
  };

  const deliveryLabel = !pricing
    ? "—"
    : pricing.delivery.status === "needs_state"
      ? "Select your state to calculate delivery"
      : pricing.delivery.feeKobo === 0
        ? deliveryReasonLabel(pricing.delivery.reason)
        : formatNaira(pricing.delivery.feeKobo);

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-32 pb-24">
      <div className="text-center mb-12">
        <p className="overline-label mb-3">{paymentOnline ? "Secure Checkout" : "Order Request"}</p>
        <h1 className="font-editorial text-4xl sm:text-5xl">Almost Yours</h1>
      </div>

      <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr]">
        {/* Form */}
        <form onSubmit={handleSubmit} id="checkout-form">
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
                onBlur={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
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
                onBlur={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="state" className="input-lux-label">Delivery State</label>
              <select
                id="state"
                name="state"
                required
                value={deliveryState}
                onChange={(e) => setDeliveryState(e.target.value)}
                className="input-lux"
              >
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

          {/* Deposit option — only when online payment and eligibility exist */}
          {canDeposit && (
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
                  <span className="block text-xs text-stone mt-0.5">One payment — nothing more to pay.</span>
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
                    {depositTerms.balanceDueDays > 0
                      ? `Balance within ${depositTerms.balanceDueDays} days`
                      : "Balance before dispatch"}
                  </span>
                </button>
              </div>
              <p className="mt-3 text-xs text-stone leading-relaxed">
                {depositTerms.termsText ||
                  "Deposit orders enter production once the deposit clears. The balance must be fully paid before your piece is dispatched."}
              </p>
            </div>
          )}

          {/* Marketing consent — explicit, stored with the order */}
          <label className="mt-6 flex items-start gap-2.5 text-xs text-stone leading-relaxed">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4"
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

          {!paymentOnline && preview && (
            <div className="mt-8 border border-gold/50 bg-gold/5 px-5 py-4 text-sm leading-relaxed" role="note">
              <p className="font-medium">
                {pricing?.hasQuoteLines ? "Your cart includes a custom design to be quoted" : "Online payment isn't connected yet"}
              </p>
              <p className="text-stone mt-1">
                Send your order request and nothing is charged. You get an order
                reference straight away; the DREAMZ team confirms details and
                sends you a secure payment link. We never ask for card details here.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !pricing || pricing.total === null}
            className="btn-lux btn-lux-primary w-full mt-8"
          >
            {submitting
              ? paymentOnline
                ? "Connecting to Paystack…"
                : "Sending your request…"
              : !pricing || pricing.total === null
                ? "Select your state to continue"
                : paymentOnline
                  ? payDeposit && canDeposit
                    ? `Pay ${depositTerms.percent}% Deposit with Paystack`
                    : "Pay with Paystack"
                  : "Send Order Request"}
          </button>
          {paymentOnline && pricing?.total != null && (
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => {
                const form = (e.currentTarget as HTMLButtonElement).form;
                if (form?.reportValidity()) void submit(form, "request");
              }}
              className="w-full mt-3 text-xs uppercase tracking-btn text-stone underline hover:text-ink py-2"
            >
              Or send an order request and pay later
            </button>
          )}
          {paymentOnline && bnplAvailable && (
            <p className="mt-3 text-center text-xs text-stone">
              Pay in Installments — a Buy Now, Pay Later option handled by our
              payment partner and subject to approval, is available during
              payment.
            </p>
          )}
          {paymentOnline && (
            <p className="mt-4 text-center text-xs text-stone">
              Card, bank transfer and USSD are handled by Paystack — card
              details never touch our servers.
            </p>
          )}
        </form>

        {/* Summary — every figure comes from the server */}
        <aside className="lg:border-l lg:border-ink/10 lg:pl-12" aria-live="polite">
          <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-6">
            Order Summary {previewBusy && <span className="normal-case tracking-normal">· updating…</span>}
          </h2>
          <ul className="divide-y divide-ink/10">
            {items.map((item, idx) => {
              const line = pricing?.lines[idx];
              return (
                <li key={item.id} className="py-4 flex justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.variantLabel && <p className="text-xs text-stone mt-0.5">{item.variantLabel}</p>}
                    <p className="text-xs text-stone mt-0.5 uppercase tracking-wide">
                      {item.purchaseOption === "complete_package" ? "Complete Package" : "Product Only"}
                    </p>
                    {item.designId && (
                      <p className="text-xs text-gold mt-0.5">Custom design {item.designId}</p>
                    )}
                    <p className="text-xs text-stone mt-1">
                      Qty {item.quantity}
                      {line && line.unitPrice > 0 ? ` × ${formatNaira(line.unitPrice)}` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap">
                    {!line ? "…" : line.quoteRequired ? "Quote to follow" : formatNaira(line.unitPrice * line.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
          {preview && !preview.ok && (
            <p role="alert" className="mt-4 border border-oxblood/40 bg-oxblood/5 text-oxblood text-sm px-4 py-3">
              {preview.error}
            </p>
          )}
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone">Subtotal</dt>
              <dd>{pricing ? formatNaira(pricing.subtotal) : "…"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone">Delivery</dt>
              <dd className="text-right">{deliveryLabel}</dd>
            </div>
            {pricing && pricing.discountKobo > 0 && (
              <div className="flex justify-between text-forest">
                <dt>Voucher ({pricing.voucherCode})</dt>
                <dd>−{formatNaira(pricing.discountKobo)}</dd>
              </div>
            )}
            {pricing && pricing.selfPurchaseBenefitKobo > 0 && (
              <div className="flex justify-between text-forest">
                <dt>Creator purchase benefit</dt>
                <dd>−{formatNaira(pricing.selfPurchaseBenefitKobo)}</dd>
              </div>
            )}
            {pricing?.partner && (
              <div className="border border-ink/10 px-3 py-2 text-xs">
                <p>
                  <span className="text-forest">✓ Creator code {pricing.partner.code}</span>
                  {pricing.partner.source === "referral_link" && " (from your creator link)"}
                </p>
                <p className="text-stone mt-0.5">{OUTCOME_COPY[pricing.partner.outcome]}</p>
              </div>
            )}
            <div className="flex justify-between border-t border-ink/10 pt-3 mt-3">
              <dt className="uppercase tracking-btn text-xs self-center">
                {pricing?.hasQuoteLines ? "Total before quote" : "Total"}
              </dt>
              <dd className="font-editorial text-2xl">
                {pricing && pricing.total !== null ? formatNaira(pricing.total) : "—"}
              </dd>
            </div>
          </dl>

          {/* Voucher + creator code — both validated server-side */}
          <div className="mt-6 border-t border-ink/10 pt-5 space-y-4">
            <CodeField
              label="Voucher code"
              value={voucherInput}
              applied={pricing?.voucherCode ?? (voucherCode || null)}
              onChange={(v) => setVoucherInput(v)}
              onApply={() => {
                setVoucherError(null);
                setVoucherCode(voucherInput.trim());
              }}
              onRemove={() => {
                setVoucherCode("");
                setVoucherInput("");
              }}
              error={voucherError}
            />
            <CodeField
              label="Creator or partner code"
              value={partnerInput}
              applied={pricing?.partner && pricing.partner.source === "checkout_code" ? pricing.partner.code : null}
              onChange={(v) => setPartnerInput(v)}
              onApply={() => setPartnerCode(partnerInput.trim())}
              onRemove={() => {
                setPartnerCode("");
                setPartnerInput("");
              }}
              error={partnerCode ? pricing?.partnerCodeError ?? null : null}
            />
            <p className="text-[0.66rem] text-stone">
              Codes are not case-sensitive. A code typed here takes precedence
              over a creator link you followed earlier.
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

function toLines(items: ReturnType<typeof useCart.getState>["items"]) {
  return items.map((i) => ({
    productId: i.productId,
    variantLabel: i.variantLabel,
    purchaseOption: i.purchaseOption,
    customization: i.designId ? null : i.customization,
    designId: i.designId ?? null,
    quantity: i.quantity,
  }));
}

function CodeField(props: {
  label: string;
  value: string;
  applied: string | null;
  onChange: (v: string) => void;
  onApply: () => void;
  onRemove: () => void;
  error: string | null;
}) {
  const id = props.label.toLowerCase().replace(/\W+/g, "-");
  if (props.applied) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <p>
          <span className="text-stone">{props.label}: </span>
          <span className="text-forest">✓ {props.applied}</span>
        </p>
        <button type="button" onClick={props.onRemove} className="text-xs underline text-stone py-2">
          Remove
        </button>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="input-lux-label">{props.label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          className="input-lux flex-1 uppercase tracking-[0.15em]"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (props.value.trim().length >= 3) props.onApply();
            }
          }}
          maxLength={40}
        />
        <button
          type="button"
          onClick={props.onApply}
          className="btn-lux btn-lux-outline !py-2.5 !px-5 whitespace-nowrap"
          disabled={props.value.trim().length < 3}
        >
          Apply
        </button>
      </div>
      {props.error && <p className="text-xs text-brand-red mt-2" role="alert">{props.error}</p>}
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
