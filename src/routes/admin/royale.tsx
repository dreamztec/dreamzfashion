import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { adminListRoyale, adminUpdateRoyaleStatus } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";

export const Route = createFileRoute("/admin/royale")({
  component: AdminRoyale,
});

interface RoyaleRow {
  id: number;
  requestNumber: string;
  name: string;
  phone: string;
  email: string | null;
  productType: string;
  designDirection: string | null;
  colors: string | null;
  materials: string | null;
  size: string | null;
  monogram: string | null;
  hardware: string | null;
  sole: string | null;
  finishing: string | null;
  occasion: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  deadline: string | null;
  referenceImageUrl: string | null;
  inspirationNotes: string | null;
  status: string;
  createdAt: string | null;
}

const STATUSES = ["new", "contacted", "consultation", "quoted", "won", "archived"];

function AdminRoyale() {
  const [rows, setRows] = useState<RoyaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  async function load() {
    try {
      const res = await adminCall(adminListRoyale);
      setRows(res as RoyaleRow[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: number, status: string) {
    try {
      await adminCall(adminUpdateRoyaleStatus, { id, status });
      void load();
    } catch {
      /* surfaced by reload */
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-8">Royale Requests</h1>
      {loading && <p className="text-sm text-stone">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-sm text-stone">No Royale requests yet.</p>
      )}
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="border border-ink/10 px-5 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="font-editorial text-xl">{r.requestNumber}</p>
                <p className="text-xs text-stone">
                  {r.name} · {r.phone}
                  {r.email ? ` · ${r.email}` : ""} · {r.productType}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[0.62rem] uppercase tracking-btn text-stone">{r.status}</span>
                <select
                  className="input-lux !py-1.5 !px-3 text-xs"
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value)}
                  aria-label="Update status"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="text-xs underline">
                  {openId === r.id ? "Hide" : "Details"}
                </button>
              </div>
            </div>
            {openId === r.id && (
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-xs mt-4 pt-4 border-t border-ink/5">
                <Detail label="Design direction" value={r.designDirection} />
                <Detail label="Occasion" value={r.occasion} />
                <Detail label="Colours" value={r.colors} />
                <Detail label="Materials" value={r.materials} />
                <Detail label="Size" value={r.size} />
                <Detail label="Monogram" value={r.monogram} />
                <Detail label="Hardware" value={r.hardware} />
                <Detail label="Sole" value={r.sole} />
                <Detail label="Finishing" value={r.finishing} />
                <Detail label="Deadline" value={r.deadline} />
                <Detail
                  label="Budget"
                  value={
                    r.budgetMin || r.budgetMax
                      ? `${r.budgetMin ? formatNaira(r.budgetMin) : "no minimum"} — ${r.budgetMax ? formatNaira(r.budgetMax) : "no maximum"}`
                      : null
                  }
                />
                <Detail label="Reference" value={r.referenceImageUrl} />
                <Detail label="Instructions" value={r.inspirationNotes} />
                <Detail label="Submitted" value={r.createdAt ? new Date(r.createdAt).toLocaleString("en-NG") : null} />
              </dl>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="overline-label text-[0.56rem] mb-0.5">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
