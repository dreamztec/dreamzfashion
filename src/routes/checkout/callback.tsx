import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { verifyPayment, initializeBalancePayment } from "@/server/checkout.functions";
import { useCart } from "@/store/cart";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/checkout/callback")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderNumber: typeof search.orderNumber === "string" ? search.orderNumber : undefined,
    reference: typeof search.reference === "string" ? search.reference : undefined,
    trxref: typeof search.trxref === "string" ? search.trxref : undefined,
  }),
  head: () => ({ meta: [{ title: `Confirming payment — ${BRAND.name}`, name: "robots", content: "noindex" }] }),
  component: PaymentCallback,
});

function PaymentCallback() {
  const { orderNumber, reference, trxref } = Route.useSearch();
  const clearCart = useCart((s) => s.clear);
  const [state, setState] = useState<"verifying" | "success" | "partial" | "failed" | "missing">(
    orderNumber ? "verifying" : "missing",
  );
  const [balanceKobo, setBalanceKobo] = useState(0);
  const [payingBalance, setPayingBalance] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!orderNumber || attempted.current) return;
    attempted.current = true;

    // The cart is cleared only after successful verification
    const run = async () => {
      try {
        const result = await verifyPayment({ data: { orderNumber } });
        if (result.verified) {
          clearCart();
          if ("fullyPaid" in result && result.fullyPaid === false) {
            setBalanceKobo((result as { balanceKobo?: number }).balanceKobo ?? 0);
            setState("partial");
          } else {
            setState("success");
          }
        } else {
          setState("failed");
        }
      } catch {
        setState("failed");
      }
    };
    run();
  }, [orderNumber, clearCart]);

  const recheck = async () => {
    if (!orderNumber) return;
    setRechecking(true);
    try {
      const result = await verifyPayment({ data: { orderNumber } });
      if (result.verified) {
        clearCart();
        if ("fullyPaid" in result && result.fullyPaid === false) {
          setBalanceKobo((result as { balanceKobo?: number }).balanceKobo ?? 0);
          setState("partial");
        } else {
          setState("success");
        }
      }
    } catch {
      // remain in failed state — no raw errors shown
    } finally {
      setRechecking(false);
    }
  };

  const payBalance = async () => {
    if (!orderNumber) return;
    setPayingBalance(true);
    try {
      const res = await initializeBalancePayment({ data: { orderNumber } });
      if (res.fullyPaid) {
        setState("success");
      } else if ("authorizationUrl" in res) {
        window.location.href = res.authorizationUrl;
      }
    } catch {
      setPayingBalance(false);
    }
  };

  const paystackRef = reference || trxref;
  const supportMessage = orderNumber
    ? `Hello ${BRAND.shortName}, I need help with payment for order ${orderNumber}.`
    : `Hello ${BRAND.shortName}, I need help with a payment.`;

  return (
    <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center">
      {state === "verifying" && (
        <>
          <div className="skeleton h-16 w-16 rounded-full mx-auto mb-8" aria-hidden="true" />
          <h1 className="font-editorial text-3xl mb-3">Confirming your payment…</h1>
          <p className="text-stone" role="status">This takes only a moment. Please keep this page open.</p>
        </>
      )}

      {state === "partial" && (
        <>
          <p className="text-forest text-4xl mb-6" aria-hidden="true">✓</p>
          <h1 className="font-editorial text-4xl mb-4">Deposit received</h1>
          <p className="text-stone mb-2">
            Thank you — your deposit has been confirmed and your piece is
            reserved with our workshop.
          </p>
          <p className="text-sm text-ink mb-2">
            Order <strong>{orderNumber}</strong>
          </p>
          <p className="text-sm text-stone mb-8 max-w-md mx-auto">
            Outstanding balance:{" "}
            <strong>{balanceKobo ? `₦${(balanceKobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}` : "see your order"}</strong>
            . The balance must be fully paid before dispatch — you can pay it
            now or any time before then.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={payBalance} disabled={payingBalance} className="btn-lux btn-lux-primary">
              {payingBalance ? "Connecting…" : "Pay Balance Now"}
            </button>
            <WhatsAppCTAButton
              message={`Hello ${BRAND.shortName}, I have paid the deposit for order ${orderNumber}.`}
              whatsappNumber={CONTACT.whatsappNumber}
              label="WhatsApp Support"
            />
          </div>
          <button
            type="button"
            onClick={recheck}
            disabled={rechecking}
            className="mt-8 text-xs uppercase tracking-btn text-stone hover:text-ink underline"
          >
            {rechecking ? "Checking…" : "I have completed my balance payment — check again"}
          </button>
        </>
      )}

      {state === "success" && (
        <>
          <p className="text-forest text-4xl mb-6" aria-hidden="true">✓</p>
          <h1 className="font-editorial text-4xl mb-4">Payment successful</h1>
          <p className="text-stone mb-2">
            Thank you. Your payment has been confirmed and your order is now
            with our workshop.
          </p>
          <p className="text-sm text-ink mb-2">
            Order <strong>{orderNumber}</strong>
          </p>
          <p className="text-sm text-stone mb-8">
            Keep this number — you will use it to track your order. We will
            confirm your size and delivery details next.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/track-order" search={{ order: undefined }} className="btn-lux btn-lux-primary">
              Track Your Order
            </Link>
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-outline">
              Continue Shopping
            </Link>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <WhatsAppCTAButton
              message={`Hello ${BRAND.shortName}, I have just paid for order ${orderNumber}.`}
              whatsappNumber={CONTACT.whatsappNumber}
              label="WhatsApp Support"
            />
            <CallCTA />
          </div>
          <p className="mt-8 text-xs text-stone">
            Questions? Email{" "}
            <a href={`mailto:${CONTACT.email}`} className="underline hover:text-ink">
              {CONTACT.email}
            </a>
          </p>
        </>
      )}

      {state === "failed" && (
        <>
          <p className="text-oxblood text-4xl mb-6" aria-hidden="true">✕</p>
          <h1 className="font-editorial text-3xl mb-4">Payment not completed</h1>
          <p className="text-stone mb-8 max-w-md mx-auto leading-relaxed">
            Your order <strong>{orderNumber}</strong> is saved, but we could not
            confirm the payment. You have not been charged for an incomplete
            payment. You can retry the payment, return to your cart, or chat
            with us and we will sort it out.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/checkout"
              className="btn-lux btn-lux-primary"
            >
              Return to Cart &amp; Retry
            </a>
            <WhatsAppCTAButton
              message={supportMessage}
              whatsappNumber={CONTACT.whatsappNumber}
              label="Contact DREAMZ"
            />
          </div>
          <p className="mt-6 text-sm text-stone">
            Prefer to call?{" "}
            <a href={CONTACT.phoneHref} className="underline hover:text-ink">
              {CONTACT.phoneDisplay}
            </a>
          </p>
          {paystackRef && <p className="mt-6 text-xs text-stone">Reference: {paystackRef}</p>}
          <button
            type="button"
            onClick={recheck}
            disabled={rechecking}
            className="mt-6 text-xs uppercase tracking-btn text-stone hover:text-ink underline"
          >
            {rechecking ? "Checking again…" : "I have completed this payment — check again"}
          </button>
        </>
      )}

      {state === "missing" && (
        <>
          <h1 className="font-editorial text-3xl mb-4">Missing order reference</h1>
          <p className="text-stone mb-8">
            We could not tell which order this confirmation belongs to. If you
            completed a payment, check your order status with your order number.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/track-order" search={{ order: undefined }} className="btn-lux btn-lux-primary">
              Track Your Order
            </Link>
            <WhatsAppCTAButton
              message={`Hello ${BRAND.shortName}, I need help with a payment confirmation.`}
              whatsappNumber={CONTACT.whatsappNumber}
              label="Contact DREAMZ"
            />
          </div>
        </>
      )}
    </div>
  );
}

function CallCTA() {
  return (
    <a href={CONTACT.phoneHref} className="btn-lux btn-lux-outline">
      Call {CONTACT.phoneDisplay}
    </a>
  );
}
