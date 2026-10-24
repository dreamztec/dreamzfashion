import { Link, createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { claimVoucherCode, validateVoucherCode } from "@/server/voucher.functions";
import { useAuth } from "@/lib/auth-client";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/voucher")({
  head: () => ({
    meta: [
      { title: `Redeem a DREAMZ Voucher — ${BRAND.name}` },
      { name: "description", content: "Enter your printed DREAMZ voucher code to add it to your account or apply it to your order." },
    ],
  }),
  component: VoucherPage,
});

interface ValidVoucher {
  code: string;
  type: string;
  valueLabel: string;
  minimumSpendKobo: number;
  expiresAt: string | null;
  status: string;
}

function VoucherPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [voucher, setVoucher] = useState<ValidVoucher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  async function onValidate(e: FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(null);
    setVoucher(null);
    setClaimed(false);
    setNeedsAuth(false);
    try {
      const res = await validateVoucherCode({ data: { code } });
      if (!res.ok) {
        setError(res.reason ?? "We couldn't validate this voucher.");
      } else {
        setVoucher(res.voucher);
      }
    } catch {
      setError("We couldn't validate this voucher right now. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function onClaim() {
    if (!voucher) return;
    setClaiming(true);
    setError(null);
    try {
      const res = await claimVoucherCode({ data: { code: voucher.code } });
      if (!res.ok) {
        setError(res.reason ?? "This voucher could not be claimed.");
        if ("requireAuth" in res && res.requireAuth) setNeedsAuth(true);
      } else {
        setClaimed(true);
        try {
          void fetch("/api/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "voucher_claimed", data: { code: voucher.code } }),
            keepalive: true,
          });
        } catch {
          /* analytics never blocks claiming */
        }
      }
    } catch {
      setError("We couldn't claim this voucher right now. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-32 pb-24">
      <div className="text-center mb-12">
        <p className="overline-label mb-3">DREAMZ Vouchers</p>
        <h1 className="font-editorial text-4xl sm:text-5xl">Enter Voucher Code</h1>
        <div className="rule-gold mx-auto mt-6" />
        <p className="text-stone mt-6 leading-relaxed">
          The code is printed on your official DREAMZ voucher. Vouchers are
          validated with the house — nothing is redeemed until your order is
          confirmed.
        </p>
      </div>

      <form onSubmit={onValidate} className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          className="input-lux flex-1 uppercase tracking-[0.2em]"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="DREAMZ-XXXX-XXXX"
          aria-label="Voucher code"
          minLength={4}
          maxLength={40}
          required
        />
        <button type="submit" className="btn-lux btn-lux-primary" disabled={checking || code.trim().length < 4}>
          {checking ? "Checking…" : "Validate"}
        </button>
      </form>

      {error && (
        <div className="border border-brand-red/40 bg-brand-red/5 px-5 py-4 text-sm mb-8" role="alert">
          {error}
          {needsAuth && (
            <p className="mt-3">
              <Link to="/account/login" className="nav-link text-[0.7rem] uppercase tracking-btn">
                Sign in or create an account
              </Link>
            </p>
          )}
        </div>
      )}

      {voucher && !claimed && (
        <div className="border border-gold/60 px-6 sm:px-10 py-8 text-center">
          <p className="overline-label mb-4">DREAMZ Voucher</p>
          <p className="font-editorial text-4xl sm:text-5xl mb-2">{voucher.valueLabel}</p>
          <p className="text-xs uppercase tracking-btn text-stone mb-6">Code {voucher.code}</p>
          <dl className="text-sm text-stone space-y-1 mb-8">
            <div>
              <dt className="inline">Status: </dt>
              <dd className="inline uppercase tracking-btn">{voucher.status === "claimed" ? "Available in a wallet" : "Available"}</dd>
            </div>
            {voucher.minimumSpendKobo > 0 && (
              <div>
                <dt className="inline">Minimum spend: </dt>
                <dd className="inline">₦{Math.round(voucher.minimumSpendKobo / 100).toLocaleString("en-NG")}</dd>
              </div>
            )}
            {voucher.expiresAt && (
              <div>
                <dt className="inline">Expiry: </dt>
                <dd className="inline">{new Date(voucher.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button type="button" onClick={onClaim} className="btn-lux btn-lux-primary" disabled={claiming}>
              {claiming ? "Adding…" : "Add to My Account"}
            </button>
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-outline">
              Apply to Cart at Checkout
            </Link>
          </div>
          {!user && (
            <p className="text-xs text-stone mt-4">
              Signing in keeps the voucher safely in your wallet.
            </p>
          )}
        </div>
      )}

      {claimed && (
        <div className="border border-forest/40 bg-forest/5 px-6 py-8 text-center">
          <p className="font-editorial text-3xl mb-3">Voucher added to your wallet</p>
          <p className="text-stone mb-6 text-sm leading-relaxed">
            Find it under My Vouchers in your account. It is not redeemed until
            you use it on an order — and nothing is consumed until payment is
            confirmed.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/account/vouchers" className="btn-lux btn-lux-primary">
              My Vouchers
            </Link>
            <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="btn-lux btn-lux-outline">
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
