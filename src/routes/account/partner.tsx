import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getMyPartnerDashboard,
  requestMyPayout,
  saveMyStorefront,
  submitCreatorDesign,
} from "@/server/partner.functions";
import { formatNaira } from "@/lib/format";
import { SITE_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth-client";

/**
 * Creator / Trade partner dashboard — their own records only: their link,
 * their clicks, their commissions, their payouts. No other partner's data,
 * no customer addresses, no internal costs.
 */
export const Route = createFileRoute("/account/partner")({
  head: () => ({ meta: [{ title: "Partner Dashboard — DREAMZ" }] }),
  component: PartnerDashboard,
});

type Dashboard = NonNullable<
  Extract<Awaited<ReturnType<typeof getMyPartnerDashboard>>, { partner: true }>["data"]
>;

function PartnerDashboard() {
  const { user, loading } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [state, setState] = useState<"loading" | "nopartner" | "ready" | "signedout">("loading");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState("signedout");
      return;
    }
    getMyPartnerDashboard()
      .then((res) => {
        if (res.partner) {
          setData(res.data);
          setState("ready");
        } else {
          setState("nopartner");
        }
      })
      .catch(() => setState("nopartner"));
  }, [user, loading]);

  if (state === "loading") {
    return <div className="mx-auto max-w-2xl px-5 pt-40 pb-32"><div className="skeleton h-40" /></div>;
  }
  if (state === "signedout") {
    return (
      <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center">
        <h1 className="font-editorial text-3xl mb-4">Sign in first</h1>
        <p className="text-stone mb-8">Your partner dashboard lives inside your DREAMZ account.</p>
        <Link to="/account/login" search={{ reset: undefined }} className="btn-lux btn-lux-primary">
          Sign In
        </Link>
      </div>
    );
  }
  if (state === "nopartner" || !data) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-40 pb-32 text-center">
        <h1 className="font-editorial text-3xl mb-4">No partner account yet</h1>
        <p className="text-stone mb-8">
          This dashboard opens after your partner application is approved.
        </p>
        <Link to="/creators" className="btn-lux btn-lux-primary">Apply to become a creator</Link>
      </div>
    );
  }

  const shareLink = `${SITE_URL}/r/${data.code}`;
  const storefrontUrl = data.profile?.storeSlug ? `${SITE_URL}/creator/${data.profile.storeSlug}` : null;

  return (
    <div className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-24">
      <p className="overline-label mb-2">Partner Dashboard</p>
      <h1 className="font-editorial text-4xl mb-2">{data.displayName || data.code}</h1>
      <p className="text-xs uppercase tracking-btn text-stone mb-8">
        {data.track === "creator" ? "Creator Partner" : data.track === "trade" ? "Trade Partner" : "Referral Partner"} ·{" "}
        {data.status === "approved" ? "Approved" : data.status}
      </p>

      {data.status !== "approved" && (
        <p className="border border-gold/40 bg-gold/10 px-5 py-4 text-sm mb-10">
          Your application is under review. Links and earnings activate on
          approval.
        </p>
      )}

      {/* Code + link */}
      <div className="border border-ink/10 px-6 py-6 mb-10">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="input-lux-label">Your creator code</p>
            <div className="flex gap-2 items-stretch">
              <code className="flex-1 bg-ivory-deep px-4 py-3 text-lg tracking-[0.2em] select-all">{data.code}</code>
              <CopyButton text={data.code} label="Copy code" />
            </div>
            <p className="text-xs text-stone mt-2">Not case-sensitive — customers type it at checkout.</p>
          </div>
          <div>
            <p className="input-lux-label">Your shareable link</p>
            <div className="flex gap-2 items-stretch">
              <code className="flex-1 bg-ivory-deep px-4 py-3 text-sm break-all select-all">{shareLink}</code>
              <CopyButton text={shareLink} label="Copy link" />
            </div>
          </div>
        </div>
        {storefrontUrl && (
          <>
            <p className="input-lux-label mt-5">Your storefront</p>
            <a href={storefrontUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline break-all">
              {storefrontUrl}
            </a>
          </>
        )}
      </div>

      {/* Terms in plain words */}
      <div className="border border-gold/40 bg-gold/5 px-6 py-5 mb-10 text-sm leading-relaxed">
        <p>
          <strong>Commission rate:</strong> {data.terms.rateLabel}
          {data.terms.commissionBps > 0 && " of the merchandise value (after discounts, excluding delivery) of each verified, fully paid order placed with your code or link."}
        </p>
        <p className="mt-2 text-stone">
          Unpaid order requests earn nothing. A paid order creates a{" "}
          <em>pending</em> commission; it becomes <em>available</em>{" "}
          {data.terms.returnWindowDays} day{data.terms.returnWindowDays === 1 ? "" : "s"} after
          delivery. Refunds and cancellations reverse it. Buying with your own
          code never earns commission
          {data.terms.selfPurchaseBenefitBps > 0
            ? ` — it gives you a ${(data.terms.selfPurchaseBenefitBps / 100).toFixed(0)}% creator purchase benefit instead.`
            : "."}
          {data.terms.payoutThresholdKobo > 0 && ` Minimum payout: ${formatNaira(data.terms.payoutThresholdKobo)}.`}
          {data.terms.termsNote && ` ${data.terms.termsNote}`}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-12">
        <Stat label="Link clicks" value={String(data.stats.clicks)} />
        <Stat label="Pending" value={formatNaira(data.stats.pendingKobo)} />
        <Stat label="Available" value={formatNaira(data.stats.eligibleKobo)} />
        <Stat label="Paid out" value={formatNaira(data.stats.paidKobo)} />
      </div>
      {data.stats.reversedKobo > 0 && (
        <p className="text-xs text-stone -mt-8 mb-12">Reversed (refunds/cancellations): {formatNaira(data.stats.reversedKobo)}</p>
      )}

      {/* Attributed orders — no customer details */}
      <h2 className="font-editorial text-2xl mb-4">Orders with your code</h2>
      {data.attributedOrders.length === 0 ? (
        <p className="text-sm text-stone mb-12">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10 mb-12">
          {data.attributedOrders.map((o) => (
            <li key={o.orderNumber} className="px-5 py-3.5 flex justify-between items-center text-sm gap-4">
              <div>
                <p>{o.orderNumber}</p>
                <p className="text-xs text-stone">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-NG") : ""} ·{" "}
                  {o.paid ? "Paid" : o.paymentStatus === "requested" ? "Unpaid request — no commission yet" : o.paymentStatus.replace(/_/g, " ")}
                  {o.outcome === "self_purchase" || o.outcome === "self_purchase_benefit" ? " · your own purchase (no commission)" : ""}
                </p>
              </div>
              <span>{formatNaira(o.merchandiseKobo)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Earnings ledger */}
      <h2 className="font-editorial text-2xl mb-4">Commission ledger</h2>
      {data.commissions.length === 0 ? (
        <p className="text-sm text-stone mb-12">
          No commissions yet — your first verified, paid sale will appear here.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10 mb-12">
          {data.commissions.map((c) => (
            <li key={c.id} className="px-5 py-3.5 flex justify-between items-center text-sm">
              <div>
                <p>{c.orderNumber}</p>
                <p className="text-xs text-stone">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-NG") : ""} ·{" "}
                  {c.status === "eligible" ? (c.inPayout ? "in payout request" : "available") : c.status} ·{" "}
                  {(c.rateBps / 100).toFixed(2).replace(/\.00$/, "")}% of {formatNaira(c.basisKobo)}
                </p>
              </div>
              <span className={c.status === "reversed" ? "line-through text-stone" : ""}>{formatNaira(c.amountKobo)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Payouts */}
      <h2 className="font-editorial text-2xl mb-4">Payouts</h2>
      <PayoutRequest eligibleKobo={data.stats.eligibleKobo} threshold={data.terms.payoutThresholdKobo} />
      {data.payouts.length > 0 && (
        <ul className="divide-y divide-ink/10 border border-ink/10 mt-6">
          {data.payouts.map((p) => (
            <li key={p.id} className="px-5 py-3.5 flex justify-between text-sm">
              <span>
                {formatNaira(p.amountKobo)} · {p.status}
                {p.adminReference && <span className="block text-xs text-stone">Ref: {p.adminReference}</span>}
              </span>
              <span className="text-xs text-stone">
                {p.requestedAt ? new Date(p.requestedAt).toLocaleDateString("en-NG") : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Creator tools */}
      {data.track === "creator" && data.status === "approved" && (
        <>
          <h2 className="font-editorial text-2xl mt-14 mb-4">Your storefront</h2>
          <StorefrontEditor
            profile={data.profile}
            onSaved={() => void getMyPartnerDashboard().then((r) => {
              if (r.partner) setData(r.data);
            })}
          />
          <h2 className="font-editorial text-2xl mt-12 mb-4">Submit a design</h2>
          <DesignSubmission
            onSubmitted={() => void getMyPartnerDashboard().then((r) => {
              if (r.partner) setData(r.data);
            })}
          />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-ink/10 px-5 py-5 text-center">
      <p className="font-editorial text-2xl">{value}</p>
      <p className="overline-label mt-1">{label}</p>
    </div>
  );
}

function PayoutRequest({ eligibleKobo, threshold }: { eligibleKobo: number; threshold: number }) {
  const [destination, setDestination] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const below = threshold > 0 && eligibleKobo < threshold;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    setError("");
    try {
      await requestMyPayout({ data: { destination } });
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not request payout.");
    }
  };

  if (state === "done") {
    return <p className="text-sm text-forest">Payout requested — the house will review and confirm.</p>;
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 py-5">
      <p className="text-sm mb-3">
        Eligible now: <strong>{formatNaira(eligibleKobo)}</strong>
        {below && ` — payout threshold is ${formatNaira(threshold)}`}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input-lux flex-1"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Bank name, account number and name"
          required
          minLength={4}
        />
        <button type="submit" disabled={state === "busy" || below || eligibleKobo <= 0} className="btn-lux btn-lux-primary">
          {state === "busy" ? "Requesting…" : "Request Payout"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-oxblood">{error}</p>}
      <p className="mt-3 text-xs text-stone">
        Payouts are reviewed by the house before any transfer — nothing moves
        automatically.
      </p>
    </form>
  );
}

function StorefrontEditor({
  profile,
  onSaved,
}: {
  profile: Dashboard["profile"];
  onSaved: () => void;
}) {
  const [storeName, setStoreName] = useState(profile?.storeName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [instagram, setInstagram] = useState(profile?.instagram ?? "");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    setError("");
    try {
      await saveMyStorefront({ data: { storeName, bio, instagram } });
      setState("done");
      onSaved();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  };

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 py-5 space-y-4">
      <div>
        <label htmlFor="sf-name" className="input-lux-label">Storefront name</label>
        <input id="sf-name" className="input-lux" value={storeName} onChange={(e) => setStoreName(e.target.value)} required minLength={2} />
      </div>
      <div>
        <label htmlFor="sf-bio" className="input-lux-label">Biography</label>
        <textarea id="sf-bio" className="input-lux" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div>
        <label htmlFor="sf-ig" className="input-lux-label">Instagram</label>
        <input id="sf-ig" className="input-lux" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@yourhandle" />
      </div>
      <p className="text-xs text-stone">
        {profile?.storefrontStatus === "live"
          ? "Your storefront is live."
          : "Your storefront goes live once the house approves your presentation."}
      </p>
      {state === "done" && <p className="text-sm text-forest">Saved ✓</p>}
      {error && <p role="alert" className="text-sm text-oxblood">{error}</p>}
      <button type="submit" disabled={state === "busy"} className="btn-lux btn-lux-primary">
        {state === "busy" ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function DesignSubmission({ onSubmitted }: { onSubmitted: () => void }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("busy");
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      await submitCreatorDesign({
        data: {
          productType: String(fd.get("productType") || ""),
          collectionName: String(fd.get("collectionName") || ""),
          description: String(fd.get("description") || ""),
          colors: String(fd.get("colors") || ""),
          materials: String(fd.get("materials") || ""),
          referenceUrl: String(fd.get("referenceUrl") || ""),
        },
      });
      setState("done");
      onSubmitted();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not submit.");
    }
  };

  if (state === "done") {
    return (
      <p className="text-sm text-forest border border-ink/10 px-6 py-5">
        Design submitted — DREAMZ reviews feasibility, cost, price and delivery
        before a collection goes live.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 px-6 py-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="d-type" className="input-lux-label">Product type</label>
          <input id="d-type" name="productType" required className="input-lux" placeholder="e.g. Loafer" />
        </div>
        <div>
          <label htmlFor="d-collection" className="input-lux-label">Collection name</label>
          <input id="d-collection" name="collectionName" required className="input-lux" />
        </div>
      </div>
      <div>
        <label htmlFor="d-desc" className="input-lux-label">The design</label>
        <textarea id="d-desc" name="description" required minLength={10} rows={4} className="input-lux" placeholder="Describe the piece, the story, the occasion…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="d-colors" className="input-lux-label">Colours</label>
          <input id="d-colors" name="colors" className="input-lux" />
        </div>
        <div>
          <label htmlFor="d-materials" className="input-lux-label">Materials</label>
          <input id="d-materials" name="materials" className="input-lux" />
        </div>
      </div>
      <div>
        <label htmlFor="d-ref" className="input-lux-label">Reference link (optional)</label>
        <input id="d-ref" name="referenceUrl" className="input-lux" placeholder="Link to a mood board or sketch" />
      </div>
      {error && <p role="alert" className="text-sm text-oxblood">{error}</p>}
      <button type="submit" disabled={state === "busy"} className="btn-lux btn-lux-primary">
        {state === "busy" ? "Submitting…" : "Submit Design"}
      </button>
      <p className="text-xs text-stone">
        Concepts require production review — a submission is not a quotation or
        a guaranteed design.
      </p>
    </form>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          })
          .catch(() => setCopied(false));
      }}
      className="btn-lux btn-lux-outline !py-2 !px-4 text-xs whitespace-nowrap"
      aria-live="polite"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
