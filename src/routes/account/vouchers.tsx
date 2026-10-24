import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyVouchers } from "@/server/account.functions";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/account/vouchers")({
  component: MyVouchers,
});

interface MyVoucher {
  id: number;
  code: string;
  campaign: string | null;
  type: string;
  value: number;
  minimumSpend: number;
  maximumDiscount: number | null;
  status: string;
  expiresAt: string | null;
  claimedAt: string | null;
}

function voucherValueLabel(v: MyVoucher): string {
  return v.type === "percentage" ? `${Math.round(v.value / 100)}% off` : formatNaira(v.value);
}

function MyVouchers() {
  const [vouchers, setVouchers] = useState<MyVoucher[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyVouchers()
      .then((res) => {
        if (cancelled) return;
        if ("unauthenticated" in res) setFailed(true);
        else setVouchers(res.vouchers);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="text-stone">Please sign in to view your vouchers.</p>;
  if (!vouchers) return <div className="skeleton h-48 w-full" />;

  return (
    <div>
      <h1 className="font-editorial text-3xl mb-6">My Vouchers</h1>
      {vouchers.length === 0 ? (
        <div>
          <p className="text-stone mb-8 leading-relaxed">
            No vouchers in your wallet yet. Enter the code printed on a DREAMZ
            voucher to add it here.
          </p>
          <Link to="/voucher" className="btn-lux btn-lux-primary">
            Enter Voucher Code
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {vouchers.map((v) => (
            <div key={v.id} className="border border-ink/10 px-5 py-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-editorial text-2xl">{voucherValueLabel(v)}</p>
                <span className={`text-[0.6rem] uppercase tracking-btn px-2.5 py-1 ${
                  v.status === "available" || v.status === "claimed"
                    ? "bg-forest/10 text-forest"
                    : v.status === "reserved"
                      ? "bg-gold/10 text-gold"
                      : "bg-ink/5 text-stone"
                }`}>
                  {v.status === "reserved" ? "reserved" : v.status}
                </span>
              </div>
              <p className="text-xs uppercase tracking-btn text-stone mb-3">{v.code}</p>
              {v.campaign && <p className="text-xs text-stone mb-1">Campaign: {v.campaign}</p>}
              {v.minimumSpend > 0 && (
                <p className="text-xs text-stone mb-1">Minimum spend {formatNaira(v.minimumSpend)}</p>
              )}
              {v.expiresAt && (
                <p className="text-xs text-stone mb-1">
                  Expires {new Date(v.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              {(v.status === "available" || v.status === "claimed") && (
                <a href="/checkout" className="nav-link text-[0.68rem] uppercase tracking-btn inline-block mt-2">
                  Apply at Checkout →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
