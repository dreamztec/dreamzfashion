import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { adminListCampaigns, adminSaveCampaign } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/campaigns")({
  component: AdminCampaigns,
});

interface CampaignRow {
  id: number;
  name: string;
  description: string;
  audience: string;
  tasks: Array<{ key: string; label: string; type: string; target: number }>;
  reward: { type: string; label: string; value: number } | null;
  status: string;
}

const TASK_TYPES = [
  "account_created",
  "profile_completed",
  "referral_generated",
  "referral_signup",
  "verified_purchase",
  "purchase_count",
  "sales_value",
  "voucher_claim",
  "campaign_action",
];

function AdminCampaigns() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id?: number;
    name: string;
    description: string;
    audience: string;
    status: string;
    tasks: Array<{ key: string; label: string; type: string; target: number }>;
    rewardType: string;
    rewardLabel: string;
    rewardValue: number;
  } | null>(null);

  async function load() {
    try {
      const res = await adminCall(adminListCampaigns);
      setRows(res as CampaignRow[]);
    } catch {
      setMsg("Could not load campaigns.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      await adminCall(adminSaveCampaign, {
        id: editing.id,
        name: editing.name,
        description: editing.description,
        audience: editing.audience,
        status: editing.status,
        tasks: editing.tasks,
        reward: {
          type: editing.rewardType,
          label: editing.rewardLabel,
          value: editing.rewardValue,
        },
      });
      setMsg("Campaign saved.");
      setEditing(null);
      void load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-2">Reward Campaigns</h1>
      <p className="text-xs text-stone mb-8">
        Campaigns define the tasks customers see under Tasks & Progress and the
        reward granted on completion. Progress is tracked server-side.
      </p>
      {msg && <p className="text-sm mb-6">{msg}</p>}

      <button
        onClick={() =>
          setEditing({
            name: "",
            description: "",
            audience: "all",
            status: "draft",
            tasks: [
              { key: "account_created", label: "Create account", type: "account_created", target: 1 },
              { key: "referral_generated", label: "Generate referral link", type: "referral_generated", target: 1 },
            ],
            rewardType: "points",
            rewardLabel: "",
            rewardValue: 0,
          })
        }
        className="btn-lux btn-lux-outline mb-8"
      >
        New Campaign
      </button>

      {editing && (
        <form onSubmit={save} className="border border-gold/50 px-5 py-6 grid gap-4 sm:grid-cols-2 mb-10">
          <div>
            <label className="input-lux-label">Campaign name</label>
            <input className="input-lux" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required minLength={2} maxLength={120} />
          </div>
          <div>
            <label className="input-lux-label">Audience</label>
            <select className="input-lux" value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })}>
              <option value="all">All customers</option>
              <option value="student">Student ambassadors</option>
              <option value="public">Public referrers</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label">Description</label>
            <input className="input-lux" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={600} />
          </div>

          <div className="sm:col-span-2">
            <p className="overline-label mb-3">Tasks</p>
            <div className="space-y-3">
              {editing.tasks.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_1.4fr_auto_auto] gap-2 items-center">
                  <input
                    className="input-lux !py-2 font-mono text-xs"
                    value={t.key}
                    onChange={(e) => setEditing({ ...editing, tasks: editing.tasks.map((x, j) => (j === i ? { ...x, key: e.target.value.replace(/[^a-z0-9_]/gi, "_").toLowerCase() } : x)) })}
                    aria-label="Task key"
                  />
                  <input
                    className="input-lux !py-2"
                    value={t.label}
                    onChange={(e) => setEditing({ ...editing, tasks: editing.tasks.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                    aria-label="Task label"
                    placeholder="Customer-facing label"
                  />
                  <select
                    className="input-lux !py-2"
                    value={t.type}
                    onChange={(e) => setEditing({ ...editing, tasks: editing.tasks.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })}
                    aria-label="Task type"
                  >
                    {TASK_TYPES.map((tt) => <option key={tt} value={tt}>{tt}</option>)}
                  </select>
                  <input
                    className="input-lux !py-2 w-16"
                    inputMode="numeric"
                    value={t.target}
                    onChange={(e) => setEditing({ ...editing, tasks: editing.tasks.map((x, j) => (j === i ? { ...x, target: Math.max(1, Number(e.target.value || 1)) } : x)) })}
                    aria-label="Target"
                  />
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, tasks: editing.tasks.filter((_, j) => j !== i) })}
                    className="text-xs underline text-stone"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setEditing({
                  ...editing,
                  tasks: [...editing.tasks, { key: "", label: "", type: "campaign_action", target: 1 }],
                })
              }
              className="mt-3 text-xs uppercase tracking-btn underline"
            >
              + Add task
            </button>
          </div>

          <div>
            <label className="input-lux-label">Reward type</label>
            <select className="input-lux" value={editing.rewardType} onChange={(e) => setEditing({ ...editing, rewardType: e.target.value })}>
              <option value="points">DREAMZ Points</option>
              <option value="credit">Shopping credit</option>
              <option value="voucher">Voucher</option>
            </select>
          </div>
          <div>
            <label className="input-lux-label">Reward label (customer-facing)</label>
            <input className="input-lux" value={editing.rewardLabel} onChange={(e) => setEditing({ ...editing, rewardLabel: e.target.value })} maxLength={120} placeholder="e.g. 500 DREAMZ Points" />
          </div>
          <div>
            <label className="input-lux-label">Status</label>
            <select className="input-lux" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-3 mt-2">
            <button type="submit" className="btn-lux btn-lux-primary">Save Campaign</button>
            <button type="button" onClick={() => setEditing(null)} className="btn-lux btn-lux-outline">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((c) => (
          <div key={c.id} className="border border-ink/10 px-5 py-5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-editorial text-lg">{c.name}</p>
              <span className={`text-[0.6rem] uppercase tracking-btn px-2 py-1 ${
                c.status === "active" ? "bg-forest/10 text-forest" : "bg-ink/5 text-stone"
              }`}>
                {c.status}
              </span>
            </div>
            <p className="text-xs text-stone mb-3">
              {(c.tasks ?? []).length} tasks · reward: {c.reward?.label ?? "—"} · {c.audience}
            </p>
            <button
              onClick={() =>
                setEditing({
                  id: c.id,
                  name: c.name,
                  description: c.description,
                  audience: c.audience,
                  status: c.status,
                  tasks: (c.tasks ?? []).map((t) => ({ ...t })),
                  rewardType: c.reward?.type ?? "points",
                  rewardLabel: c.reward?.label ?? "",
                  rewardValue: c.reward?.value ?? 0,
                })
              }
              className="text-xs uppercase tracking-btn underline"
            >
              Edit
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-stone">No campaigns yet.</p>}
      </div>
    </div>
  );
}
