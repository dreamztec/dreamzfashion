import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { submitRoyaleRequest } from "@/server/royale.functions";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/royale/request")({
  head: () => ({
    meta: [
      { title: `Start a Royale Design — ${BRAND.name}` },
      { name: "description", content: "Begin a DREAMZ Royale commission — premium customisation around your vision." },
    ],
  }),
  component: RoyaleRequestForm,
});

const PRODUCT_TYPES = ["Footwear", "Bag", "Belt", "Wallet", "Complete Set", "Something Else"];
const MATERIALS = ["Full-grain leather", "Suede", "Exotic-textured leather", "Woven leather", "Metallic finish", "Advise me"];
const HARDWARE = ["Gold-tone", "Silver-tone", "Gunmetal", "Brass", "No hardware", "Advise me"];

function RoyaleRequestForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [noMax, setNoMax] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await submitRoyaleRequest({
        data: {
          name: String(data.get("name") ?? ""),
          phone: String(data.get("phone") ?? ""),
          email: String(data.get("email") ?? ""),
          productType: String(data.get("productType") ?? ""),
          designDirection: String(data.get("designDirection") ?? ""),
          colors: String(data.get("colors") ?? ""),
          materials: String(data.get("materials") ?? ""),
          size: String(data.get("size") ?? ""),
          monogram: String(data.get("monogram") ?? ""),
          hardware: String(data.get("hardware") ?? ""),
          sole: String(data.get("sole") ?? ""),
          finishing: String(data.get("finishing") ?? ""),
          occasion: String(data.get("occasion") ?? ""),
          budgetMin: noMax || !budgetMin ? null : budgetMin,
          budgetMax: noMax ? null : budgetMax || null,
          deadline: String(data.get("deadline") ?? ""),
          referenceUrl: String(data.get("referenceUrl") ?? ""),
          inspirationNotes: String(data.get("inspirationNotes") ?? ""),
        },
      });
      setReference(res.requestNumber);
      setStatus("done");
      setWhatsappNumber(res.whatsappNumber);
      try {
        void fetch("/api/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "royale_request_submitted", data: { reference: res.requestNumber } }),
          keepalive: true,
        });
      } catch {
        /* analytics never blocks submission */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done" && reference) {
    return (
      <div className="mx-auto max-w-2xl px-5 sm:px-8 pt-40 pb-24 text-center">
        <p className="overline-label mb-4">DREAMZ Royale</p>
        <h1 className="font-editorial text-4xl sm:text-5xl mb-6">Your request is with the atelier</h1>
        <div className="rule-gold mx-auto mb-8" />
        <p className="text-lg mb-2">Request reference</p>
        <p className="font-editorial text-3xl text-brand-red mb-8 tracking-wide">{reference}</p>
        <p className="text-stone leading-relaxed max-w-md mx-auto mb-10">
          Our client team reviews every Royale request personally and will
          reach out to shape the brief with you.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <WhatsAppCTAButton
            message={`Hello DREAMZ, I submitted Royale Request ${reference} and would like to continue my consultation.`}
            whatsappNumber={whatsappNumber}
            label="Continue on WhatsApp"
          />
          <Link to="/" className="btn-lux btn-lux-outline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-32 pb-24">
      <div className="text-center mb-12">
        <p className="overline-label mb-3">DREAMZ Royale</p>
        <h1 className="font-editorial text-4xl sm:text-5xl">Start a Design</h1>
        <p className="text-stone mt-4 max-w-xl mx-auto leading-relaxed">
          Tell us about the piece you imagine. Every field is a starting point —
          our atelier will refine everything with you.
        </p>
        <div className="rule-gold mx-auto mt-6" />
      </div>

      {error && (
        <div className="mb-8 border border-brand-red/40 bg-brand-red/5 px-5 py-4 text-sm" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="r-name" className="input-lux-label">Full name *</label>
          <input id="r-name" name="name" required minLength={2} maxLength={120} className="input-lux" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="r-phone" className="input-lux-label">Phone (WhatsApp) *</label>
          <input id="r-phone" name="phone" required maxLength={20} className="input-lux" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="r-email" className="input-lux-label">Email (optional)</label>
          <input id="r-email" name="email" type="email" className="input-lux" autoComplete="email" />
        </div>
        <div>
          <label htmlFor="r-type" className="input-lux-label">Product type *</label>
          <select id="r-type" name="productType" required className="input-lux">
            {PRODUCT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="r-size" className="input-lux-label">Size (if known)</label>
          <input id="r-size" name="size" maxLength={40} className="input-lux" placeholder="e.g. 43 / One size" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="r-direction" className="input-lux-label">Design direction</label>
          <textarea id="r-direction" name="designDirection" rows={2} maxLength={600} className="input-lux" placeholder="The feeling, the story, the references that inspire the piece" />
        </div>
        <div>
          <label htmlFor="r-colors" className="input-lux-label">Colours</label>
          <input id="r-colors" name="colors" maxLength={200} className="input-lux" placeholder="e.g. Oxblood and gold" />
        </div>
        <div>
          <label htmlFor="r-materials" className="input-lux-label">Materials</label>
          <select id="r-materials" name="materials" className="input-lux">
            <option value="">Advise me</option>
            {MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="r-monogram" className="input-lux-label">Monogram / initials</label>
          <input id="r-monogram" name="monogram" maxLength={30} className="input-lux" placeholder="e.g. A.K." />
        </div>
        <div>
          <label htmlFor="r-hardware" className="input-lux-label">Hardware</label>
          <select id="r-hardware" name="hardware" className="input-lux">
            <option value="">Advise me</option>
            {HARDWARE.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="r-sole" className="input-lux-label">Sole</label>
          <input id="r-sole" name="sole" maxLength={80} className="input-lux" placeholder="e.g. Leather sole, rubber grip" />
        </div>
        <div>
          <label htmlFor="r-finishing" className="input-lux-label">Finishing</label>
          <input id="r-finishing" name="finishing" maxLength={120} className="input-lux" placeholder="e.g. Hand-burnished edges" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="r-occasion" className="input-lux-label">The occasion</label>
          <input id="r-occasion" name="occasion" maxLength={200} className="input-lux" placeholder="e.g. A wedding in December, an anniversary gift" />
        </div>
        <div>
          <label htmlFor="r-budget-min" className="input-lux-label">Budget from (₦)</label>
          <input
            id="r-budget-min"
            inputMode="numeric"
            className="input-lux"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            disabled={noMax}
            placeholder="No minimum"
          />
        </div>
        <div>
          <label htmlFor="r-budget-max" className="input-lux-label">Budget up to (₦)</label>
          <input
            id="r-budget-max"
            inputMode="numeric"
            className="input-lux"
            value={noMax ? "" : budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            disabled={noMax}
            placeholder="No maximum"
          />
          <label className="mt-2 flex items-center gap-2 text-xs uppercase tracking-btn cursor-pointer">
            <input type="checkbox" checked={noMax} onChange={(e) => setNoMax(e.target.checked)} />
            No maximum — the piece leads
          </label>
        </div>
        <div>
          <label htmlFor="r-deadline" className="input-lux-label">Required date</label>
          <input id="r-deadline" name="deadline" maxLength={60} className="input-lux" placeholder="e.g. Before Dec 20" />
        </div>
        <div>
          <label htmlFor="r-reference" className="input-lux-label">Inspiration link (optional)</label>
          <input id="r-reference" name="referenceUrl" type="url" maxLength={400} className="input-lux" placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="r-notes" className="input-lux-label">Special instructions</label>
          <textarea id="r-notes" name="inspirationNotes" rows={3} maxLength={800} className="input-lux" placeholder="Anything else the atelier should know" />
        </div>
        <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 items-center mt-4">
          <button type="submit" className="btn-lux btn-lux-primary w-full sm:w-auto" disabled={status === "sending"}>
            {status === "sending" ? "Submitting…" : "Submit Royale Request"}
          </button>
          <p className="text-xs text-stone">
            We reply personally — usually within one business day.
          </p>
        </div>
      </form>
    </div>
  );
}
