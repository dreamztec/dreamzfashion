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
} from "@/server/designer.functions";
import {
  COLOUR_VISUALS,
  HARDWARE_VISUALS,
  MATERIAL_VISUALS,
  PIECE_VISUALS,
  PROJECT_MODES,
  SOLE_VISUALS,
  visualForPiece,
} from "@/lib/visual-designer";
import { designerPlanRank, getDesignerPlan } from "@/lib/designer-plans";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { REFERENCE_LIMITS, precheckFile } from "@/lib/reference-upload";

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
        representative: PIECE_VISUALS.find((piece) => piece.category === category.key)?.image || "/img/hero-boot-of-many-colours.jpg",
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
            catalogue: [],
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
    if (!hasMinPlan(planId, material.minPlan)) {
      setNotice(material.label + " is in the Creator Pass visual library.");
      return;
    }
    set("material", material.label);
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
              primaryColour: answers.primaryColour,
              secondaryColour: answers.secondaryColour,
              image: pieceVisual?.image || null,
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
              <h2 className="font-editorial text-3xl">Who are you designing for?</h2>
              <p className="text-sm text-stone mt-2">You can design beyond your own gender or wardrobe. Choose the project, then the leather piece.</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-5">
                {PROJECT_MODES.map((mode) => {
                  const locked = !hasMinPlan(planId, mode.minPlan);
                  return (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => chooseProjectMode(mode.id as Answers["projectMode"], mode.minPlan)}
                      className={
                        "text-left border p-4 transition " +
                        (answers.projectMode === mode.id ? "border-ink bg-ivory-deep" : "border-ink/10 hover:border-ink/40")
                      }
                    >
                      <span className="font-editorial text-xl">{mode.label}</span>
                      {locked && <span className="ml-2 text-[0.58rem] uppercase tracking-btn text-gold">Studio</span>}
                      <span className="block text-xs text-stone mt-1">{mode.note}</span>
                    </button>
                  );
                })}
              </div>
              {(answers.projectMode === "client" || answers.projectMode === "family") && (
                <label className="block mt-5">
                  <span className="text-xs uppercase tracking-btn">{answers.projectMode === "client" ? "Client/project name" : "Family/project name"}</span>
                  <input
                    value={answers.clientLabel}
                    onChange={(event) => set("clientLabel", event.target.value)}
                    className="input-lux mt-2"
                    placeholder={answers.projectMode === "client" ? "e.g. David — wedding shoes" : "e.g. The Okafor Family"}
                  />
                </label>
              )}

              <h3 className="font-editorial text-2xl mt-10">Choose a category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {categories.map((category) => (
                  <button
                    type="button"
                    key={category.key}
                    onClick={() => chooseCategory(category.key)}
                    className={"overflow-hidden border text-left " + (answers.category === category.key ? "border-ink" : "border-ink/10")}
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
                  <h3 className="font-editorial text-2xl mt-10">Choose the piece</h3>
                  <p className="text-xs text-stone mt-1">House photography is used as a visual guide. You are not editing the pictured DREAMZ product itself.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {ATELIER_CATEGORIES.find((category) => category.key === answers.category)?.pieces.map((piece) => {
                      const visual = visualForPiece(piece);
                      return (
                        <button
                          key={piece}
                          type="button"
                          onClick={() => set("piece", piece)}
                          className={"overflow-hidden border text-left " + (answers.piece === piece ? "border-ink" : "border-ink/10")}
                        >
                          <div className="aspect-square bg-ivory-deep overflow-hidden">
                            {visual ? (
                              <img src={visual.image} alt={piece + " visual example"} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full grid place-items-center px-4 text-center text-xs text-stone">Visual sample being added</div>
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
              <div className="grid sm:grid-cols-2 gap-4 mt-6">
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
                  <input value={answers.stylePreference} onChange={(e) => set("stylePreference", e.target.value)} className="input-lux mt-2" placeholder="Masculine, feminine, unisex, modest…" />
                </label>
              </div>
              <label className="block mt-4">
                <span className="text-xs uppercase tracking-btn">The story</span>
                <textarea value={answers.story} onChange={(e) => set("story", e.target.value)} className="input-lux mt-2 min-h-28" placeholder="Tell DREAMZ what inspired the piece. Keep private contact details out of this field." />
              </label>
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
              <p className="text-sm text-stone mt-2">Tap a visual guide instead of guessing technical terms. The atelier confirms the exact hide before production.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                {MATERIAL_VISUALS.map((material) => {
                  const locked = !hasMinPlan(planId, material.minPlan);
                  return (
                    <button
                      type="button"
                      key={material.id}
                      onClick={() => chooseMaterial(material)}
                      className={"overflow-hidden border text-left " + (answers.material === material.label ? "border-ink" : "border-ink/10")}
                    >
                      <div className="aspect-square bg-ivory-deep overflow-hidden">
                        {optionImageUrl(material.image) ? (
                          <img src={material.image} alt={material.label + " visual guide"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full p-5 flex items-end bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,.08),transparent_45%)]">
                            <span className="font-editorial text-xl">{material.label}</span>
                          </div>
                        )}
                      </div>
                      <span className="block p-3">
                        <span className="font-editorial text-base">{material.label}</span>
                        {locked && <span className="ml-2 text-[0.56rem] uppercase tracking-btn text-gold">Creator+</span>}
                        <span className="block mt-1 text-[0.64rem] leading-relaxed text-stone">{material.note}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <h3 className="font-editorial text-2xl mt-9">Primary colour</h3>
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

              <h3 className="font-editorial text-xl mt-8">Optional accent colour</h3>
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
              <h2 className="font-editorial text-3xl">Shape the construction</h2>
              <p className="text-sm text-stone mt-2">Only relevant questions are shown for your {answers.piece || "piece"}.</p>

              {answers.category === "footwear" && (
                <>
                  <h3 className="font-editorial text-xl mt-6">Sole direction</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {SOLE_VISUALS.map((sole) => {
                      const locked = !hasMinPlan(planId, sole.minPlan);
                      return (
                        <button
                          type="button"
                          key={sole.id}
                          onClick={() => {
                            if (locked) {
                              setNotice(sole.label + " is available in Creator Pass.");
                              return;
                            }
                            chooseConstruction("soleType", sole.label);
                          }}
                          className={"overflow-hidden border text-left " + (answers.construction.soleType === sole.label ? "border-ink" : "border-ink/10")}
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-ivory-deep">
                            <img src={sole.image} alt={sole.label + " example"} className="h-full w-full object-cover" />
                          </div>
                          <span className="block p-2 text-xs">{sole.label}{locked ? " · Creator+" : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {(answers.category === "footwear" || answers.category === "accessories") && (
                <>
                  <h3 className="font-editorial text-xl mt-7">Hardware / buckle direction</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {HARDWARE_VISUALS.map((hardware) => {
                      const locked = !hasMinPlan(planId, hardware.minPlan);
                      return (
                        <button
                          type="button"
                          key={hardware.id}
                          onClick={() => {
                            if (locked) {
                              setNotice(hardware.label + " is available in Creator Pass.");
                              return;
                            }
                            chooseConstruction("buckleStyle", hardware.label);
                          }}
                          className={"overflow-hidden border text-left " + (answers.construction.buckleStyle === hardware.label ? "border-ink" : "border-ink/10")}
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-ivory-deep">
                            {hardware.image && <img src={hardware.image} alt={hardware.label + " example"} className="h-full w-full object-cover" />}
                          </div>
                          <span className="block p-2 text-xs">{hardware.label}{locked ? " · Creator+" : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/heel/i.test(answers.piece) && (
                <div className="mt-7">
                  <h3 className="font-editorial text-xl">Heel type</h3>
                  <p className="text-xs text-stone mt-1">Choose the construction direction. Exact heel engineering is confirmed before production.</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {["Block heel", "Kitten heel", "Stiletto", "Wedge", "Sculpted heel"].map((heel) => (
                      <button
                        type="button"
                        key={heel}
                        onClick={() => chooseConstruction("heelType", heel)}
                        className={"border px-3 py-2 text-xs " + (answers.construction.heelType === heel ? "border-ink bg-ink text-ivory" : "border-ink/15")}
                      >
                        {heel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 mt-8">
                {constructionQuestionsForPiece.map((question) => (
                  <label key={question.key}>
                    <span className="text-xs uppercase tracking-btn">{question.label}</span>
                    {question.type === "select" ? (
                      <select
                        value={answers.construction[question.key] || ""}
                        onChange={(event) => chooseConstruction(question.key, event.target.value)}
                        className="input-lux mt-2"
                      >
                        <option value="">Choose</option>
                        {question.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        value={answers.construction[question.key] || ""}
                        onChange={(event) => chooseConstruction(question.key, event.target.value)}
                        className="input-lux mt-2"
                        placeholder={question.placeholder}
                      />
                    )}
                  </label>
                ))}
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
                primaryColour: answers.primaryColour,
                secondaryColour: answers.secondaryColour,
                image: pieceVisual?.image || null,
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
