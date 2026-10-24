import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyRewards, connectMyRewards } from "@/server/account.functions";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/account/rewards")({
  component: MyRewards,
});

interface RewardsData {
  account: {
    pointsAvailable: number;
    pointsPending: number;
    pointsLifetime: number;
    creditKobo: number;
    creditPendingKobo: number;
  };
  cfg: { enabled: boolean; note: string };
  entries: Array<{
    id: number;
    currency: string;
    type: string;
    amount: number;
    status: string;
    source: string;
    orderNumber: string | null;
    campaign: string | null;
    note: string | null;
    createdAt: string | null;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  earned_purchase: "Purchase reward",
  earned_referral: "Referral reward",
  earned_task: "Campaign task",
  redeemed: "Redeemed",
  voucher_claimed: "Voucher claimed",
  adjustment: "Adjustment",
  expired: "Expired",
};

function MyRewards() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [connectState, setConnectState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [identity, setIdentity] = useState("");

  useEffect(() => {
    let cancelled = false;
    getMyRewards()
      .then((res) => {
        if (cancelled) return;
        if ("unauthenticated" in res) setFailed(true);
        else setData(res);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) return <p className="text-stone">Please sign in to view your rewards.</p>;
  if (!data) return <div className="skeleton h-48 w-full" />;

  async function onConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnectState("busy");
    setConnectMsg(null);
    try {
      const res = await connectMyRewards({ data: { identity } });
      if (res.ok) {
        setConnectState("done");
      } else {
        setConnectState("error");
        setConnectMsg(res.reason ?? "We couldn't connect to DREAMZ Rewards right now. Your account has not been changed. Please try again.");
      }
    } catch {
      setConnectState("error");
      setConnectMsg("We couldn't connect to DREAMZ Rewards right now. Your account has not been changed. Please try again.");
    }
  }

  return (
    <div>
      <h1 className="font-editorial text-3xl mb-2">DREAMZ Rewards</h1>
      <p className="text-xs text-stone mb-8">Every balance below is calculated from the DREAMZ reward ledger — never estimated.</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="border border-ink/10 px-4 py-4">
          <p className="overline-label text-[0.58rem] mb-1">Available Points</p>
          <p className="font-editorial text-2xl">{data.account.pointsAvailable.toLocaleString("en-NG")}</p>
        </div>
        <div className="border border-ink/10 px-4 py-4">
          <p className="overline-label text-[0.58rem] mb-1">Pending Points</p>
          <p className="font-editorial text-2xl">{data.account.pointsPending.toLocaleString("en-NG")}</p>
        </div>
        <div className="border border-ink/10 px-4 py-4">
          <p className="overline-label text-[0.58rem] mb-1">Lifetime Points</p>
          <p className="font-editorial text-2xl">{data.account.pointsLifetime.toLocaleString("en-NG")}</p>
        </div>
      </div>

      <div className="border border-ink/10 px-5 py-5 mb-8">
        <p className="overline-label mb-2">Available Reward Balance</p>
        <p className="font-editorial text-3xl mb-1">{formatNaira(data.account.creditKobo)}</p>
        {data.account.creditPendingKobo > 0 && (
          <p className="text-xs text-stone">{formatNaira(data.account.creditPendingKobo)} pending</p>
        )}
        {data.cfg.note && <p className="text-xs text-stone mt-3 leading-relaxed">{data.cfg.note}</p>}
      </div>

      {/* External linking — pending the official TisasNG specification */}
      <div className="border border-ink/10 px-5 py-6 mb-10">
        <h2 className="font-editorial text-xl mb-2">External Rewards (TisasNG)</h2>
        <p className="text-sm text-stone leading-relaxed mb-4">
          Linking an external TisasNG rewards identity is being prepared. The
          DREAMZ ledger above keeps working regardless — nothing about your
          points changes.
        </p>
        {connectState === "done" ? (
          <p className="text-sm text-forest">Your rewards identity is connected.</p>
        ) : (
          <form onSubmit={onConnect} className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              className="input-lux flex-1"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="Your rewards ID / phone"
              aria-label="Rewards identity"
              required
              minLength={3}
              maxLength={120}
            />
            <button type="submit" className="btn-lux btn-lux-outline !py-2.5 !px-6" disabled={connectState === "busy"}>
              {connectState === "busy" ? "Connecting…" : "Connect"}
            </button>
          </form>
        )}
        {connectMsg && <p className="text-xs text-stone mt-3 leading-relaxed">{connectMsg}</p>}
      </div>

      {/* Ledger */}
      <h2 className="font-editorial text-2xl mb-4">My Reward Ledger</h2>
      {data.entries.length === 0 ? (
        <p className="text-stone text-sm mb-4">
          No reward activity yet. Verified orders, referrals and campaigns will
          appear here.
        </p>
      ) : (
        <div className="border border-ink/10 divide-y divide-ink/5">
          {data.entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm">{TYPE_LABELS[e.type] ?? e.type}</p>
                <p className="text-[0.66rem] text-stone truncate">
                  {e.orderNumber ? `${e.orderNumber} · ` : ""}
                  {e.campaign ? `${e.campaign} · ` : ""}
                  {e.createdAt ? new Date(e.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  {e.status !== "approved" ? ` · ${e.status}` : ""}
                </p>
              </div>
              <p className={`font-editorial text-lg whitespace-nowrap ${e.amount >= 0 ? "text-forest" : "text-brand-red"}`}>
                {e.currency === "points" ? "" : "₦"}
                {e.amount >= 0 ? "+" : ""}
                {e.amount.toLocaleString("en-NG")}
                {e.currency === "points" ? " pts" : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10">
        <Link to="/account/vouchers" className="nav-link text-[0.7rem] uppercase tracking-btn">
          My Vouchers →
        </Link>
      </div>
    </div>
  );
}
