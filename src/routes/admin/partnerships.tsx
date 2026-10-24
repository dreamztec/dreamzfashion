import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  adminListPartnershipEnquiries,
  adminUpdateEnquiryStatus,
} from "@/server/enquiry.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/partnerships")({
  component: AdminPartnerships,
});

type Enquiry = Awaited<ReturnType<typeof adminListPartnershipEnquiries>>[number];

const STATUSES = ["new", "contacted", "approved", "declined"] as const;

function AdminPartnerships() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEnquiries(await adminCall(adminListPartnershipEnquiries));
    } catch {
      setMessage("Could not load enquiries. Is ADMIN_SECRET configured?");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: number, status: string) => {
    await adminCall(adminUpdateEnquiryStatus, { id, status });
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-6">Partnership Enquiries</h1>
      {message && <p className="mb-6 text-sm border border-ink/15 px-4 py-3">{message}</p>}
      {enquiries.length === 0 ? (
        <p className="text-stone text-sm">No partnership enquiries yet.</p>
      ) : (
        <div className="space-y-4">
          {enquiries.map((e) => (
            <div key={e.id} className="border border-ink/10 p-5 bg-white/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{e.businessName}</p>
                  <p className="text-xs text-stone">
                    {e.contactPerson} · {e.city}, {e.stateCountry} · {e.businessType} ·{" "}
                    {e.presence === "both" ? "Store + Online" : e.presence === "store" ? "Existing Store" : "Online"}
                  </p>
                </div>
                <select
                  className="text-xs border border-ink/15 px-2 py-1.5 bg-transparent uppercase tracking-btn"
                  value={e.status}
                  onChange={(ev) => setStatus(e.id, ev.target.value)}
                  aria-label={`Status for ${e.businessName}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <p>Phone: <a className="hover:underline" href={`tel:${e.phone}`}>{e.phone}</a></p>
                <p>Email: <a className="hover:underline" href={`mailto:${e.email}`}>{e.email}</a></p>
                <p>Interest: {e.productInterest}</p>
                <p>Volume: {e.orderVolume}</p>
              </div>
              {e.message && <p className="mt-3 text-sm text-stone">{e.message}</p>}
              <p className="mt-2 text-[0.65rem] text-stone uppercase tracking-btn">
                {e.createdAt ? new Date(e.createdAt).toLocaleString("en-NG") : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
