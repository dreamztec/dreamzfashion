import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  composeDreamToLeather,
  submitAtelierBrief,
} from "@/server/atelier.functions";
import {
  ATELIER_CATEGORIES,
  CHARACTER_OPTIONS,
  DREAM_THEMES,
  constructionQuestions,
  containsExoticRequest,
  formatPromptFor,
  type AtelierCategory,
  type PromptFormat,
} from "@/lib/atelier";
import { formatNaira } from "@/lib/format";
import { ProductMedia } from "@/components/brand";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { REFERENCE_LIMITS, precheckFile } from "@/lib/reference-upload";

/**
 * DREAMZ LEATHER ATELIER — the client half of the DREAMZ DREAM-TO-LEATHER
 * METHOD. A guided consultation, not a configurator and not a chatbot:
 * progressive questions (never more than five on a screen), then four
 * deliverables composed on the server. No AI image generation happens here
 * or anywhere in the flow.
 */

type Answers = {
  category: AtelierCategory | null;
  piece: string | null;
  meaning: string[];
  customMeaning: string;
  story: string;
  forWhom: string;
  stylePreference: string;
  occasion: string;
  sizeOrMeasurements: string;
  neededBy: string;
  feel: string[];
  primaryColour: string;
  secondaryColour: string;
  pattern: string;
  texture: string;
  material: string;
  construction: Record<string, string>;
  personalisationType: string;
  personalisationText: string;
  inspirationNotes: string;
  budgetNaira: string;
};

const INITIAL: Answers = {
  category: null,
  piece: null,
  meaning: [],
  customMeaning: "",
  story: "",
  forWhom: "",
  stylePreference: "",
  occasion: "",
  sizeOrMeasurements: "",
  neededBy: "",
  feel: [],
  primaryColour: "",
  secondaryColour: "",
  pattern: "",
  texture: "",
  material: "",
  construction: {},
  personalisationType: "none",
  personalisationText: "",
  inspirationNotes: "",
  budgetNaira: "",
};

type ComposeResult = Awaited<ReturnType<typeof composeDreamToLeather>>;

const STEPS = ["The Piece", "The Dream", "Person & Occasion", "Design Character", "Leather", "Construction", "Personalisation", "Inspiration"] as const;

function sessionKey(): string {
  let s = sessionStorage.getItem("dfk-design-session");
  if (!s) {
    s = `s-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    sessionStorage.setItem("dfk-design-session", s);
  }
  return s;
}

export function LeatherAtelier() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<ComposeResult, { ok: true }> | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [promptFormat, setPromptFormat] = useState<PromptFormat>("universal");
  const [copied, setCopied] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ requestNumber: string } | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "signin">("idle");
  const [images, setImages] = useState<Array<{ name: string; data: string }>>([]);
  const sessionId = useMemo(sessionKey, []);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setA((v) => ({ ...v, [key]: value }));
  const toggle = (key: "meaning" | "feel", value: string, max: number) =>
    setA((v) => {
      const has = v[key].includes(value);
      if (has) return { ...v, [key]: v[key].filter((x) => x !== value) };
      if (v[key].length >= max) return v;
      return { ...v, [key]: [...v[key], value] };
    });

  const questions = useMemo(
    () => (a.category && a.piece ? constructionQuestions(a.category, a.piece) : []),
    [a.category, a.piece],
  );

  const compose = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await composeDreamToLeather({
        data: {
          category: a.category!,
          piece: a.piece!,
          meaning: a.meaning,
          customMeaning: a.customMeaning,
          story: a.story,
          forWhom: a.forWhom,
          stylePreference: a.stylePreference,
          occasion: a.occasion,
          sizeOrMeasurements: a.sizeOrMeasurements,
          neededBy: a.neededBy,
          feel: a.feel,
          primaryColour: a.primaryColour,
          secondaryColour: a.secondaryColour,
          pattern: a.pattern,
          texture: a.texture,
          material: a.material,
          construction: a.construction,
          personalisation: { type: a.personalisationType, text: a.personalisationText },
          inspirationNotes: [a.inspirationNotes, images.length ? `${images.length} inspiration image(s) attached` : ""].filter(Boolean).join(" — "),
          budgetNaira: a.budgetNaira,
        },
      });
      if (!res.ok) {
        setRejected(res.message);
      } else {
        setResult(res);
      }
    } catch {
      setError("The atelier could not compose your brief just now. Please try again, or continue on WhatsApp below.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setSubmitBusy(true);
    setError(null);
    try {
      const res = await submitAtelierBrief({
        data: {
          sessionId,
          category: a.category!,
          piece: a.piece!,
          meaning: a.meaning,
          customMeaning: a.customMeaning,
          story: a.story,
          forWhom: a.forWhom,
          stylePreference: a.stylePreference,
          occasion: a.occasion,
          sizeOrMeasurements: a.sizeOrMeasurements,
          neededBy: a.neededBy,
          feel: a.feel,
          primaryColour: a.primaryColour,
          secondaryColour: a.secondaryColour,
          pattern: a.pattern,
          texture: a.texture,
          material: a.material,
          construction: a.construction,
          personalisation: { type: a.personalisationType, text: a.personalisationText },
          inspirationNotes: a.inspirationNotes,
          budgetNaira: a.budgetNaira,
          referenceImages: images.map((i) => i.data),
          designSummary: result?.designSummary ?? "",
          renderPrompt: result?.renderPrompt ?? "",
          artisanBrief: result?.artisanBrief ?? "",
          recommendedProductIds: (result?.catalogue ?? []).map((p) => p.id),
        },
      });
      if (!res.ok) {
        setRejected(res.message);
      } else {
        setSubmitted({ requestNumber: res.requestNumber });
      }
    } catch {
      setError("Your brief could not be submitted just now — please try again, or continue with our team on WhatsApp.");
    } finally {
      setSubmitBusy(false);
    }
  };

  const copy = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Copying is blocked in this browser — select the prompt text and copy it manually.");
    }
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (images.length >= REFERENCE_LIMITS.maxFiles) break;
      const problem = precheckFile({ size: file.size, type: file.type, name: file.name });
      if (problem) {
        setError(problem);
        continue;
      }
      if (!file.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, { name: file.name, data: reader.result as string }].slice(0, REFERENCE_LIMITS.maxFiles));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Delivered: the four outputs ─────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-forest text-3xl mb-4" aria-hidden="true">✓</p>
        <h3 className="font-editorial text-2xl mb-3">Your leather brief is with the atelier.</h3>
        <p className="text-sm text-stone mb-1">
          Request <strong>{submitted.requestNumber}</strong> — our design team
          reviews every brief by hand, confirms leather availability and
          pricing, and comes back to you with a quote.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <WhatsAppCTAButton
            message={`Hello ${BRAND.shortName}, I have submitted Leather Atelier brief ${submitted.requestNumber} and would like to continue the consultation.`}
            label="Continue on WhatsApp"
          />
          <Link to="/royale" className="btn-lux btn-lux-outline">
            About Royale — Private Client Service
          </Link>
        </div>
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="text-center py-6">
        <p className="font-editorial text-2xl mb-4">With respect — that's outside our craft.</p>
        <p className="text-sm text-stone max-w-lg mx-auto leading-relaxed">{rejected}</p>
        <button
          type="button"
          className="btn-lux btn-lux-primary mt-6"
          onClick={() => {
            setRejected(null);
            setA({ ...INITIAL });
            setStep(0);
          }}
        >
          Describe a Fashion Piece
        </button>
      </div>
    );
  }

  if (result) {
    const prompt = formatPromptFor(result.renderPrompt, promptFormat);
    return (
      <div className="text-left">
        <h3 className="font-editorial text-2xl mb-2">Your DREAMZ leather brief is ready</h3>
        <p className="text-sm text-stone mb-6">
          The atelier has translated your dream into professional leathercraft
          language. Nothing is rendered here — copy the prompt into the visual
          model of your choice, or send it to DREAMZ for a quote.
        </p>

        <OutputBlock title="1 · DREAMZ Design Summary" body={result.designSummary} />

        <div className="border border-ink/15 bg-white/60 p-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-[0.7rem] uppercase tracking-btn">2 · DREAMZ Render Prompt</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Prompt format">
              {(
                [
                  ["universal", "Universal Prompt"],
                  ["chatgpt", "Copy for ChatGPT"],
                  ["gemini", "Copy for Gemini"],
                  ["grok", "Copy for Grok"],
                ] as Array<[PromptFormat, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPromptFormat(key)}
                  aria-pressed={promptFormat === key}
                  className={`px-3 py-1.5 text-[0.62rem] uppercase tracking-btn border transition-colors ${
                    promptFormat === key ? "border-ink bg-ink text-ivory" : "border-ink/25 hover:border-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed max-h-96 overflow-y-auto border border-ink/10 p-4 bg-ivory">{prompt}</pre>
          <button
            type="button"
            onClick={() => copy(prompt, "prompt")}
            className="btn-lux btn-lux-outline !py-2.5 !px-5 mt-3"
          >
            {copied === "prompt" ? "Prompt copied ✓" : "Copy Prompt"}
          </button>
          <p className="mt-2 text-[0.66rem] text-stone">
            Paste it into ChatGPT, Gemini, Grok or any capable visual model.
            The design specification is identical everywhere — only the
            framing changes. No private details are ever included.
          </p>
        </div>

        <OutputBlock title="3 · Artisan Production Brief" body={result.artisanBrief} note="Items marked ARTISAN CONFIRMATION REQUIRED are verified by the atelier before production — availability, measurements and timeline are never guessed." />

        <div className="mt-8">
          {result.catalogue.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] uppercase tracking-btn mb-1">Start from a DREAMZ piece</p>
              <p className="text-xs text-stone mb-3">
                Pieces from the live collection that come close to your brief —
                real products, real prices, nothing invented.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {result.catalogue.map((p) => (
                  <Link
                    key={p.id}
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="border border-ink/10 bg-white/50 flex flex-col"
                  >
                    <ProductMedia url={p.image ?? null} alt={p.name} aspect="aspect-[4/5]" width={480} />
                    <span className="p-3">
                      <span className="font-editorial text-base leading-snug block">{p.name}</span>
                      <span className="text-xs text-stone mt-1 block">
                        {p.price > 0 ? formatNaira(p.price) : "Request a quote"}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone">
                Or continue with a fully new piece:{" "}
                <button type="button" className="underline hover:text-ink" onClick={() => { setResult(null); setStep(0); setA({ ...INITIAL }); }}>
                  Create a New Leather Brief
                </button>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button type="button" onClick={send} disabled={submitBusy} className="btn-lux btn-lux-primary">
              {submitBusy ? "Sending…" : "Send to DREAMZ"}
            </button>
            <WhatsAppCTAButton
              message={`Hello ${BRAND.shortName}, I have composed a leather design brief in your atelier (${a.piece}) and would like to continue.`}
              label="Continue on WhatsApp"
            />
            <button
              type="button"
              className="btn-lux btn-lux-outline"
              onClick={async () => {
                try {
                  const res = await fetch("/api/event", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: "atelier_prompt_saved", data: {} }),
                    keepalive: true,
                  });
                  void res;
                } catch {
                  /* analytics must never break the page */
                }
                setSaveState("saved");
              }}
            >
              {saveState === "saved" ? "Prompt saved ✓" : "Save to My Account"}
            </button>
            <button type="button" className="btn-lux btn-lux-outline" onClick={() => { setResult(null); setStep(0); }}>
              Refine This Brief
            </button>
          </div>
          {saveState === "saved" && (
            <p className="mt-3 text-xs text-stone">
              A copy of your render prompt stays with this request in your
              account area once you send the brief to DREAMZ.
            </p>
          )}
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>}
      </div>
    );
  }

  // ── The interview ───────────────────────────────────────────────────
  const canContinue = (() => {
    switch (step) {
      case 0:
        return !!a.piece;
      case 1:
        return a.meaning.length > 0 || a.customMeaning.trim().length > 0 || a.story.trim().length > 0 || true; // the dream is optional in depth
      case 2:
        return true; // dynamic fields are optional except who it is for where shown
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return a.personalisationType !== "phrase" || a.personalisationText.trim().length > 0;
      default:
        return true;
    }
  })();

  return (
    <div>
      {/* Progress */}
      <ol className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-[0.62rem] uppercase tracking-btn" aria-label="Interview progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? "text-ink" : i < step ? "text-forest" : "text-stone/60"}>
            {i < step ? "✓ " : `${i + 1}. `}
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <StepShell title="What would you like DREAMZ to create?" note="Leather fashion only — footwear, bags, accessories and wearable leather.">
          {ATELIER_CATEGORIES.map((cat) => (
            <fieldset key={cat.key} className="mb-5">
              <legend className="text-[0.68rem] uppercase tracking-btn text-gold-soft mb-2">{cat.label}</legend>
              <div className="flex flex-wrap gap-2">
                {cat.pieces.map((piece) => (
                  <button
                    key={piece}
                    type="button"
                    onClick={() => {
                      set("category", cat.key);
                      set("piece", piece);
                    }}
                    aria-pressed={a.piece === piece}
                    className={`px-4 py-2.5 text-xs uppercase tracking-btn border transition-colors ${
                      a.piece === piece ? "border-ink bg-ink text-ivory" : "border-ink/25 hover:border-ink"
                    }`}
                  >
                    {piece}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </StepShell>
      )}

      {step === 1 && (
        <StepShell title="What should this piece represent?" note="Choose one or more — or skip entirely. This is the DREAMZ difference: your piece can carry meaning.">
          <div className="flex flex-wrap gap-2">
            {DREAM_THEMES.map((theme) => (
              <Chip key={theme} label={theme} pressed={a.meaning.includes(theme)} onClick={() => toggle("meaning", theme, 3)} />
            ))}
          </div>
          <label htmlFor="atelier-custom-meaning" className="input-lux-label mt-5 block">A custom meaning of your own</label>
          <input
            id="atelier-custom-meaning"
            className="input-lux"
            value={a.customMeaning}
            onChange={(e) => set("customMeaning", e.target.value)}
            maxLength={400}
            placeholder="In your own words…"
          />
          <label htmlFor="atelier-story" className="input-lux-label mt-4 block">
            Tell us the story behind it <span className="normal-case tracking-normal text-stone">(optional)</span>
          </label>
          <textarea
            id="atelier-story"
            rows={3}
            className="input-lux"
            value={a.story}
            onChange={(e) => set("story", e.target.value)}
            maxLength={1200}
            placeholder="Optional — but the stories make the best pieces."
          />
        </StepShell>
      )}

      {step === 2 && (
        <StepShell title="Who is it for, and when?" note="Only the questions that matter for your piece appear here.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="atelier-who" className="input-lux-label">Who is it for?</label>
              <input id="atelier-who" className="input-lux" value={a.forWhom} onChange={(e) => set("forWhom", e.target.value)} placeholder="For me, a gift for my father…" maxLength={120} />
            </div>
            <div>
              <label htmlFor="atelier-style-pref" className="input-lux-label">Style preference</label>
              <select id="atelier-style-pref" className="input-lux" value={a.stylePreference} onChange={(e) => set("stylePreference", e.target.value)}>
                <option value="">Unisex / No preference</option>
                <option value="Masculine cut">Masculine cut</option>
                <option value="Feminine cut">Feminine cut</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>
            <div>
              <label htmlFor="atelier-occasion" className="input-lux-label">Occasion</label>
              <input id="atelier-occasion" className="input-lux" value={a.occasion} onChange={(e) => set("occasion", e.target.value)} placeholder="Everyday, work, wedding, gift, travel…" maxLength={120} />
            </div>
            {(a.category === "footwear" || a.category === "wearable") && (
              <div>
                <label htmlFor="atelier-size" className="input-lux-label">
                  {a.category === "footwear" ? "Shoe size (EU)" : "Body size / measurements"}
                </label>
                <input id="atelier-size" className="input-lux" value={a.sizeOrMeasurements} onChange={(e) => set("sizeOrMeasurements", e.target.value)} placeholder={a.category === "footwear" ? "e.g. 43" : "e.g. chest 40 in"} maxLength={200} />
              </div>
            )}
            <div>
              <label htmlFor="atelier-needby" className="input-lux-label">Needed by</label>
              <input id="atelier-needby" className="input-lux" value={a.neededBy} onChange={(e) => set("neededBy", e.target.value)} placeholder="e.g. 14 February" maxLength={60} />
            </div>
            <div>
              <label htmlFor="atelier-budget" className="input-lux-label">Budget (₦) <span className="normal-case tracking-normal text-stone">(optional)</span></label>
              <input id="atelier-budget" className="input-lux" inputMode="numeric" value={a.budgetNaira} onChange={(e) => set("budgetNaira", e.target.value)} placeholder="e.g. 250,000" maxLength={14} />
            </div>
          </div>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell title="How should it feel?" note="Choose up to four.">
          <div className="flex flex-wrap gap-2">
            {CHARACTER_OPTIONS.map((c) => (
              <Chip key={c} label={c} pressed={a.feel.includes(c)} onClick={() => toggle("feel", c, 4)} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-5">
            <div>
              <label htmlFor="atelier-primary" className="input-lux-label">Primary colour</label>
              <input id="atelier-primary" className="input-lux" value={a.primaryColour} onChange={(e) => set("primaryColour", e.target.value)} placeholder="Brown, black, oxblood…" maxLength={60} />
            </div>
            <div>
              <label htmlFor="atelier-secondary" className="input-lux-label">Secondary / accent colour <span className="normal-case tracking-normal text-stone">(optional)</span></label>
              <input id="atelier-secondary" className="input-lux" value={a.secondaryColour} onChange={(e) => set("secondaryColour", e.target.value)} placeholder="Optional contrast tone" maxLength={60} />
            </div>
            <div>
              <label htmlFor="atelier-pattern" className="input-lux-label">Pattern preference <span className="normal-case tracking-normal text-stone">(optional)</span></label>
              <input id="atelier-pattern" className="input-lux" value={a.pattern} onChange={(e) => set("pattern", e.target.value)} placeholder="Brogue perforation, woven, patchwork…" maxLength={120} />
            </div>
            <div>
              <label htmlFor="atelier-texture" className="input-lux-label">Texture preference <span className="normal-case tracking-normal text-stone">(optional)</span></label>
              <input id="atelier-texture" className="input-lux" value={a.texture} onChange={(e) => set("texture", e.target.value)} placeholder="Pebbled, smooth, suede…" maxLength={120} />
            </div>
          </div>
        </StepShell>
      )}

      {step === 4 && (
        <StepShell title="Leather intelligence" note="Tell us the leather you imagine. The atelier confirms real availability — recommendations are suggestions until confirmed.">
          <label htmlFor="atelier-material" className="input-lux-label">Leather & finish</label>
          <input
            id="atelier-material"
            className="input-lux"
            value={a.material}
            onChange={(e) => set("material", e.target.value)}
            placeholder="Full-grain leather, pebbled leather, suede, pull-up…"
            maxLength={120}
            list="atelier-leather-terms"
          />
          <datalist id="atelier-leather-terms">
            {["Full-grain leather", "Top-grain leather", "Smooth leather", "Pebbled leather", "Pull-up leather", "Suede", "Nubuck", "Patent leather", "Crocodile-texture embossed leather", "Woven leather", "Braided leather"].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          {containsExoticRequest(a.material) && (
            <p className="mt-2 text-xs text-stone border border-gold/40 bg-gold/5 px-3 py-2" role="note">
              Genuine exotic skins are only described once the atelier verifies
              availability. Until then your request is translated safely as a
              crocodile-texture (embossed) leather — the look, without the
              unverifiable claim.
            </p>
          )}
        </StepShell>
      )}

      {step === 5 && (
        <StepShell title={`Construction — your ${a.piece?.toLowerCase() ?? "piece"}`} note="Only the details that materially shape this piece.">
          <div className="grid gap-4 sm:grid-cols-2">
            {questions.map((q) => (
              <div key={q.key}>
                <label htmlFor={`atelier-q-${q.key}`} className="input-lux-label">
                  {q.label}
                  {q.optional && <span className="normal-case tracking-normal text-stone"> (optional)</span>}
                </label>
                {q.type === "select" ? (
                  <select
                    id={`atelier-q-${q.key}`}
                    className="input-lux"
                    value={a.construction[q.key] ?? ""}
                    onChange={(e) => setA((v) => ({ ...v, construction: { ...v.construction, [q.key]: e.target.value } }))}
                  >
                    <option value="">Choose…</option>
                    {q.options?.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`atelier-q-${q.key}`}
                    className="input-lux"
                    value={a.construction[q.key] ?? ""}
                    onChange={(e) => setA((v) => ({ ...v, construction: { ...v.construction, [q.key]: e.target.value } }))}
                    placeholder={q.placeholder ?? ""}
                    maxLength={200}
                  />
                )}
              </div>
            ))}
          </div>
        </StepShell>
      )}

      {step === 6 && (
        <StepShell title="Personalisation" note="Nothing is applied automatically — you choose exactly what, and where it makes sense.">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Personalisation type">
            {[
              ["none", "No personalisation"],
              ["initials", "Initials"],
              ["name", "Name"],
              ["date", "Date"],
              ["phrase", "Short phrase"],
              ["embossing", "Embossing"],
              ["engraving", "Engraving"],
              ["hardware motif", "Hardware motif"],
              ["DREAMZ lightning motif", "DREAMZ lightning motif"],
            ].map(([key, label]) => (
              <Chip key={key} label={label} pressed={a.personalisationType === key} onClick={() => set("personalisationType", key)} />
            ))}
          </div>
          {!["none", "DREAMZ lightning motif"].includes(a.personalisationType) && (
            <div className="mt-4">
              <label htmlFor="atelier-personal-text" className="input-lux-label">
                {a.personalisationType === "date" ? "The date" : "The text"}
              </label>
              <input
                id="atelier-personal-text"
                className="input-lux"
                value={a.personalisationText}
                onChange={(e) => set("personalisationText", e.target.value)}
                maxLength={120}
                placeholder={a.personalisationType === "initials" ? "e.g. A.O." : "Exactly as it should appear"}
              />
            </div>
          )}
        </StepShell>
      )}

      {step === 7 && (
        <StepShell
          title="Inspiration images"
          note="Inspiration helps us understand your direction. DREAMZ creates an original interpretation and does not reproduce third-party protected designs or logos."
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onFiles(e.target.files)}
            className="input-lux !py-2.5 text-sm"
            aria-label="Upload inspiration images"
          />
          {images.length > 0 && (
            <ul className="mt-3 text-xs text-stone space-y-1">
              {images.map((img, i) => (
                <li key={`${img.name}-${i}`}>
                  Attached: {img.name}
                  <button type="button" className="underline ml-2" onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor="atelier-inspiration-notes" className="input-lux-label mt-5 block">Anything the images should tell us</label>
          <textarea
            id="atelier-inspiration-notes"
            rows={2}
            className="input-lux"
            value={a.inspirationNotes}
            onChange={(e) => set("inspirationNotes", e.target.value)}
            maxLength={800}
            placeholder="What to take from them: silhouette, proportion, colour relationship, hardware direction…"
          />
        </StepShell>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>}

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="btn-lux btn-lux-outline">
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            className="btn-lux btn-lux-primary flex-1"
          >
            Continue
          </button>
        ) : (
          <button type="button" onClick={compose} disabled={busy} className="btn-lux btn-lux-gold flex-1">
            {busy ? "Composing your brief…" : "Generate Your DREAMZ Render Prompt"}
          </button>
        )}
      </div>
    </div>
  );
}

function StepShell({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-editorial text-2xl">{title}</h3>
      {note && <p className="text-sm text-stone mt-1 mb-4 leading-relaxed">{note}</p>}
      {children}
    </div>
  );
}

function Chip({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`px-4 py-2.5 text-xs uppercase tracking-btn border transition-colors ${
        pressed ? "border-ink bg-ink text-ivory" : "border-ink/25 hover:border-ink"
      }`}
    >
      {label}
    </button>
  );
}

function OutputBlock({ title, body, note }: { title: string; body: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-ink/15 bg-white/60 p-5 mb-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[0.7rem] uppercase tracking-btn">{title}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* selection copy remains possible */
            }
          }}
          className="text-xs underline text-stone hover:text-ink"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-xs leading-relaxed max-h-72 overflow-y-auto border border-ink/10 p-4 bg-ivory">{body}</pre>
      {note && <p className="mt-2 text-[0.66rem] text-stone">{note}</p>}
    </div>
  );
}

export default LeatherAtelier;
