import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { adminListPartners, adminUpdatePartner, adminUpdateCommission, adminUpdatePayoutRequest } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";
import { SITE_URL } from "@/lib/config";

export const Route = createFileRoute("/admin/partners")({
  component: AdminPartners,
});

type PartnersData = Awaited<ReturnType<typeof adminListPartners>>;

function AdminPartners() {
  const [data, setData] = useState<PartnersData | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await adminCall(adminListPartners));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load partners.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10">
        <h1 className="font-editorial text-3xl mb-8">Partners</h1>
        <p className="text-sm text-oxblood">{error}</p>
      </div>
    );
  }
  if (!data) {
    return <div className="mx-auto max-w-6xl px-5 py-10"><div className="skeleton h-64" /></div>;
  }

  const pendingCommissions = data.commissions.filter((c) => c.status === "pending");
  const openPayouts = data.payouts.filter((p) => p.status === "requested");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-2">Partners</h1>
      <p className="text-sm text-stone mb-8">
        Referral, creator and trade partner applications, storefronts,
        commissions and payouts. Commissions become payable only after
        fulfilment and the return window; payouts are always reviewed here
        before any transfer.
      </p>

      {/* Applications */}
      <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Applications</h2>
      {data.partners.length === 0 ? (
        <p className="text-sm text-stone border border-ink/10 px-5 py-8 text-center mb-12">
          No partner applications yet.
        </p>
      ) : (
        <ul className="space-y-4 mb-14">
          {data.partners.map((p) => (
            <li key={p.id} className="border border-ink/10 px-5 py-4">
              <div className="flex flex-wrap justify-between gap-4 items-start">
                <div>
                  <p className="font-medium">
                    {p.displayName} <span className="text-xs text-stone">· {p.code} · {p.track}</span>
                  </p>
                  <p className="text-xs text-stone mt-1">
                    {p.email} · {p.phone}
                    {p.school ? ` · ${p.school}` : ""}
                    {p.socialProfile ? ` · ${p.socialProfile}` : ""}
                    {p.agreedTerms ? " · terms accepted" : " · terms NOT accepted"}
                  </p>
                  {p.profile && (
                    <p className="text-xs mt-1">
                      Storefront: {p.profile.storeName ?? "—"} ({p.profile.storefrontStatus})
                      {p.profile.curatedProductIds.length > 0 && ` · ${p.profile.curatedProductIds.length} curated pieces`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <select
                    className="input-lux !py-2 text-xs w-40"
                    value={p.status}
                    onChange={(e) =>
                      adminCall(adminUpdatePartner, { id: p.id, status: e.target.value }).then(load)
                    }
                    aria-label={`Status for ${p.displayName}`}
                  >
                    {["pending", "approved", "rejected", "suspended"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {(p.track === "creator" || p.track === "trade") && (
                    <button
                      onClick={() => setEditing(editing === p.id ? null : p.id)}
                      className="text-xs uppercase tracking-btn hover:text-gold"
                    >
                      {editing === p.id ? "Close" : "Storefront"}
                    </button>
                  )}
                </div>
              </div>
              {editing === p.id && (
                <StorefrontEditor
                  partner={p}
                  onDone={load}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Commissions */}
      <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">
        Commissions ({pendingCommissions.length} pending)
      </h2>
      {data.commissions.length === 0 ? (
        <p className="text-sm text-stone border border-ink/10 px-5 py-8 text-center mb-12">
          No commissions recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10 mb-14">
          {data.commissions.map((c) => (
            <li key={c.id} className="px-5 py-3.5 flex flex-wrap justify-between gap-3 text-sm">
              <div>
                <p>{c.orderNumber ?? "—"}</p>
                <p className="text-xs text-stone">
                  {formatNaira(c.orderTotalKobo)} at {c.rateBps / 100}% · {c.status}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span>{formatNaira(c.amountKobo)}</span>
                <select
                  className="input-lux !py-1.5 text-xs w-28"
                  value={c.status}
                  onChange={(e) =>
                    adminCall(adminUpdateCommission, { id: c.id, status: e.target.value }).then(load)
                  }
                  aria-label={`Commission status for ${c.orderNumber}`}
                >
                  {["pending", "eligible", "paid", "reversed"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Payout requests */}
      <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">
        Payout Requests ({openPayouts.length} open)
      </h2>
      {data.payouts.length === 0 ? (
        <p className="text-sm text-stone border border-ink/10 px-5 py-8 text-center">
          No payout requests.
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 border border-ink/10">
          {data.payouts.map((p) => (
            <li key={p.id} className="px-5 py-4 text-sm">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p>
                    {formatNaira(p.amountKobo)} · {p.status}
                  </p>
                  <p className="text-xs text-stone mt-0.5">
                    Partner #{p.referrerId}
                    {p.destination ? ` · ${p.destination}` : ""}
                    {p.requestedAt ? ` · requested ${new Date(p.requestedAt).toLocaleDateString("en-NG")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    className="input-lux !py-1.5 text-xs w-44"
                    placeholder="Transfer reference"
                    id={`payout-ref-${p.id}`}
                  />
                  {(["approved", "paid", "rejected"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        const el = document.getElementById(`payout-ref-${p.id}`) as HTMLInputElement | null;
                        adminCall(adminUpdatePayoutRequest, {
                          id: p.id,
                          status: s,
                          adminReference: el?.value || "",
                        }).then(load);
                      }}
                      className="border border-ink/20 px-3 py-1.5 text-xs hover:border-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StorefrontEditor({
  partner,
  onDone,
}: {
  partner: PartnersData["partners"][number];
  onDone: () => void;
}) {
  const prof = partner.profile;
  const [storeName, setStoreName] = useState(prof?.storeName ?? "");
  const [storeSlug, setStoreSlug] = useState(prof?.storeSlug ?? "");
  const [curated, setCurated] = useState(
    (prof?.curatedProductIds ?? []).map(String).join(", "),
  );
  const [live, setLive] = useState(prof?.storefrontStatus === "live");
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    try {
      await adminCall(adminUpdatePartner, {
        id: partner.id,
        storefront: {
          storeName,
          storeSlug,
          bio: prof?.bio ?? "",
          curatedProductIds: curated
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0),
          storefrontStatus: live ? "live" : "pending",
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <div className="mt-4 border-t border-ink/10 pt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="input-lux-label">Storefront name</label>
        <input className="input-lux" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      </div>
      <div>
        <label className="input-lux-label">Store slug</label>
        <input className="input-lux" value={storeSlug} onChange={(e) => setStoreSlug(e.target.value)} placeholder="adas-edit" />
        {storeSlug && (
          <p className="mt-1 text-xs text-stone break-all">
            {SITE_URL}/creator/{storeSlug}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className="input-lux-label">Curated product IDs (comma separated)</label>
        <input className="input-lux" value={curated} onChange={(e) => setCurated(e.target.value)} placeholder="1, 4, 12" />
        <p className="mt-1 text-xs text-stone">Product IDs come from the Products page. Curate a small, approved edit.</p>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
        Storefront live
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button onClick={save} className="btn-lux btn-lux-primary !py-2.5 !px-6 text-xs">
          Save Storefront
        </button>
        {error && <p role="alert" className="text-xs text-oxblood">{error}</p>}
      </div>
    </div>
  );
}
