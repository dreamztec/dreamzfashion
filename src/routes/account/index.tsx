import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyOverview } from "@/server/account.functions";
import { formatNaira } from "@/lib/format";
import { useAuth } from "@/lib/auth-client";

export const Route = createFileRoute("/account/")({
  component: AccountOverview,
});

interface Overview {
  customer: {
    fullName: string;
    email: string;
    referralCode: string;
    isStudentAmbassador: boolean;
  };
  points: { available: number; pending: number; lifetime: number; enabled: boolean; note: string };
  creditKobo: { available: number; pending: number };
  orders: { count: number };
  referrals: {
    hasReferrerRow: boolean;
    status: string | null;
    code: string;
    track: string | null;
    availableKobo: number;
    pendingKobo: number;
    approvedKobo: number;
    count: number;
  };
  vouchers: { availableCount: number; list: Array<{ id: number; code: string; value: number; type: string; status: string }> };
  nextReward: { campaign: string; taskLabel: string; progress: number; target: number; reward: string | null } | null;
}

function AccountOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unauthenticated" | "error">("loading");
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    getMyOverview()
      .then((res) => {
        if (cancelled) return;
        if ("unauthenticated" in res) setState("unauthenticated");
        else {
          setOverview(res as unknown as Overview);
          setState("ok");
        }
        // If the visitor arrived through a referral link before signup,
        // bind that attribution to this account (server-side, one time).
        try {
          const stored = localStorage.getItem("dfk-ref");
          if (stored) {
            const parsed = JSON.parse(stored) as { sessionId?: string };
            if (parsed.sessionId) {
              void import("@/server/referral.functions").then(({ bindReferralRegistration }) =>
                bindReferralRegistration({ data: { sessionId: parsed.sessionId as string } }),
              );
              localStorage.removeItem("dfk-ref");
            }
          }
        } catch {
          /* best-effort */
        }
      })
      .catch(() => setState("error"));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (state === "loading") {
    return <div className="skeleton h-64 w-full" />;
  }
  if (state !== "ok" || !overview) {
    return (
      <p className="text-stone">
        We couldn't load your dashboard right now. Please refresh and try again.
      </p>
    );
  }

  const firstName = overview.customer.fullName.split(" ")[0] || overview.customer.email.split("@")[0];
  const cards: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: "Available Rewards",
      value: formatNaira(overview.creditKobo.available),
      sub: overview.creditKobo.pending > 0 ? `${formatNaira(overview.creditKobo.pending)} pending` : undefined,
    },
    {
      label: "DREAMZ Points",
      value: overview.points.available.toLocaleString("en-NG"),
      sub: overview.points.pending > 0 ? `${overview.points.pending.toLocaleString("en-NG")} pending` : undefined,
    },
    {
      label: "Referral Earnings",
      value: formatNaira(overview.referrals.availableKobo),
      sub: overview.referrals.pendingKobo > 0 ? `${formatNaira(overview.referrals.pendingKobo)} awaiting the qualifying purchase or approval` : undefined,
    },
    { label: "Available Vouchers", value: String(overview.vouchers.availableCount) },
    { label: "Orders", value: String(overview.orders.count) },
    { label: "Referrals", value: String(overview.referrals.count) },
  ];

  return (
    <div>
      <h1 className="font-editorial text-3xl sm:text-4xl mb-1">
        Welcome back, {firstName}
      </h1>
      <p className="text-stone text-sm mb-8">{overview.customer.email}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="border border-ink/10 px-4 py-5 sm:px-5">
            <p className="overline-label mb-2 text-[0.58rem]">{c.label}</p>
            <p className="font-editorial text-2xl sm:text-3xl">{c.value}</p>
            {c.sub && <p className="text-[0.68rem] text-stone mt-1.5 leading-snug">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Next reward — calculated from configured campaign logic only */}
      {overview.nextReward && (
        <div className="border border-gold/50 px-5 py-6 mb-10">
          <p className="overline-label mb-3">Your Progress — {overview.nextReward.campaign}</p>
          <p className="font-editorial text-xl mb-3">{overview.nextReward.taskLabel}</p>
          <div className="h-1.5 bg-linen mb-2" role="progressbar" aria-valuenow={Math.min(100, Math.round((overview.nextReward.progress / Math.max(1, overview.nextReward.target)) * 100))} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-gold"
              style={{ width: `${Math.min(100, Math.round((overview.nextReward.progress / Math.max(1, overview.nextReward.target)) * 100))}%` }}
            />
          </div>
          <p className="text-xs text-stone">
            {overview.nextReward.progress} of {overview.nextReward.target}
            {overview.nextReward.reward ? ` — reward: ${overview.nextReward.reward}` : ""}
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          <h2 className="font-editorial text-xl mb-3">Quick actions</h2>
          <div className="flex flex-col items-start gap-2">
            <Link to="/account/referrals" className="nav-link text-[0.72rem] uppercase tracking-btn py-1">
              Share your referral link
            </Link>
            <Link to="/voucher" className="nav-link text-[0.72rem] uppercase tracking-btn py-1">
              Enter a voucher code
            </Link>
            <Link to="/royale/request" className="nav-link text-[0.72rem] uppercase tracking-btn py-1">
              Start a Royale design
            </Link>
            <Link to="/track-order" search={{ order: undefined }} className="nav-link text-[0.72rem] uppercase tracking-btn py-1">
              Track an order
            </Link>
          </div>
        </div>
        <div>
          <h2 className="font-editorial text-xl mb-3">DREAMZ Rewards</h2>
          <p className="text-sm text-stone leading-relaxed mb-4">
            Your points and rewards are tracked in the DREAMZ internal ledger —
            available points, pending points and history all come from real
            ledger entries. TisasNG external gifting opens once its official
            specification is supplied.
          </p>
          <Link to="/account/rewards" className="btn-lux btn-lux-outline !py-2.5 !px-6">
            View Reward Ledger
          </Link>
        </div>
      </div>
    </div>
  );
}
