import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  adminListReferrals,
  adminSaveReferralProgram,
  adminUpdateReferralReward,
  adminUpdateReferrerStatus,
} from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/admin/referrals")({
  component: AdminReferrals,
});

interface ProgramRow {
  id: number;
  track: string;
  name: string;
  description: string;
  rewardType: string;
  commissionBps: number;
  pointsPerNaira1000: number;
  minOrderKobo: number;
  payoutThresholdKobo: number;
  requiresApproval: boolean;
  eligibilityNote: string;
  active: boolean;
}

interface ReferrerRow {
  id: number;
  code: string;
  track: string;
  status: string;
  displayName: string;
  email: string | null;
  school: string | null;
  createdAt: string | null;
}

interface RewardRow {
  id: number;
  referrerId: number;
  orderNumber: string | null;
  rewardType: string;
  amountKobo: number;
  amountPoints: number;
  status: string;
}

function AdminReferrals() {
  const [data, setData] = useState<{ programs: ProgramRow[]; referrers: ReferrerRow[]; rewards: RewardRow[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProgramRow | null>(null);

  async function load() {
    try {
      const res = await adminCall(adminListReferrals);
      setData(res);
    } catch {
      setMsg("Could not load referral data.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveProgram(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await adminCall(adminSaveReferralProgram, {
        id: editing.id,
        track: editing.track as "student" | "public",
        name: editing.name,
        description: editing.description,
        rewardType: editing.rewardType as "points" | "credit" | "voucher" | "cash",
        commissionBps: editing.commissionBps,
        pointsPerNaira1000: editing.pointsPerNaira1000,
        minOrderKobo: editing.minOrderKobo,
        payoutThresholdKobo: editing.payoutThresholdKobo,
        requiresApproval: editing.requiresApproval,
        eligibilityNote: editing.eligibilityNote,
        active: editing.active,
      });
      setMsg("Programme saved.");
      setEditing(null);
      void load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed.");
    }
  }

  async function setReferrerStatus(id: number, status: string) {
    try {
      await adminCall(adminUpdateReferrerStatus, { id, status });
      void load();
    } catch {
      setMsg("Could not update the referrer.");
    }
  }

  async function setRewardStatus(id: number, status: string) {
    try {
      await adminCall(adminUpdateReferralReward, { id, status });
      void load();
    } catch {
      setMsg("Could not update the reward.");
    }
  }

  if (!data) return <p className="text-sm text-stone py-10">{msg ?? "Loading…"}</p>;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-8">Referrals & Campaigns</h1>
      {msg && <p className="text-sm mb-6">{msg}</p>}

      <section className="mb-12">
        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Referral programmes</h2>
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          {data.programs.map((p) => (
            <div key={p.id} className="border border-ink/10 px-5 py-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-editorial text-lg">{p.name}</p>
                <span className={`text-[0.6rem] uppercase tracking-btn px-2 py-1 ${p.active ? "bg-forest/10 text-forest" : "bg-ink/5 text-stone"}`}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-stone mb-3">
                {p.track} track · {p.rewardType} rewards ·{" "}
                {p.rewardType === "points" ? `${p.pointsPerNaira1000} pts per ₦1,000` : `${(p.commissionBps / 100).toFixed(1)}%`} ·
                approval {p.requiresApproval ? "required" : "not required"}
              </p>
              <button onClick={() => setEditing(p)} className="text-xs uppercase tracking-btn underline">
                Edit
              </button>
            </div>
          ))}
          {data.programs.length === 0 && (
            <button
              onClick={() =>
                setEditing({
                  id: undefined as unknown as number,
                  track: "public",
                  name: "General Public Referral Programme",
                  description: "",
                  rewardType: "points",
                  commissionBps: 0,
                  pointsPerNaira1000: 0,
                  minOrderKobo: 0,
                  payoutThresholdKobo: 0,
                  requiresApproval: true,
                  eligibilityNote: "",
                  active: false,
                })
              }
              className="btn-lux btn-lux-outline"
            >
              Create the first programme
            </button>
          )}
        </div>

        {editing && (
          <form onSubmit={saveProgram} className="border border-gold/50 px-5 py-6 grid gap-4 sm:grid-cols-2 mb-10">
            <div>
              <label className="input-lux-label">Name</label>
              <input className="input-lux" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </div>
            <div>
              <label className="input-lux-label">Track</label>
              <select className="input-lux" value={editing.track} onChange={(e) => setEditing({ ...editing, track: e.target.value })}>
                <option value="public">Public</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div>
              <label className="input-lux-label">Reward type</label>
              <select className="input-lux" value={editing.rewardType} onChange={(e) => setEditing({ ...editing, rewardType: e.target.value })}>
                <option value="points">DREAMZ Points</option>
                <option value="credit">Shopping credit</option>
                <option value="voucher">Voucher</option>
                <option value="cash">Cash commission</option>
              </select>
            </div>
            {editing.rewardType === "points" ? (
              <div>
                <label className="input-lux-label">Points per ₦1,000</label>
                <input className="input-lux" inputMode="numeric" value={editing.pointsPerNaira1000} onChange={(e) => setEditing({ ...editing, pointsPerNaira1000: Number(e.target.value || 0) })} />
              </div>
            ) : (
              <div>
                <label className="input-lux-label">Commission (%)</label>
                <input className="input-lux" inputMode="decimal" value={editing.commissionBps / 100} onChange={(e) => setEditing({ ...editing, commissionBps: Math.round(Number(e.target.value || 0) * 100) })} />
              </div>
            )}
            <div>
              <label className="input-lux-label">Minimum order (₦)</label>
              <input className="input-lux" inputMode="numeric" value={editing.minOrderKobo / 100} onChange={(e) => setEditing({ ...editing, minOrderKobo: Math.round(Number(e.target.value.replace(/[₦,\s]/g, "") || 0) * 100) })} />
            </div>
            <div>
              <label className="input-lux-label">Payout threshold (₦)</label>
              <input className="input-lux" inputMode="numeric" value={editing.payoutThresholdKobo / 100} onChange={(e) => setEditing({ ...editing, payoutThresholdKobo: Math.round(Number(e.target.value.replace(/[₦,\s]/g, "") || 0) * 100) })} />
            </div>
            <div>
              <label className="input-lux-label">Eligibility note</label>
              <input className="input-lux" value={editing.eligibilityNote} onChange={(e) => setEditing({ ...editing, eligibilityNote: e.target.value })} maxLength={300} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={editing.requiresApproval} onChange={(e) => setEditing({ ...editing, requiresApproval: e.target.checked })} />
                Approval required
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="btn-lux btn-lux-primary">Save Programme</button>
              <button type="button" onClick={() => setEditing(null)} className="btn-lux btn-lux-outline">Cancel</button>
            </div>
          </form>
        )}
      </section>

      <section className="mb-12">
        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Referrers & applications</h2>
        <div className="border border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[0.62rem] uppercase tracking-btn text-stone">
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {data.referrers.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    {r.displayName}
                    {r.school && <span className="block text-[0.62rem] text-stone">{r.school}</span>}
                    {r.email && <span className="block text-[0.62rem] text-stone">{r.email}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                  <td className="px-4 py-3">{r.track}</td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3 space-x-3">
                    {r.status !== "approved" && (
                      <button onClick={() => setReferrerStatus(r.id, "approved")} className="text-xs underline text-forest">Approve</button>
                    )}
                    {r.status !== "suspended" && r.status === "approved" && (
                      <button onClick={() => setReferrerStatus(r.id, "suspended")} className="text-xs underline text-brand-red">Suspend</button>
                    )}
                    {r.status === "pending" && (
                      <button onClick={() => setReferrerStatus(r.id, "rejected")} className="text-xs underline text-stone">Reject</button>
                    )}
                  </td>
                </tr>
              ))}
              {data.referrers.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-stone text-center text-xs">No referrer applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[0.7rem] uppercase tracking-luxe text-stone mb-4">Referral rewards</h2>
        <div className="border border-ink/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[0.62rem] uppercase tracking-btn text-stone">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {data.rewards.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.orderNumber}</td>
                  <td className="px-4 py-3">#{r.referrerId}</td>
                  <td className="px-4 py-3">
                    {r.rewardType === "points" ? `${r.amountPoints} pts` : formatNaira(r.amountKobo)}
                  </td>
                  <td className="px-4 py-3">{r.status}</td>
                  <td className="px-4 py-3 space-x-3">
                    {r.status === "pending" && <button onClick={() => setRewardStatus(r.id, "approved")} className="text-xs underline text-forest">Approve</button>}
                    {r.status === "approved" && <button onClick={() => setRewardStatus(r.id, "paid")} className="text-xs underline text-forest">Mark Paid</button>}
                    {r.status === "pending" && <button onClick={() => setRewardStatus(r.id, "rejected")} className="text-xs underline text-brand-red">Reject</button>}
                    {["pending", "approved"].includes(r.status) && <button onClick={() => setRewardStatus(r.id, "reversed")} className="text-xs underline text-stone">Reverse</button>}
                  </td>
                </tr>
              ))}
              {data.rewards.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-stone text-center text-xs">No referral rewards yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
