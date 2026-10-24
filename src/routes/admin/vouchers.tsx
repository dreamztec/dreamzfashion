import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  adminImportVouchers,
  adminListVouchers,
  adminUpdateVoucherStatus,
} from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/admin/vouchers")({
  component: AdminVouchers,
});

interface VoucherRow {
  id: number;
  code: string;
  campaign: string | null;
  type: string;
  value: number;
  minimumSpend: number;
  status: string;
  singleUse: boolean;
  expiresAt: string | null;
  claimedAt: string | null;
  redeemedAt: string | null;
}

function AdminVouchers() {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [csv, setCsv] = useState("");
  const [campaign, setCampaign] = useState("");
  const [type, setType] = useState("fixed");
  const [value, setValue] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [expires, setExpires] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const res = await adminCall(adminListVouchers);
      setRows(res as VoucherRow[]);
    } catch {
      setMsg("Could not load vouchers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onImport(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await adminCall(adminImportVouchers, {
        csv,
        defaults: {
          campaign,
          type,
          value:
            type === "percentage"
              ? Number(value || 0) * 100
              : Math.round(Number(value.replace(/[₦,\s]/g, "") || 0) * 100),
          minimumSpend: Math.round(Number(minSpend.replace(/[₦,\s]/g, "") || 0) * 100),
          expiresAt: expires || null,
          singleUse: true,
        },
      });
      setMsg(`Imported ${res.inserted} voucher(s); ${res.skipped} line(s) skipped (duplicates or invalid).`);
      setCsv("");
      void load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Import failed.");
    }
  }

  async function setStatus(id: number, status: string) {
    try {
      await adminCall(adminUpdateVoucherStatus, { id, status });
      void load();
    } catch {
      setMsg("Could not update the voucher.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-8">Vouchers</h1>

      <section className="border border-ink/10 px-5 py-6 mb-10">
        <h2 className="font-editorial text-xl mb-2">Import printed voucher codes</h2>
        <p className="text-xs text-stone mb-4 leading-relaxed">
          One code per line, or CSV rows: <code>code,campaign,type,value</code> — value in Naira
          for fixed vouchers, whole percent × 100 (e.g. 1000 = 10%) for percentage vouchers.
          Existing codes are never duplicated.
        </p>
        <form onSubmit={onImport} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="input-lux-label">Codes (one per line or CSV)</label>
            <textarea className="input-lux font-mono text-xs" rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} required minLength={3} placeholder={"DREAMZ-A1B2-C3D4\nDREAMZ-E5F6,Launch,fixed,10000"} />
          </div>
          <div>
            <label className="input-lux-label">Campaign (default)</label>
            <input className="input-lux" value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="input-lux-label">Type (default)</label>
            <select className="input-lux" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="fixed">Fixed value credit</option>
              <option value="percentage">Percentage discount</option>
              <option value="product">Product-specific</option>
              <option value="category">Category voucher</option>
              <option value="campaign_reward">Campaign reward</option>
            </select>
          </div>
          <div>
            <label className="input-lux-label">{type === "percentage" ? "Percent (e.g. 10)" : "Value (₦)"}</label>
            <input className="input-lux" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div>
            <label className="input-lux-label">Minimum spend (₦, optional)</label>
            <input className="input-lux" inputMode="numeric" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} />
          </div>
          <div>
            <label className="input-lux-label">Expires (YYYY-MM-DD, optional)</label>
            <input className="input-lux" value={expires} onChange={(e) => setExpires(e.target.value)} placeholder="2027-12-31" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-lux btn-lux-primary">Import Codes</button>
          </div>
        </form>
        {msg && <p className="text-sm mt-4">{msg}</p>}
      </section>

      <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">
        {loading ? "Loading…" : `${rows.length} voucher${rows.length === 1 ? "" : "s"}`}
      </h2>
      {!loading && rows.length > 0 && (
        <div className="border border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[0.62rem] uppercase tracking-btn text-stone">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {rows.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-mono text-xs">{v.code}</td>
                  <td className="px-4 py-3">
                    {v.type === "percentage" ? `${Math.round(v.value / 100)}%` : formatNaira(v.value)}
                    {v.minimumSpend > 0 && <span className="block text-[0.62rem] text-stone">min {formatNaira(v.minimumSpend)}</span>}
                  </td>
                  <td className="px-4 py-3">{v.status}</td>
                  <td className="px-4 py-3 text-xs text-stone">
                    {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("en-NG") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {v.status !== "redeemed" && v.status !== "cancelled" && (
                      <button onClick={() => setStatus(v.id, "cancelled")} className="text-xs underline text-brand-red">
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
