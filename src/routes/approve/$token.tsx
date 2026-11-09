import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getClientApproval, submitClientApproval } from "@/server/designer.functions";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/approve/$token")({
  loader: async ({ params }) => {
    const result = await getClientApproval({ data: params.token });
    if (!result) throw new Error("Approval link not found");
    return result;
  },
  head: () => ({
    meta: [
      { title: `Private Design Approval — ${BRAND.name}` },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ClientApproval,
});

function ClientApproval() {
  const params = Route.useParams();
  const initial = Route.useLoaderData();
  const [status, setStatus] = useState(initial.design.approvalStatus);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const payload = initial.design.payload as Record<string, unknown>;
  const preview = payload.visualPreview && typeof payload.visualPreview === "object"
    ? (payload.visualPreview as Record<string, unknown>)
    : {};
  const summary = typeof payload.designSummary === "string" ? payload.designSummary : "";

  const submit = async (decision: "approved" | "change_requested") => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await submitClientApproval({
        data: { token: params.token, decision, message },
      });
      if (!response.ok) {
        setNotice("This private approval link is no longer available.");
        return;
      }
      setStatus(response.status);
      setMessage("");
      setNotice(
        decision === "approved"
          ? "Approved. The designer can now see your decision."
          : "Change request sent. The designer can now update the concept.",
      );
    } catch {
      setNotice("Your decision could not be recorded just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 sm:px-8 pt-28 pb-20">
      <header className="max-w-2xl mx-auto text-center mb-9">
        <p className="overline-label">Private DREAMZ Review</p>
        <h1 className="font-editorial text-4xl sm:text-5xl mt-3">{initial.design.title}</h1>
        <p className="text-sm text-stone mt-4">
          Shared privately by {initial.designer.displayName}. This page is not listed on the public Dreamer profile.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
        <DesignConceptPreview
          preview={{
            piece: typeof preview.piece === "string" ? preview.piece : initial.design.piece,
            material: typeof preview.material === "string" ? preview.material : null,
            primaryColour: typeof preview.primaryColour === "string" ? preview.primaryColour : null,
            secondaryColour: typeof preview.secondaryColour === "string" ? preview.secondaryColour : null,
            image: typeof preview.image === "string" ? preview.image : null,
            construction:
              preview.construction && typeof preview.construction === "object"
                ? (preview.construction as Record<string, string>)
                : null,
          }}
        />
        <div className="border border-ink/10 p-6 h-fit">
          <p className="text-[0.6rem] uppercase tracking-btn text-gold">Version {initial.design.designVersion}</p>
          <p className="mt-2 text-xs uppercase tracking-btn">
            Status: <strong>{status.replace("_", " ")}</strong>
          </p>
          {summary && <pre className="mt-5 whitespace-pre-wrap font-sans text-sm text-stone leading-relaxed">{summary}</pre>}

          <label className="block mt-6">
            <span className="text-xs uppercase tracking-btn">Optional note</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={1000}
              className="input-lux mt-2 min-h-28"
              placeholder="Tell the designer what you love or what should change."
            />
          </label>

          {notice && <p className="mt-4 border border-gold/40 bg-gold/5 p-3 text-xs">{notice}</p>}

          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <button type="button" disabled={busy} onClick={() => void submit("approved")} className="btn-lux btn-lux-primary">
              Approve This Design
            </button>
            <button type="button" disabled={busy} onClick={() => void submit("change_requested")} className="btn-lux btn-lux-outline">
              Request Changes
            </button>
          </div>

          <p className="mt-5 text-[0.66rem] text-stone leading-relaxed">
            Approval confirms the design direction only. DREAMZ still confirms final leather availability, measurements, construction feasibility, production timeline and price before an order is accepted.
          </p>
        </div>
      </div>
    </div>
  );
}
