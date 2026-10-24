import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { becomeReferrer, getMyReferrals } from "@/server/account.functions";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/account/referrals")({
  component: MyReferrals,
});

interface ReferralsData {
  referrer: {
    code: string;
    track: string;
    status: string;
    clickCount: number;
  } | null;
  rewards: Array<{
    id: number;
    orderNumber: string | null;
    rewardType: string;
    amountKobo: number;
    amountPoints: number;
    status: string;
    createdAt: string | null;
  }>;
  programs: Array<{ id: number; track: string; name: string; description: string; eligibilityNote: string }>;
}const STATUS_LABELS: Record<string, string> = {
  pending: "Pending approval",
  approved: "Approved",
  paid: "Paid",
  redeemed: "Redeemed",
  rejected: "Not approved",
  reversed: "Reversed",
};

function MyReferrals() {
  const [data, setData] = useState<ReferralsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [track, setTrack] = useState<"public" | "student">("public");
  const [displayName, setDisplayName] = useState("");
  const [school, setSchool] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [joinState, setJoinState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyReferrals()
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

  if (failed) return <p className="text-stone">Please sign in to view your referrals.</p>;
  if (!data) return <div className="skeleton h-48 w-full" />;

  const shareUrl = data.referrer
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${data.referrer.code}`
    : "";

  async function onJoin(e: FormEvent) {
    e.preventDefault();
    setJoinState("busy");
    setJoinError(null);
    try {
      const res = await becomeReferrer({
        data: { track, displayName, school, socialProfile: "", agreedTerms: agreed },
      });
      if (!res.ok) {
        setJoinError(res.error ?? "We couldn't register you right now. Please try again.");
        setJoinState("error");
      } else {
        setJoinState("done");
        const refreshed = await getMyReferrals();
        if (!("unauthenticated" in refreshed)) setData(refreshed);
      }
    } catch {
      setJoinError("We couldn't register you right now. Please try again.");
      setJoinState("error");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!data.referrer) {
    return (
      <div>
        <h1 className="font-editorial text-3xl mb-3">Referrals</h1>
        <p className="text-stone mb-8 max-w-lg leading-relaxed">
          Join a DREAMZ referral programme and share your unique link. Rewards
          are earned only when a referred friend's order is verified — never
          for clicks alone.
        </p>
        <form onSubmit={onJoin} className="max-w-lg grid gap-4 border border-ink/10 px-5 py-6">
          <div>
            <label htmlFor="ref-track" className="input-lux-label">Programme</label>
            <select id="ref-track" className="input-lux" value={track} onChange={(e) => setTrack(e.target.value as "public" | "student")}>
              {(data.programs.length > 0
                ? data.programs.map((p) => ({ value: p.track, label: p.name, note: p.eligibilityNote }))
                : [
                    { value: "public", label: "General Public Referral Programme", note: "" },
                    { value: "student", label: "Student Ambassador Programme", note: "For students — reviewed by the house before activation." },
                  ]
              ).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                  {o.note ? ` — ${o.note}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ref-name" className="input-lux-label">Display name</label>
            <input id="ref-name" className="input-lux" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required minLength={2} maxLength={120} />
          </div>
          {track === "student" && (
            <div>
              <label htmlFor="ref-school" className="input-lux-label">School / institution</label>
              <input id="ref-school" className="input-lux" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={160} />
            </div>
          )}
          <label className="flex items-start gap-2 text-xs text-stone cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>
              I understand rewards are earned only from verified purchases by
              referred customers, that self-referrals and manipulated orders do
              not qualify, and that earnings require review where applicable.
            </span>
          </label>
          {joinError && <p className="text-sm text-brand-red">{joinError}</p>}
          <button type="submit" className="btn-lux btn-lux-primary justify-self-start" disabled={joinState === "busy" || !agreed}>
            {joinState === "busy" ? "Registering…" : track === "student" ? "Apply to Student Program" : "Become a Referrer"}
          </button>
        </form>
      </div>
    );
  }

  const pending = data.rewards.filter((r) => r.status === "pending");
  const approved = data.rewards.filter((r) => r.status === "approved");
  const paid = data.rewards.filter((r) => r.status === "paid" || r.status === "redeemed");

  return (
    <div>
      <h1 className="font-editorial text-3xl mb-1">Referral Earnings</h1>
      <p className="text-xs text-stone mb-8">
        {data.referrer.track === "student" ? "Student Ambassador" : "Public Referrer"} ·{" "}
        {data.referrer.status === "approved" ? "Active" : STATUS_LABELS[data.referrer.status] ?? data.referrer.status}
      </p>

      <div className="border border-gold/50 px-5 py-6 mb-8">
        <p className="overline-label mb-2">Your referral link</p>
        <p className="font-editorial text-xl break-all mb-4">{shareUrl}</p>
        <div className="flex flex-wrap gap-3 items-center">
          <button type="button" onClick={copyLink} className="btn-lux btn-lux-outline !py-2.5 !px-5">
            {copied ? "Copied" : "Copy Link"}
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Discover DREAMZ — ${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-lux btn-lux-outline !py-2.5 !px-5"
          >
            WhatsApp
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-lux btn-lux-outline !py-2.5 !px-5"
          >
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Discover DREAMZ")}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-lux btn-lux-outline !py-2.5 !px-5"
          >
            X
          </a>
        </div>
        <p className="text-xs text-stone mt-3">{data.referrer.clickCount} link visits recorded</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div className="border border-ink/10 px-4 py-4">
          <p className="overline-label text-[0.58rem] mb-1">Pending</p>
          <p className="font-editorial text-xl">{formatNaira(sum(data.rewards, "pending"))}</p>
          <p className="text-[0.62rem] text-stone mt-1">Awaiting the qualifying purchase or review</p>
        </div>
        <div className="border border-ink/10 px-4 py-4">
          <p className="overline-label text-[0.58rem] mb-1">Approved</p>
          <p className="font-editorial text-xl">{formatNaira(sum(data.rewards, "approved"))}</p>
          <p className="text-[0.62rem] text-stone mt-1">Approved — awaiting payout</p>
        </div>
        <div className="border border-ink/10 px-4 py-4">
          <p className="overline-label text-[0.58rem] mb-1">Paid / Redeemed</p>
          <p className="font-editorial text-xl">{formatNaira(sum(data.rewards, "paid"))}</p>
        </div>
        <div className="border border-ink/10 px-4 py-4">
          <p className="overline-label text-[0.58rem] mb-1">Total referrals</p>
          <p className="font-editorial text-xl">{data.rewards.length}</p>
        </div>
      </div>

      {pending.length + approved.length + paid.length === 0 ? (
        <p className="text-sm text-stone">
          Your referral has been recorded and is awaiting the qualifying purchase.
        </p>
      ) : (
        <div className="border border-ink/10 divide-y divide-ink/5">
          {data.rewards.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm">{r.orderNumber ?? "Referral order"}</p>
                <p className="text-[0.66rem] text-stone">
                  {STATUS_LABELS[r.status] ?? r.status} · {r.rewardType}
                </p>
              </div>
              <p className="font-editorial text-lg">
                {r.rewardType === "points" ? `${r.amountPoints.toLocaleString("en-NG")} pts` : formatNaira(r.amountKobo)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function sum(rewards: Array<{ status: string; amountKobo: number; rewardType: string; amountPoints: number }>, status: string): number {
  const filtered = status === "paid" ? rewards.filter((r) => r.status === "paid" || r.status === "redeemed") : rewards.filter((r) => r.status === status);
  return filtered.reduce((s, r) => s + (r.rewardType === "points" ? 0 : r.amountKobo), 0);
}
