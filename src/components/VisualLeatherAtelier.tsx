import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-client";
import {
  ATELIER_CATEGORIES,
  CHARACTER_OPTIONS,
  DREAM_THEMES,
  constructionQuestions,
  type AtelierCategory,
} from "@/lib/atelier";
import { composeDreamToLeather } from "@/server/atelier.functions";
import {
  getMyDesignerDraft,
  getMyDesignerState,
  saveDesignerDesign,
  recordDesignShare,
} from "@/server/designer.functions";
import {
  COLOUR_VISUALS,
  FINISH_VISUALS,
  MATERIAL_VISUALS,
  PIECE_VISUALS,
  PROJECT_MODES,
  categoryVisual,
  constructionVisual,
  recommendedFinishes,
  recommendedMaterials,
  visualForPiece,
} from "@/lib/visual-designer";
import { designerPlanRank, getDesignerPlan } from "@/lib/designer-plans";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { REFERENCE_LIMITS, precheckFile } from "@/lib/reference-upload";
import { CONTACT } from "@/lib/contact";

type AtelierResult = Extract<Awaited<ReturnType<typeof composeDreamToLeather>>, { ok: true }>;

type Answers = {
  category: AtelierCategory | null;
  piece: string;
  projectMode: "self" | "gift" | "client" | "family";
  clientLabel: string;
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
  piece: "",
  projectMode: "self",
  clientLabel: "",
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

const STUDIO_SESSION_KEY = "dfk-pending-visual-studio";

type DesignerState = Awaited<ReturnType<typeof getMyDesignerState>>;

function hasMinPlan(current: string, required: string | undefined) {
  if (!required) return true;
  return designerPlanRank(current) >= designerPlanRank(required);
}

function optionImageUrl(url: string | undefined) {
  if (!url) return null;
  return url;
}

export function VisualLeatherAtelier({ briefId }: { briefId?: number }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL);
  const [result, setResult] = useState<AtelierResult | null>(null);
  const [designerState, setDesignerState] = useState<DesignerState | null>(null);
  const [currentBriefId, setCurrentBriefId] = useState<number | undefined>(briefId);
  const [referenceIds, setReferenceIds] = useState<string[]>([]);
  const [referencePreviews, setReferencePreviews] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [published, setPublished] = useState<{ publicSlug: string; profileSlug: string } | null>(null);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);

  const plan = designerState && !designerState.unauthenticated ? designerState.plan : getDesignerPlan("free");
  const planId = plan.id;
  const pieceVisual = visualForPiece(answers.piece);

  const categories = useMemo(
    () =>
      ATELIER_CATEGORIES.map((category) => ({
        ...category,
        representative: PIECE_VISUALS.find((piece) => piece.category === category.key)?.image || categoryVisual(category.key),
      })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    getMyDesignerState()
      .then((state) => {
        if (!cancelled) setDesignerState(state);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!briefId || !user) return;
    let cancelled = false;
    setBusy(true);
    getMyDesignerDraft({ data: briefId })
      .then((response) => {
        if (cancelled || !response.found) return;
        const payload = response.design.payload as {
          answers?: Partial<Answers>;
          designSummary?: string;
          renderPrompt?: string;
          artisanBrief?: string;
          referenceIds?: string[];
        };
        if (payload.answers) setAnswers({ ...INITIAL, ...payload.answers });
        if (Array.isArray(payload.referenceIds)) {
          setReferenceIds(payload.referenceIds);
          setReferencePreviews(
            payload.referenceIds.map((id, index) => ({
              id,
              name: "Reference " + (index + 1),
              url: "/api/design-references/" + id,
            })),
          );
        }
        if (payload.designSummary && payload.renderPrompt && payload.artisanBrief) {
          setResult({
            ok: true,
            designSummary: payload.designSummary,
            renderPrompt: payload.renderPrompt,
            artisanBrief: payload.artisanBrief,
          } as AtelierResult);
        }
        setCurrentBriefId(response.design.id);
        setStep(5);
      })
      .catch(() => setNotice("We couldn't reopen that design just now."))
      .finally(() => setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [briefId, user]);

  useEffect(() => {
    if (!user || typeof window === "undefined" || briefId) return;
    const raw = sessionStorage.getItem(STUDIO_SESSION_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as {
        answers?: Partial<Answers>;
        result?: AtelierResult | null;
        referenceIds?: string[];
        step?: number;
      };
      if (pending.answers) setAnswers({ ...INITIAL, ...pending.answers });
      if (pending.result) setResult(pending.result);
      if (Array.isArray(pending.referenceIds)) {
        setReferenceIds(pending.referenceIds);
        setReferencePreviews(
          pending.referenceIds.map((id, index) => ({
            id,
            name: "Reference " + (index + 1),
            url: "/api/design-references/" + id,
          })),
        );
      }
      if (typeof pending.step === "number") setStep(Math.max(0, Math.min(5, pending.step)));
      sessionStorage.removeItem(STUDIO_SESSION_KEY);
    } catch {
      sessionStorage.removeItem(STUDIO_SESSION_KEY);
    }
  }, [user, briefId]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setResult(null);
    setPublished(null);
  };

  const toggleList = (key: "meaning" | "feel", value: string, max = 5) => {
    setAnswers((current) => {
      const exists = current[key].includes(value);
      return {
        ...current,
        [key]: exists
          ? current[key].filter((item) => item !== value)
          : current[key].length >= max
            ? current[key]
            : [...current[key], value],
      };
    });
    setResult(null);
  };

  const chooseCategory = (category: AtelierCategory) => {
    setAnswers((current) => ({
      ...current,
      category,
      piece: "",
      construction: {},
    }));
    setResult(null);
  };

  const chooseProjectMode = (mode: Answers["projectMode"], minPlan: string) => {
    if (!hasMinPlan(planId, minPlan)) {
      setNotice("Client and Family Modes are Studio features. Your free designs still work for yourself or someone else.");
      return;
    }
    set("projectMode", mode);
  };

  const chooseMaterial = (material: (typeof MATERIAL_VISUALS)[number]) => {
    set("material", material.label);
  };

  const chooseFinish = (finish: (typeof FINISH_VISUALS)[number]) => {
    set("texture", finish.label);
  };

  const chooseColour = (field: "primaryColour" | "secondaryColour", label: string) => {
    set(field, label);
  };

  const chooseConstruction = (key: string, value: string) => {
    setAnswers((current) => ({
      ...current,
      construction: { ...current.construction, [key]: value },
    }));
    setResult(null);
  };

  const compose = async () => {
    if (!answers.category || !answers.piece) {
      setNotice("Choose the leather piece first.");
      setStep(0);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await composeDreamToLeather({
        data: {
          category: answers.category,
          piece: answers.piece,
          meaning: answers.meaning,
          customMeaning: answers.customMeaning,
          story: answers.story,
          forWhom: answers.forWhom,
          stylePreference: answers.stylePreference,
          occasion: answers.occasion,
          sizeOrMeasurements: answers.sizeOrMeasurements,
          neededBy: answers.neededBy,
          feel: answers.feel,
          primaryColour: answers.primaryColour,
          secondaryColour: answers.secondaryColour,
          pattern: answers.pattern,
          texture: answers.texture,
          material: answers.material,
          construction: answers.construction,
          personalisation: {
            type: answers.personalisationType,
            text: answers.personalisationText,
          },
          inspirationNotes: [
            answers.inspirationNotes,
            referenceIds.length ? referenceIds.length + " private reference image(s) attached" : "",
          ]
            .filter(Boolean)
            .join(" — "),
          budgetNaira: answers.budgetNaira,
        },
      });
      if (!response.ok) {
        setNotice(response.message);
        return;
      }
      setResult(response);
      setStep(5);
    } catch {
      setNotice("The studio couldn't compose the design just now. Your selections are still here.");
    } finally {
      setBusy(false);
    }
  };

  const stashForSignIn = () => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(
      STUDIO_SESSION_KEY,
      JSON.stringify({ answers, result, referenceIds, step }),
    );
    sessionStorage.setItem("dfk-auth-return-to", currentBriefId ? "/custom?brief=" + currentBriefId : "/custom?start=1");
  };

  const save = async (publish: boolean) => {
    if (!result) {
      await compose();
      return;
    }
    if (!user) {
      stashForSignIn();
      setNotice("Sign in to save your design. Your selections will return with you.");
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const response = await saveDesignerDesign({
        data: {
          id: currentBriefId,
          title: designTitle(answers),
          category: answers.category || "",
          piece: answers.piece,
          projectMode: answers.projectMode,
          clientLabel: answers.clientLabel,
          publish,
          payload: {
            answers,
            designSummary: result.designSummary,
            renderPrompt: result.renderPrompt,
            artisanBrief: result.artisanBrief,
            visualPreview: {
              piece: answers.piece,
              material: answers.material,
              texture: answers.texture,
              primaryColour: answers.primaryColour,
              secondaryColour: answers.secondaryColour,
              image: pieceVisual?.image || null,
              construction: answers.construction,
            },
            referenceIds,
          },
        },
      });

      if (!response.ok) {
        if (response.reason === "limit") {
          setNotice("You've used all " + response.limit + " designs on " + response.plan.name + ". Upgrade to create more.");
        } else if (response.reason === "upgrade") {
          setNotice("This project mode requires Studio or Pro Studio.");
        } else if (response.reason === "signin") {
          stashForSignIn();
          setNotice("Please sign in to save this design.");
        } else {
          setNotice("This design couldn't be saved just now.");
        }
        return;
      }

      setCurrentBriefId(response.id);
      setApprovalToken(response.approvalToken || null);
      if (response.publicSlug && response.profileSlug && publish) {
        setPublished({ publicSlug: response.publicSlug, profileSlug: response.profileSlug });
        setNotice("Your dream is live. Share it boldly.");
      } else {
        setNotice("Saved privately to My Designs.");
      }
      const refreshed = await getMyDesignerState();
      setDesignerState(refreshed);
    } catch {
      setNotice("This design couldn't be saved just now. Your selections are still here.");
    } finally {
      setBusy(false);
    }
  };

  const handleReferenceUpload = async (file: File) => {
    if (referenceIds.length >= REFERENCE_LIMITS.maxFiles) {
      setNotice("You can attach up to " + REFERENCE_LIMITS.maxFiles + " private reference images.");
      return;
    }
    const problem = precheckFile(file);
    if (problem) {
      setNotice(problem);
      return;
    }
    setUploadBusy(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/design-references", { method: "POST", body: form });
      const json = (await response.json()) as { refId?: string; error?: string };
      if (!response.ok || !json.refId) throw new Error(json.error || "Upload failed.");
      const url = URL.createObjectURL(file);
      setReferenceIds((items) => [...items, json.refId!]);
      setReferencePreviews((items) => [...items, { id: json.refId!, name: file.name, url }]);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The reference image could not be uploaded.");
    } finally {
      setUploadBusy(false);
    }
  };

  const constructionQuestionsForPiece = answers.category && answers.piece
    ? constructionQuestions(answers.category, answers.piece)
    : [];

  const steps = ["Piece", "Dream", "Leather", "Details", "Personalise", "Review"];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="overline-label">DREAMZ Visual Studio</p>
          <p className="text-xs text-stone mt-1">
            {user
              ? plan.name + " · " + ("remaining" in (designerState || {}) ? (designerState as any).remaining : plan.designLimit) + " design slots remaining"
              : "3 saved designs free after sign-in"}
          </p>
        </div>
        <Link to="/studio-plans" className="nav-link text-[0.68rem] uppercase tracking-btn">
          Plans & features →
        </Link>
      </div>

      {notice && (
        <div className="mb-5 border border-gold/40 bg-gold/5 px-4 py-3 text-sm flex items-start justify-between gap-4" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-stone">×</button>
        </div>
      )}

      <ol className="mb-6 flex gap-2 overflow-x-auto pb-2" aria-label="Design steps">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => index <= step && setStep(index)}
              className={
                "whitespace-nowrap border px-3 py-2 text-[0.62rem] uppercase tracking-btn " +
                (index === step ? "border-ink bg-ink text-ivory" : index < step ? "border-forest text-forest" : "border-ink/10 text-stone")
              }
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <div className="min-w-0">
          {step === 0 && (
            <section>
              <h2 className="font-editorial text-3xl">What do you want to design?</h2>
              <p className="text-sm text-stone mt-2">
                Start with the product. Every option below is a blank Studio guide — never a DREAMZ product already listed for sale.
              </p>

              <h3 className="font-editorial text-2xl mt-7">1. Choose a category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.key}
                    onClick={() => chooseCategory(category.key)}
                    className={"overflow-hidden border text-left " + (answers.category === category.key ? "border-ink bg-ivory-deep" : "border-ink/10")}
                  >
                    <div className="aspect-[4/3] bg-ivory-deep overflow-hidden">
                      <img src={category.representative} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="block p-3 font-editorial text-lg">{category.label}</span>
                  </button>
                ))}
              </div>

              {answers.category && (
                <>
                  <h3 className="font-editorial text-2xl mt-8">2. Choose the piece</h3>
                  <p className="text-xs text-stone mt-1">Pick the form you want to create from scratch.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {ATELIER_CATEGORIES.find((category) => category.key === answers.category)?.pieces.map((piece) => {
                      const visual = visualForPiece(piece);
                      return (
                        <button
                          key={piece}
                          type="button"
                          onClick={() => set("piece", piece)}
                          className={"overflow-hidden border text-left " + (answers.piece === piece ? "border-ink bg-ivory-deep" : "border-ink/10")}
                        >
                          <div className="aspect-square bg-ivory-deep overflow-hidden">
                            {visual ? (
                              <img src={visual.image} alt={piece + " blank Studio silhouette"} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full grid place-items-center px-4 text-center text-xs text-stone">Neutral silhouette</div>
                            )}
                          </div>
                          <span className="block p-3">
                            <span className="font-editorial text-base">{piece}</span>
                            {visual?.note && <span className="block text-[0.66rem] text-stone mt-1">{visual.note}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <details className="mt-8 border border-ink/10 p-4">
                <summary className="cursor-pointer text-sm font-medium">Who are you designing for? <span className="text-stone">(optional)</span></summary>
                <p className="text-xs text-stone mt-2">Myself is selected by default. Change it only if this is a gift, client or family project.</p>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {PROJECT_MODES.map((mode) => {
                    const locked = !hasMinPlan(planId, mode.minPlan);
                    return (
                      <button
                        type="button"
                        key={mode.id}
                        onClick={() => chooseProjectMode(mode.id as Answers["projectMode"], mode.minPlan)}
                        className={
                          "text-left border p-3 transition " +
                          (answers.projectMode === mode.id ? "border-ink bg-ivory-deep" : "border-ink/10 hover:border-ink/40")
                        }
                      >
                        <span className="font-editorial text-base">{mode.label}</span>
                        {locked && <span className="ml-2 text-[0.55rem] uppercase tracking-btn text-gold">Studio</span>}
                      </button>
                    );
                  })}
                </div>
                {(answers.projectMode === "client" || answers.projectMode === "family") && (
                  <label className="block mt-4">
                    <span className="text-xs uppercase tracking-btn">{answers.projectMode === "client" ? "Client/project name" : "Family/project name"}</span>
                    <input
                      value={answers.clientLabel}
                      onChange={(event) => set("clientLabel", event.target.value)}
                      className="input-lux mt-2"
                      placeholder={answers.projectMode === "client" ? "e.g. David — wedding shoes" : "e.g. The Okafor Family"}
                    />
                  </label>
                )}
              </details>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2 className="font-editorial text-3xl">What should this piece mean?</h2>
              <p className="text-sm text-stone mt-2">Choose up to three themes or tell us the story in your own words.</p>
              <div className="flex flex-wrap gap-2 mt-5">
                {DREAM_THEMES.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => toggleList("meaning", theme, 3)}
                    className={"border px-3 py-2 text-xs " + (answers.meaning.includes(theme) ? "border-ink bg-ink text-ivory" : "border-ink/15")}
                  >
                    {theme}
                  </button>
                ))}
              </div>
              <details className="mt-6 border border-ink/10 p-4">
                <summary className="cursor-pointer text-sm font-medium">Add story, occasion or style <span className="text-stone">(optional)</span></summary>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <label>
                    <span className="text-xs uppercase tracking-btn">My own meaning</span>
                    <input value={answers.customMeaning} onChange={(e) => set("customMeaning", e.target.value)} className="input-lux mt-2" placeholder="e.g. Becoming the first graduate in my family" />
                  </label>
                  <label>
                    <span className="text-xs uppercase tracking-btn">For whom?</span>
                    <input value={answers.forWhom} onChange={(e) => set("forWhom", e.target.value)} className="input-lux mt-2" placeholder="Me, my client, my brother…" />
                  </label>
                  <label>
                    <span className="text-xs uppercase tracking-btn">Occasion</span>
                    <input value={answers.occasion} onChange={(e) => set("occasion", e.target.value)} className="input-lux mt-2" placeholder="Everyday, wedding, graduation…" />
                  </label>
                  <label>
                    <span className="text-xs uppercase tracking-btn">Style preference</span>
                    <input value={answers.stylePreference} onChange={(e) => set("stylePreference", e.target.value)} className="input-lux mt-2" placeholder="Minimal, bold, masculine, feminine, unisex…" />
                  </label>
                </div>
                <label className="block mt-4">
                  <span className="text-xs uppercase tracking-btn">The story</span>
                  <textarea value={answers.story} onChange={(e) => set("story", e.target.value)} className="input-lux mt-2 min-h-24" placeholder="Optional inspiration. Keep private contact details out of this field." />
                </label>
              </details>
              <h3 className="font-editorial text-xl mt-7">Design character</h3>
              <div className="flex flex-wrap gap-2 mt-3">
                {CHARACTER_OPTIONS.map((feel) => (
                  <button
                    type="button"
                    key={feel}
                    onClick={() => toggleList("feel", feel, 4)}
                    className={"border px-3 py-2 text-xs " + (answers.feel.includes(feel) ? "border-ink bg-ink text-ivory" : "border-ink/15")}
                  >
                    {feel}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2 className="font-editorial text-3xl">Choose the leather</h2>
              <p className="text-sm text-stone mt-2">
                You do not need leather knowledge. Tap what looks and feels closest to your idea; DREAMZ confirms the exact hide before production.
              </p>

              <div className="mt-5 rounded-sm border border-gold/30 bg-gold/5 p-3 text-xs text-stone leading-relaxed">
                <strong className="text-ink">Simple guide:</strong> full-grain and top-grain describe hide quality/processing, while suede and nubuck describe the surface feel. A photograph cannot prove leather grade, so grade is always confirmed by the atelier.
              </div>

              <h3 className="font-editorial text-xl mt-7">1. Leather base</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {MATERIAL_VISUALS.map((material) => {
                  const recommended = recommendedMaterials(answers.category, answers.piece).includes(material.label);
                  return (
                    <button
                      type="button"
                      key={material.id}
                      onClick={() => chooseMaterial(material)}
                      className={"overflow-hidden border text-left " + (answers.material === material.label ? "border-ink bg-ivory-deep" : "border-ink/10")}
                    >
                      <div className="aspect-square bg-ivory-deep overflow-hidden">
                        {optionImageUrl(material.image) ? (
                          <img src={material.image} alt={material.label + " reference"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full p-5 flex items-end"><span className="font-editorial text-xl">{material.label}</span></div>
                        )}
                      </div>
                      <span className="block p-3">
                        <span className="font-editorial text-base">{material.label}</span>
                        {recommended && <span className="ml-2 text-[0.56rem] uppercase tracking-btn text-forest">Recommended</span>}
                        <span className="block mt-1 text-[0.64rem] leading-relaxed text-stone">{material.note}</span>
                        {material.bestFor && <span className="block mt-2 text-[0.58rem] leading-relaxed text-stone"><strong>Best for:</strong> {material.bestFor}</span>}
                        {material.credit && <span className="block mt-2 text-[0.52rem] leading-relaxed text-stone/80">{material.credit}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              <h3 className="font-editorial text-xl mt-8">2. Surface / finish <span className="text-stone text-sm">(optional)</span></h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => set("texture", "")}
                  className={"border p-4 text-left " + (!answers.texture ? "border-ink bg-ivory-deep" : "border-ink/10")}
                >
                  <span className="font-editorial text-base">Let DREAMZ advise</span>
                  <span className="block mt-1 text-[0.64rem] text-stone">Best if you are unsure.</span>
                </button>
                {FINISH_VISUALS.map((finish) => {
                  const recommended = recommendedFinishes(answers.category, answers.piece).includes(finish.label);
                  return (
                    <button
                      type="button"
                      key={finish.id}
                      onClick={() => chooseFinish(finish)}
                      className={"overflow-hidden border text-left " + (answers.texture === finish.label ? "border-ink bg-ivory-deep" : "border-ink/10")}
                    >
                      <div className="aspect-square bg-ivory-deep overflow-hidden">
                        {finish.image && <img src={finish.image} alt={finish.label + " leather finish reference"} className="h-full w-full object-cover" />}
                      </div>
                      <span className="block p-3">
                        <span className="font-editorial text-base">{finish.label}</span>
                        {recommended && <span className="ml-2 text-[0.56rem] uppercase tracking-btn text-forest">Recommended</span>}
                        <span className="block mt-1 text-[0.64rem] leading-relaxed text-stone">{finish.note}</span>
                        {finish.credit && <span className="block mt-2 text-[0.52rem] leading-relaxed text-stone/80">{finish.credit}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>

              <h3 className="font-editorial text-2xl mt-9">3. Primary colour</h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                {COLOUR_VISUALS.map((colour) => (
                  <button
                    key={colour.id}
                    type="button"
                    onClick={() => chooseColour("primaryColour", colour.label)}
                    className={"border p-2 text-left " + (answers.primaryColour === colour.label ? "border-ink" : "border-ink/10")}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      {colour.image && <img src={colour.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                      <span className="absolute right-1.5 bottom-1.5 h-6 w-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: colour.hex }} />
                    </div>
                    <span className="block text-[0.65rem] mt-2">{colour.label}</span>
                  </button>
                ))}
              </div>

              <h3 className="font-editorial text-xl mt-8">Accent colour <span className="text-stone text-sm">(optional)</span></h3>
              <div className="flex flex-wrap gap-2 mt-3">
                <button type="button" onClick={() => chooseColour("secondaryColour", "")} className="border border-ink/15 px-3 py-2 text-xs">No accent</button>
                {COLOUR_VISUALS.map((colour) => (
                  <button
                    key={colour.id}
                    type="button"
                    onClick={() => chooseColour("secondaryColour", colour.label)}
                    aria-label={colour.label}
                    title={colour.label}
                    className={"h-10 w-10 rounded-full border-2 " + (answers.secondaryColour === colour.label ? "border-ink" : "border-white shadow")}
                    style={{ backgroundColor: colour.hex }}
                  />
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2 className="font-editorial text-3xl">Choose the parts</h2>
              <p className="text-sm text-stone mt-2">
                Only the parts that matter for your {answers.piece || "piece"} appear here. Each visual is a neutral construction guide — never one of our sale products.
              </p>
              <div className="mt-6 space-y-7">
                {constructionQuestionsForPiece.map((question) => (
                  <div key={question.key}>
                    <div className="flex items-end justify-between gap-3">
                      <h3 className="font-editorial text-xl">{question.label}</h3>
                      {question.optional && <span className="text-[0.58rem] uppercase tracking-btn text-stone">Optional</span>}
                    </div>
                    {question.type === "select" ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                        {question.options?.map((option) => {
                          const visual = constructionVisual(option);
                          const selected = answers.construction[question.key] === option;
                          return (
                            <button
                              type="button"
                              key={option}
                              onClick={() => chooseConstruction(question.key, option)}
                              className={"overflow-hidden border text-left transition " + (selected ? "border-ink bg-ivory-deep" : "border-ink/10 hover:border-ink/40")}
                            >
                              <div className="aspect-[4/3] overflow-hidden bg-ivory-deep">
                                {visual?.image ? (
                                  <img src={visual.image} alt={option + " construction example"} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="h-full flex items-center justify-center p-4 text-center text-xs text-stone">{option}</div>
                                )}
                              </div>
                              <span className="block p-3">
                                <span className="block text-xs font-medium">{option}</span>
                                {visual?.note && <span className="block mt-1 text-[0.62rem] leading-relaxed text-stone">{visual.note}</span>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        value={answers.construction[question.key] || ""}
                        onChange={(event) => chooseConstruction(question.key, event.target.value)}
                        className="input-lux mt-3"
                        placeholder={question.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-7 border border-ink/10 bg-ivory-deep/40 p-4 text-xs text-stone">
                Maximum build decisions are intentionally kept below ten. DREAMZ confirms final engineering, proportions and production feasibility on WhatsApp before quoting.
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="font-editorial text-3xl">Make it personal</h2>
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                <label>
                  <span className="text-xs uppercase tracking-btn">Size / measurements</span>
                  <input value={answers.sizeOrMeasurements} onChange={(e) => set("sizeOrMeasurements", e.target.value)} className="input-lux mt-2" placeholder="EU 43, waist 34, dimensions…" />
                </label>
                <label>
                  <span className="text-xs uppercase tracking-btn">Needed by</span>
                  <input value={answers.neededBy} onChange={(e) => set("neededBy", e.target.value)} className="input-lux mt-2" placeholder="Date or occasion" />
                </label>
                <label>
                  <span className="text-xs uppercase tracking-btn">Personalisation</span>
                  <select value={answers.personalisationType} onChange={(e) => set("personalisationType", e.target.value)} className="input-lux mt-2">
                    <option value="none">None</option>
                    <option value="initials">Initials</option>
                    <option value="name">Name</option>
                    <option value="phrase">Short phrase</option>
                    <option value="monogram">Monogram</option>
                  </select>
                </label>
                <label>
                  <span className="text-xs uppercase tracking-btn">Text / initials</span>
                  <input value={answers.personalisationText} onChange={(e) => set("personalisationText", e.target.value)} className="input-lux mt-2" disabled={answers.personalisationType === "none"} placeholder="Only what should physically appear" />
                </label>
                <label>
                  <span className="text-xs uppercase tracking-btn">Budget (optional)</span>
                  <input value={answers.budgetNaira} onChange={(e) => set("budgetNaira", e.target.value)} className="input-lux mt-2" inputMode="numeric" placeholder="e.g. 150000" />
                </label>
                <label>
                  <span className="text-xs uppercase tracking-btn">Pattern / trim note</span>
                  <input value={answers.pattern} onChange={(e) => set("pattern", e.target.value)} className="input-lux mt-2" placeholder="e.g. clean panels, one woven trim" />
                </label>
              </div>

              <label className="block mt-4">
                <span className="text-xs uppercase tracking-btn">Anything else the artisan should know?</span>
                <textarea value={answers.inspirationNotes} onChange={(e) => set("inspirationNotes", e.target.value)} className="input-lux mt-2 min-h-24" placeholder="Specific construction or inspiration notes." />
              </label>

              <div className="mt-8 border border-ink/10 p-5">
                <h3 className="font-editorial text-xl">Reference images</h3>
                <p className="text-xs text-stone mt-1">
                  Upload up to {REFERENCE_LIMITS.maxFiles} private references. They are not shown on your public Dreamer page.
                </p>
                <label className="btn-lux btn-lux-outline inline-block mt-4 cursor-pointer">
                  {uploadBusy ? "Uploading…" : "Add Reference Image"}
                  <input
                    type="file"
                    accept={REFERENCE_LIMITS.accept}
                    className="sr-only"
                    disabled={uploadBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleReferenceUpload(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {referencePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {referencePreviews.map((image) => (
                      <div key={image.id} className="border border-ink/10 p-2">
                        <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setReferenceIds((items) => items.filter((id) => id !== image.id));
                            setReferencePreviews((items) => items.filter((item) => item.id !== image.id));
                          }}
                          className="text-[0.62rem] underline mt-2"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {step === 5 && (
            <section>
              <h2 className="font-editorial text-3xl">Your dream design</h2>
              {!result ? (
                <div className="mt-6 border border-ink/10 p-6">
                  <p className="text-sm text-stone">The studio will now turn only your selected information into a professional DREAMZ render specification and artisan brief.</p>
                  <button type="button" onClick={() => void compose()} disabled={busy} className="btn-lux btn-lux-primary mt-5">
                    {busy ? "Composing…" : "Compose My Dream"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-6 border border-ink/10 p-5">
                    <p className="text-xs uppercase tracking-btn text-gold">Design summary</p>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone">{result.designSummary}</pre>
                  </div>
                  <a
                    href={
                      "https://wa.me/" +
                      CONTACT.whatsappNumber.replace(/\D/g, "") +
                      "?text=" +
                      encodeURIComponent(
                        "Hello DREAMZ, I have finished a Dream Studio design and I want the price/production advice.\n\n" +
                        result.designSummary
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-lux btn-lux-primary inline-block mt-4"
                  >
                    Get My Price on WhatsApp
                  </a>
                  <p className="mt-2 text-xs text-stone">
                    A DREAMZ adviser confirms feasibility, exact leather availability, measurements, production timeline and final price.
                  </p>
                  <details className="mt-4 border border-ink/10 p-5">
                    <summary className="cursor-pointer text-xs uppercase tracking-btn">Professional render prompt</summary>
                    <pre className="mt-4 whitespace-pre-wrap text-xs leading-relaxed overflow-x-auto">{result.renderPrompt}</pre>
                  </details>
                  <details className="mt-4 border border-ink/10 p-5">
                    <summary className="cursor-pointer text-xs uppercase tracking-btn">Artisan production brief</summary>
                    <pre className="mt-4 whitespace-pre-wrap text-xs leading-relaxed overflow-x-auto">{result.artisanBrief}</pre>
                  </details>

                  <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
                    <button type="button" disabled={busy} onClick={() => void save(false)} className="btn-lux btn-lux-outline">
                      {busy ? "Saving…" : currentBriefId ? "Save Changes Privately" : "Save Privately"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => void save(true)} className="btn-lux btn-lux-primary">
                      Publish & Share My Dream
                    </button>
                    <button type="button" onClick={() => setStep(0)} className="btn-lux btn-lux-outline">
                      Change My Design
                    </button>
                  </div>

                  {!user && (
                    <Link
                      to="/account/login"
                      search={{ reset: undefined, returnTo: "/custom" }}
                      onClick={stashForSignIn}
                      className="nav-link inline-block mt-4 text-xs"
                    >
                      Sign in to save your 3 free designs →
                    </Link>
                  )}

                  {approvalToken && (answers.projectMode === "client" || answers.projectMode === "family") && (
                    <div className="mt-7 border border-forest/30 bg-forest/5 p-5">
                      <p className="overline-label !text-forest">Private Approval Link</p>
                      <h3 className="font-editorial text-2xl mt-2">Send this to your {answers.projectMode === "family" ? "family" : "client"}.</h3>
                      <p className="text-sm text-stone mt-2">Only someone with this private link can review, approve or request a change. It is never listed on your public Dreamer page.</p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <a href={"/approve/" + approvalToken} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-outline !py-2.5">Open Approval Page</a>
                        <button
                          type="button"
                          onClick={() => void navigator.clipboard.writeText(window.location.origin + "/approve/" + approvalToken)}
                          className="btn-lux btn-lux-outline !py-2.5"
                        >
                          Copy Private Link
                        </button>
                      </div>
                    </div>
                  )}

                  {published && (
                    <SharePanel
                      publicSlug={published.publicSlug}
                      profileSlug={published.profileSlug}
                      title={designTitle(answers)}
                      earnCode={designerState && !designerState.unauthenticated ? designerState.earnCode : null}
                    />
                  )}
                </>
              )}
            </section>
          )}

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-ink/10 pt-5">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              className="nav-link text-xs uppercase tracking-btn disabled:opacity-30"
            >
              ← Back
            </button>
            {step < 5 && (
              <button
                type="button"
                disabled={step === 0 && (!answers.category || !answers.piece)}
                onClick={() => setStep((current) => Math.min(5, current + 1))}
                className="btn-lux btn-lux-primary !py-2.5"
              >
                Continue →
              </button>
            )}
          </div>
        </div>

        <aside className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-24">
            <DesignConceptPreview
              preview={{
                piece: answers.piece,
                material: answers.material,
                texture: answers.texture,
                primaryColour: answers.primaryColour,
                secondaryColour: answers.secondaryColour,
                image: pieceVisual?.image || null,
                construction: answers.construction,
              }}
            />
            <div className="mt-4 border border-ink/10 p-4 text-xs text-stone">
              <p className="font-editorial text-lg text-ink">Your choices stay in control.</p>
              <p className="mt-2 leading-relaxed">
                DREAMZ may translate your selections into professional leathercraft language, but the render brief is not allowed to invent colours, materials, buckles, straps or personalisation you did not choose.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function designTitle(answers: Answers): string {
  const theme = answers.meaning[0] || answers.customMeaning.trim().split(/\s+/).slice(0, 2).join(" ");
  if (theme) return theme + " " + (answers.piece || "Leather Design");
  return answers.piece ? "My " + answers.piece : "My DREAMZ Design";
}

function SharePanel({
  publicSlug,
  profileSlug,
  title,
  earnCode,
}: {
  publicSlug: string;
  profileSlug: string;
  title: string;
  earnCode: string | null;
}) {
  const directPath = "/dream/" + publicSlug;
  const path = earnCode
    ? "/r/" + encodeURIComponent(earnCode) + "?to=" + encodeURIComponent(directPath)
    : directPath;
  const share = async () => {
    void recordDesignShare({ data: publicSlug }).catch(() => {});
    const url = window.location.origin + path;
    if (navigator.share) {
      await navigator.share({ title, text: "I designed this dream leather piece with DREAMZ. Would you wear it?", url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
  };
  const whatsapp = typeof window !== "undefined"
    ? "https://wa.me/?text=" + encodeURIComponent("I designed this dream leather piece with DREAMZ. Would you wear it? " + window.location.origin + path)
    : "#";

  return (
    <div className="mt-7 border border-gold/40 bg-gold/5 p-5">
      <p className="overline-label !text-gold">Your Dream Is Live</p>
      <h3 className="font-editorial text-2xl mt-2">Share it boldly.</h3>
      <p className="text-sm text-stone mt-2">Your private references and client details are not shown publicly.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/dream/$slug" params={{ slug: publicSlug }} className="btn-lux btn-lux-primary !py-2.5">View My Design</Link>
        <button type="button" onClick={() => void share()} className="btn-lux btn-lux-outline !py-2.5">Share / Copy Link</button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-outline !py-2.5">WhatsApp</a>
        <Link to="/dreamer/$slug" params={{ slug: profileSlug }} className="nav-link text-xs self-center">My Dreamer Page →</Link>
      </div>
    </div>
  );
}
