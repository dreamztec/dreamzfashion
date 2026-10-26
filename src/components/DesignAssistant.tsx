import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  designAssistantRecommend,
  designAssistantConcept,
  submitDesignRequest,
  type DesignAssistantInput,
} from "@/server/design-assistant.functions";
import { formatNaira } from "@/lib/format";
import { ProductMedia } from "@/components/brand";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";

/**
 * The client half of the DREAMZ Design Lab.
 * Loaded lazily from /custom — never part of the Shop's critical path.
 * All AI calls go through server functions; no keys ever reach the browser.
 */

const PRODUCT_TYPES: Array<{ key: DesignAssistantInput["productType"]; label: string }> = [
  { key: "shoe", label: "Shoe" },
  { key: "boot", label: "Boot" },
  { key: "loafer", label: "Loafer" },
  { key: "mule", label: "Mule" },
  { key: "slide", label: "Slide" },
  { key: "sandal", label: "Sandal" },
  { key: "bag", label: "Bag" },
  { key: "belt", label: "Belt" },
  { key: "wallet", label: "Wallet" },
  { key: "other", label: "Other" },
];

type Recommendation = Awaited<ReturnType<typeof designAssistantRecommend>>;

function sessionKey(): string {
  let s = sessionStorage.getItem("dfk-design-session");
  if (!s) {
    s = `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    sessionStorage.setItem("dfk-design-session", s);
  }
  return s;
}

type Submitted = { requestNumber: string; aiSummary: string };

export function DesignAssistant() {
  const [productType, setProductType] = useState<DesignAssistantInput["productType"] | null>(null);
  const [form, setForm] = useState({
    audience: "",
    size: "",
    occasion: "",
    style: "",
    primaryColour: "",
    secondaryColour: "",
    material: "",
    sole: "",
    hardware: "",
    personalization: "",
    budgetMin: "",
    budgetMax: "",
    neededBy: "",
    description: "",
  });
  const [referenceName, setReferenceName] = useState<string | null>(null);
  const referenceDataRef = useRef<string | null>(null);
  const resultRef = useRef<Recommendation | null>(null);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conceptBusy, setConceptBusy] = useState(false);
  const [concept, setConcept] = useState<string | null>(null);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sessionId] = useState(sessionKey);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((v) => ({ ...v, [key]: e.target.value }));

  const ask = async () => {
    if (!productType) return;
    setBusy(true);
    setError(null);
    try {
      const res = await designAssistantRecommend({
        data: { ...form, productType, sessionId },
      });
      if (!res.ok) {
        setError(
          res.reason === "cap"
            ? "The design studio is having a busy day — please try again later or message our client team on WhatsApp."
            : "The Design Assistant is temporarily unavailable. You can continue your design request directly with DREAMZ on WhatsApp.",
        );
      } else {
        resultRef.current = res;
        setResult(res);
      }
    } catch {
      setError(
        "The Design Assistant is temporarily unavailable. You can continue your design request directly with DREAMZ on WhatsApp.",
      );
    } finally {
      setBusy(false);
    }
  };

  const makeConcept = async () => {
    if (!result) return;
    setConceptBusy(true);
    setConceptError(null);
    try {
      const brief = `${PRODUCT_TYPES.find((t) => t.key === productType)?.label ?? "Piece"}. ${form.style} ${form.primaryColour} ${form.secondaryColour} ${form.material}. ${form.description}`.trim();
      const res = await designAssistantConcept({
        data: { brief, sessionId },
      });
      if (res.ok) {
        setConcept(`data:${res.mimeType};base64,${res.imageBase64}`);
      } else {
        setConceptError(
          res.reason === "cap"
            ? "The concept studio has reached today's limit — our team can sketch with you directly."
            : "Concept generation is unavailable right now. Everything else remains fully live.",
        );
      }
    } catch {
      setConceptError("Concept generation failed. Everything else remains fully live.");
    } finally {
      setConceptBusy(false);
    }
  };

  const onReferenceFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG or PNG) as your inspiration.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Please choose an inspiration image under 6 MB.");
      return;
    }
    setError(null);
    setReferenceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      referenceDataRef.current = typeof reader.result === "string" ? reader.result : null;
    };
    reader.readAsDataURL(file);
  };

  const sendToDreamz = async () => {
    if (!productType) return;
    setSubmitBusy(true);
    setSubmitError(null);
    try {
      const res = await submitDesignRequest({
        data: {
          sessionId,
          productType,
          ...form,
          referenceImage: referenceDataRef.current,
          aiSummary: resultRef.current?.advice ?? null,
          recommendedProductIds: (resultRef.current?.products ?? []).map((p) => p.id),
        },
      });
      setSubmitted({ requestNumber: res.requestNumber, aiSummary: res.aiSummary ?? "" });
    } catch {
      setSubmitError(
        "Your design request could not be submitted just now — please try again, or continue directly with our team on WhatsApp below.",
      );
    } finally {
      setSubmitBusy(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-forest text-3xl mb-4" aria-hidden="true">✓</p>
        <h3 className="font-editorial text-2xl mb-3">Your design request has been received.</h3>
        <p className="text-sm text-stone mb-1">
          Request <strong>{submitted.requestNumber}</strong> is with our design
          team. We will review it and come back to you with a quote and next
          steps.
        </p>
        <p className="text-xs text-stone mb-6">
          Reference it in any conversation — our team sees the full brief.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <WhatsAppCTAButton
            message={`Hello ${BRAND.shortName}, I have submitted Design Request ${submitted.requestNumber} through the Design Lab and would like to continue the consultation.`}
            label="Continue on WhatsApp"
          />
          <Link to="/royale" className="btn-lux btn-lux-outline">
            Continue into Royale
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Step 1 — what do you want to create? */}
      <p className="input-lux-label">What do you want to create?</p>
      <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Product type">
        {PRODUCT_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setProductType(t.key)}
            aria-pressed={productType === t.key}
            className={`px-4 py-2.5 text-xs uppercase tracking-btn border transition-colors ${
              productType === t.key ? "border-ink bg-ink text-ivory" : "border-ink/25 hover:border-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Step 2 — the brief */}
      {productType && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="input-lux-label">Who is it for? <span className="normal-case tracking-normal text-stone">(optional)</span></p>
            <input className="input-lux" value={form.audience} onChange={set("audience")} placeholder="For me, a gift for my father…" maxLength={120} />
          </div>
          <div>
            <p className="input-lux-label">Size <span className="normal-case tracking-normal text-stone">(footwear — optional here)</span></p>
            <input className="input-lux" value={form.size} onChange={set("size")} placeholder="e.g. 43" maxLength={20} />
          </div>
          <div>
            <p className="input-lux-label">Occasion</p>
            <input className="input-lux" value={form.occasion} onChange={set("occasion")} placeholder="Wedding, board meeting, everyday…" maxLength={120} />
          </div>
          <div>
            <p className="input-lux-label">Preferred style</p>
            <input className="input-lux" value={form.style} onChange={set("style")} placeholder="Bold, minimal, classic…" maxLength={120} />
          </div>
          <div>
            <p className="input-lux-label">Primary colour</p>
            <input className="input-lux" value={form.primaryColour} onChange={set("primaryColour")} placeholder="Brown, black, oxblood…" maxLength={60} />
          </div>
          <div>
            <p className="input-lux-label">Secondary colour</p>
            <input className="input-lux" value={form.secondaryColour} onChange={set("secondaryColour")} placeholder="Optional contrast tone" maxLength={60} />
          </div>
          <div>
            <p className="input-lux-label">Material preference</p>
            <input className="input-lux" value={form.material} onChange={set("material")} placeholder="Full-grain leather, suede…" maxLength={60} />
          </div>
          <div>
            <p className="input-lux-label">Sole preference</p>
            <input className="input-lux" value={form.sole} onChange={set("sole")} placeholder="Leather, rubber, commando…" maxLength={60} />
          </div>
          <div>
            <p className="input-lux-label">Hardware preference</p>
            <input className="input-lux" value={form.hardware} onChange={set("hardware")} placeholder="Gold-tone, brass, matte black…" maxLength={60} />
          </div>
          <div>
            <p className="input-lux-label">Monogram / personalisation</p>
            <input className="input-lux" value={form.personalization} onChange={set("personalization")} placeholder="Initials, a date, a name…" maxLength={200} />
          </div>
          <div>
            <p className="input-lux-label">Budget minimum (₦)</p>
            <input
              className="input-lux"
              inputMode="numeric"
              value={form.budgetMin}
              onChange={set("budgetMin")}
              placeholder="e.g. 50,000"
              maxLength={14}
            />
          </div>
          <div>
            <p className="input-lux-label">Budget maximum (₦) <span className="normal-case tracking-normal text-stone">(optional)</span></p>
            <input
              className="input-lux"
              inputMode="numeric"
              value={form.budgetMax}
              onChange={set("budgetMax")}
              placeholder="No maximum"
              maxLength={14}
            />
          </div>
          <div>
            <p className="input-lux-label">Needed by</p>
            <input className="input-lux" value={form.neededBy} onChange={set("neededBy")} placeholder="e.g. 14 February" maxLength={60} />
          </div>
          <div className="sm:col-span-2">
            <p className="input-lux-label">Tell us about the piece</p>
            <textarea rows={3} className="input-lux" value={form.description} onChange={set("description")} maxLength={1200} placeholder="The story, the details that matter, anything else…" />
          </div>
          <div className="sm:col-span-2">
            <p className="input-lux-label">Inspiration image <span className="normal-case tracking-normal text-stone">(optional)</span></p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onReferenceFile(e.target.files?.[0])}
              className="input-lux !py-2.5 text-sm"
              aria-label="Upload an inspiration image"
            />
            {referenceName && (
              <p className="mt-1 text-xs text-stone">
                Attached: {referenceName}. DREAMZ will create its own final
                craftsmanship interpretation — we never copy protected designs.
              </p>
            )}
          </div>
          <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={ask} disabled={busy} className="btn-lux btn-lux-primary flex-1">
              {busy ? "Consulting the collection…" : "Discover Matching Pieces"}
            </button>
            <WhatsAppCTAButton
              message={`Hello ${BRAND.shortName}, I'm designing a piece (${PRODUCT_TYPES.find((t) => t.key === productType)?.label}). ${form.description || form.style || ""}`}
              label="Talk to a Designer"
              className="flex-1"
            />
          </div>
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>}

      {/* Step 3 — results: AI advice + DB-verified products */}
      {result?.ok && (
        <div className="mt-8">
          <div className="border-l-2 border-gold pl-4 py-1">
            <p className="text-sm leading-relaxed">{result.advice}</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {result.products.map((p) => (
              <div key={p.id} className="border border-ink/10 bg-white/50 flex flex-col">
                <Link to="/product/$slug" params={{ slug: p.slug }} className="block">
                  <ProductMedia url={p.image ?? null} alt={p.name} aspect="aspect-[4/5]" width={480} />
                </Link>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-[0.62rem] uppercase tracking-btn text-stone">{p.category}</p>
                  <Link to="/product/$slug" params={{ slug: p.slug }} className="font-editorial text-lg leading-snug mt-1">
                    {p.name}
                  </Link>
                  <p className="text-sm mt-1">
                    <span className="text-stone">Product Only </span>
                    <span>{formatNaira(p.price)}</span>
                    {p.completePackagePrice ? (
                      <span className="block text-xs text-stone">
                        Complete Package {formatNaira(p.completePackagePrice)}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-3">
                    <Link to="/product/$slug" params={{ slug: p.slug }} className="btn-lux btn-lux-primary !py-2.5 !px-4 w-full">
                      View This Piece
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {result.products.length === 0 && (
              <p className="text-sm text-stone sm:col-span-2">
                No catalogue pieces match that brief yet — send it to our team
                below and we will quote a bespoke make.
              </p>
            )}
          </div>

          {/* Step 4 — refine, conceptualise, or convert to a lead */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button type="button" onClick={ask} className="btn-lux btn-lux-outline">
              Refine This Design
            </button>
            <button
              type="button"
              onClick={makeConcept}
              disabled={conceptBusy}
              className="btn-lux btn-lux-outline"
            >
              {conceptBusy ? "Sketching…" : "Generate Concept Visual"}
            </button>
            <button
              type="button"
              onClick={sendToDreamz}
              disabled={submitBusy}
              className="btn-lux btn-lux-gold"
            >
              {submitBusy ? "Sending…" : "Send to DREAMZ for a Quote"}
            </button>
          </div>

          {conceptError && <p role="alert" className="mt-3 text-sm text-oxblood text-center">{conceptError}</p>}
          {concept && (
            <figure className="mt-8 max-w-md mx-auto">
              <img
                src={concept}
                alt="AI design concept sketch — not a photograph of a finished product"
                className="w-full border border-ink/10"
              />
              <figcaption className="mt-2 text-center text-[0.65rem] uppercase tracking-btn text-stone">
                AI design concept — final leather, colour, hardware and
                construction may vary after atelier review.
              </figcaption>
            </figure>
          )}
        </div>
      )}

      {/* Lead capture even before discovery — the brief itself is the lead */}
      {productType && !result?.ok && !error && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={sendToDreamz}
            disabled={submitBusy}
            className="btn-lux btn-lux-gold"
          >
            {submitBusy ? "Sending…" : "Send This Brief to DREAMZ for a Quote"}
          </button>
        </div>
      )}
      {submitError && <p role="alert" className="mt-3 text-sm text-oxblood text-center">{submitError}</p>}
    </div>
  );
}

export default DesignAssistant;
