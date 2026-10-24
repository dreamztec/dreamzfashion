import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { adminListWaitlist, adminRemoveWaitlistEntry, adminExportWaitlistCsv } from "@/server/waitlist.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/waitlist")({
  component: AdminWaitlist,
});

type WaitlistRow = Awaited<ReturnType<typeof adminListWaitlist>>[number];

function AdminWaitlist() {
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await adminCall(adminListWaitlist));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load waitlist.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const downloadCsv = async () => {
    try {
      const { csv } = await adminCall(adminExportWaitlistCsv);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dreamz-waitlist.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
        <h1 className="font-editorial text-3xl">Waitlist</h1>
        <button onClick={downloadCsv} className="btn-lux btn-lux-outline !py-2.5 !px-5 text-xs">
          Export CSV
        </button>
      </div>
      <p className="text-sm text-stone mb-8">
        Anniversary early-access registrations (free). Counted separately from
        sales — these are leads with explicit marketing consent where marked.
      </p>
      {error && <p className="mb-6 text-sm text-oxblood">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-stone border border-ink/10 px-5 py-10 text-center">
          No waitlist registrations yet.
        </p>
      ) : (
        <div className="overflow-x-auto border border-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink/[0.03] text-left text-[0.65rem] uppercase tracking-btn text-stone">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Interest</th>
                <th className="px-4 py-3">Consent</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {rows.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3">{w.email}</td>
                  <td className="px-4 py-3">{w.name || "—"}</td>
                  <td className="px-4 py-3 text-stone">{w.interest || "—"}</td>
                  <td className="px-4 py-3">{w.marketingConsent ? "yes" : "no"}</td>
                  <td className="px-4 py-3 text-xs text-stone">
                    {w.createdAt ? new Date(w.createdAt).toLocaleDateString("en-NG") : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        await adminCall(adminRemoveWaitlistEntry, { id: w.id });
                        await load();
                      }}
                      className="text-xs uppercase tracking-btn text-oxblood hover:underline"
                    >
                      Remove
                    </button>
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
