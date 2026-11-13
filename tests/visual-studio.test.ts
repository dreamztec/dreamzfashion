// Applied Netlify migrations are immutable; add a new timestamped migration for future schema changes.
import { describe, expect, it } from "vitest";
import {
  DESIGNER_PLANS,
  designerPlanPriceLabel,
  getDesignerPlan,
  hasDesignerFeature,
} from "../src/lib/designer-plans";
import {
  COLOUR_VISUALS,
  CONSTRUCTION_VISUALS,
  constructionVisual,
  FINISH_VISUALS,
  MATERIAL_VISUALS,
  PIECE_VISUALS,
  compatibleFinishLabels,
  materialSurfaceLabel,
  PROJECT_MODES,
} from "../src/lib/visual-designer";
import { buildDesignSummary, buildRenderPrompt, constructionQuestions, type AtelierBrief } from "../src/lib/atelier";
import { dreamContestScore, isDreamPrizeEligible } from "../src/lib/dream-contest";

describe("DREAMZ visual studio plans", () => {
  it("keeps the first three designs free and prices paid creation tiers correctly", () => {
    expect(getDesignerPlan("free").designLimit).toBe(3);
    expect(getDesignerPlan("creator").designLimit).toBe(15);
    expect(getDesignerPlan("studio").designLimit).toBe(50);
    expect(getDesignerPlan("pro").designLimit).toBe(200);
    expect(designerPlanPriceLabel(getDesignerPlan("creator"))).toContain("15,000");
    expect(designerPlanPriceLabel(getDesignerPlan("studio"))).toContain("50,000");
    expect(designerPlanPriceLabel(getDesignerPlan("pro"))).toContain("100,000");
  });

  it("keeps earning independent from paid studio access", () => {
    for (const plan of DESIGNER_PLANS) {
      expect(plan.benefits.join(" ").toLowerCase()).not.toMatch(/guaranteed income|guaranteed sales|buy votes/);
    }
    expect(hasDesignerFeature("free", "public_profile")).toBe(true);
    expect(hasDesignerFeature("free", "share_links")).toBe(true);
  });

  it("gates professional client/family workflow to Studio while self/gift stay free", () => {
    const byId = Object.fromEntries(PROJECT_MODES.map((mode) => [mode.id, mode]));
    expect(byId.self.minPlan).toBe("free");
    expect(byId.gift.minPlan).toBe("free");
    expect(byId.client.minPlan).toBe("studio");
    expect(byId.family.minPlan).toBe("studio");
  });
});

describe("visual-first design library", () => {
  it("keeps all built-in Studio visuals independent of product photography", () => {
    for (const piece of PIECE_VISUALS) {
      expect(piece.image).not.toContain("/img/products/");
      expect(piece.image).toMatch(/^data:image\/svg\+xml,/);
    }
    expect(PIECE_VISUALS.some((piece) => piece.piece === "Leather Shirt")).toBe(true);
    expect(PIECE_VISUALS.some((piece) => piece.piece === "Leather Trouser / Pants")).toBe(true);
  });

  it("uses separate leather-base and finish references without catalogue imagery", () => {
    const suede = MATERIAL_VISUALS.find((item) => item.id === "suede");
    const patent = FINISH_VISUALS.find((item) => item.id === "patent");
    expect(MATERIAL_VISUALS.map((item) => item.id)).toEqual(
      expect.arrayContaining(["full-grain", "top-grain", "suede", "nubuck"]),
    );
    expect(FINISH_VISUALS.map((item) => item.id)).toEqual(
      expect.arrayContaining(["smooth", "pebbled", "pull-up", "patent", "embossed"]),
    );
    for (const item of [...MATERIAL_VISUALS, ...FINISH_VISUALS]) {
      expect(item.image).toMatch(/^data:image\/svg\+xml,/);
      expect(item.image).not.toContain("/img/products/");
      expect(item.minPlan).toBeUndefined();
    }
    expect(decodeURIComponent(suede!.image!)).toContain("Suede");
    expect(patent?.image).toContain("Patent");
    expect(COLOUR_VISUALS.length).toBeGreaterThanOrEqual(12);
    expect(COLOUR_VISUALS.every((item) => Boolean(item.hex))).toBe(true);
  });


  it("never substitutes a finished product for a component", () => {
    for (const item of Object.values(CONSTRUCTION_VISUALS)) {
      expect(constructionVisual(item.label)?.image).toMatch(/^data:image\/svg\+xml,/);
      expect(constructionVisual(item.label)?.image).not.toContain("/img/products/");
    }
    expect(constructionVisual("Leather sole")?.image).not.toEqual(constructionVisual("Round")?.image);
    expect(constructionQuestions("footwear", "Oxford").find(q => q.key === "closure")?.options).toEqual(["Lace-up"]);
  });

  it("prevents impossible leather and finish combinations", () => {
    expect(compatibleFinishLabels("Suede")).toEqual([]);
    expect(compatibleFinishLabels("Nubuck")).toEqual([]);
    expect(compatibleFinishLabels("Full-grain leather")).toEqual(
      expect.arrayContaining(["Smooth", "Pebbled", "Pull-up / waxy"]),
    );
    expect(compatibleFinishLabels("Full-grain leather")).not.toContain("Patent gloss");
    expect(compatibleFinishLabels("Top-grain leather")).toEqual(
      expect.arrayContaining(["Smooth", "Pebbled", "Patent gloss", "Embossed"]),
    );
    expect(materialSurfaceLabel("Suede", "")).toBe("Natural suede nap");
    expect(materialSurfaceLabel("Nubuck", "")).toBe("Natural nubuck nap");
  });

  it("keeps product construction beginner-friendly and below ten decisions", () => {
    const paths = [
      ["footwear", "Oxford"],
      ["footwear", "Slide"],
      ["footwear", "Boot"],
      ["footwear", "Heel"],
      ["bags", "Handbag"],
      ["accessories", "Belt"],
      ["wearable", "Jacket"],
    ] as const;
    for (const [category, piece] of paths) {
      expect(constructionQuestions(category, piece).length).toBeLessThanOrEqual(9);
    }
  });
});

describe("locked-data render prompt", () => {
  const minimal: AtelierBrief = {
    category: "footwear",
    piece: "Slide",
    meaning: ["Vision"],
    feel: ["Minimal"],
    construction: {},
  };

  it("explicitly forbids the render engine from inventing unselected design choices", () => {
    const prompt = buildRenderPrompt(minimal);
    expect(prompt).toContain("SOURCE OF TRUTH — LOCKED CLIENT SELECTIONS");
    expect(prompt).toContain("Do not invent a colour, material, texture, strap, buckle, heel, sole, trim");
    expect(prompt).toContain("Material selected: none");
    expect(prompt).toContain("Primary colour selected: none");
    expect(prompt).not.toContain("rich cognac");
    expect(prompt).not.toContain("full-grain leather (atelier suggestion");
  });

  it("preserves explicit material and colour choices exactly", () => {
    const prompt = buildRenderPrompt({
      ...minimal,
      material: "Top-grain leather",
      texture: "Pebbled",
      primaryColour: "Oxblood",
      secondaryColour: "Cream",
      construction: { soleType: "Rubber sole", buckleStyle: "Single buckle" },
    });
    expect(prompt).toContain("Material selected: Top-grain leather");
    expect(prompt).toContain("Texture / finish selected: Pebbled");
    expect(prompt).toContain("Primary colour selected: Oxblood");
    expect(prompt).toContain("Accent colour selected: Cream");
    expect(prompt).toContain("Sole: Rubber sole");
    expect(prompt).toContain("Buckle: Single buckle");
    expect(prompt).toContain("N. FINAL IMAGE DELIVERABLE");
    expect(prompt).toContain("Generate one finished photorealistic product image");
  });

  it("describes suede and nubuck surfaces even when no extra finish is selected", () => {
    const prompt = buildRenderPrompt({
      ...minimal,
      material: "Suede",
      primaryColour: "Black",
      construction: { soleType: "Rubber sole", strapStyle: "Single strap", buckleStyle: "Minimal hardware" },
    });
    expect(prompt).toContain("Texture / finish selected: Natural suede nap");
    expect(prompt).toContain("Selected finish: Natural suede nap");
  });

  it("carries the person's dream, design audience and painting choice into the prompt", () => {
    const prompt = buildRenderPrompt({
      ...minimal,
      material: "Top-grain leather",
      primaryColour: "Navy",
      designAudience: "Male",
      dreamGoal: "become a pilot and fly people safely around the world",
      paintingChoice: "yes",
      paintingNotes: "a subtle airplane line-art on one side panel",
      construction: { soleType: "Rubber sole", strapStyle: "Single strap", buckleStyle: "Minimal hardware" },
    });
    expect(prompt).toContain("Design audience selected: Male");
    expect(prompt).toContain("Dream/story selected: become a pilot");
    expect(prompt).toContain("Painting / artwork selected: yes");
    expect(prompt).toContain("subtle airplane line-art");
  });

  it("produces a detailed human-readable design specification", () => {
    const summary = buildDesignSummary({
      ...minimal,
      material: "Top-grain leather",
      texture: "Pebbled",
      primaryColour: "Oxblood",
      secondaryColour: "Cream",
      sizeOrMeasurements: "EU 45",
      occasion: "Wedding",
      construction: {
        toeShape: "Round",
        soleType: "Rubber sole",
        buckleStyle: "Single buckle",
        stitchColour: "Contrast",
      },
      personalisation: { type: "initials", text: "JO" },
    });
    expect(summary).toContain("DREAMZ DESIGN SPECIFICATION");
    expect(summary).toContain("MATERIAL & COLOUR");
    expect(summary).toContain("• Toe shape: Round");
    expect(summary).toContain("• Sole: Rubber sole");
    expect(summary).toContain("• Buckle: Single buckle");
    expect(summary).toContain("• Size / measurements: EU 45");
  });
});


describe("Dream design challenge scoring", () => {
  it("never allows a zero-order design to be cash-prize eligible", () => {
    expect(isDreamPrizeEligible({ verifiedOrders: 0 })).toBe(false);
    expect(isDreamPrizeEligible({ verifiedOrders: 1 })).toBe(true);
  });

  it("makes verified orders much more valuable than vanity engagement", () => {
    expect(dreamContestScore({ verifiedOrders: 1, likeCount: 0, shareCount: 0 })).toBe(100);
    expect(dreamContestScore({ verifiedOrders: 0, likeCount: 10, shareCount: 0 })).toBe(50);
    expect(
      dreamContestScore({ verifiedOrders: 5, likeCount: 20, shareCount: 10 }),
    ).toBeGreaterThan(
      dreamContestScore({ verifiedOrders: 0, likeCount: 100, shareCount: 0 }),
    );
  });
});
