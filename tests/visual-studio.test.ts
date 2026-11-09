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
  MATERIAL_VISUALS,
  PIECE_VISUALS,
  PROJECT_MODES,
} from "../src/lib/visual-designer";
import { buildRenderPrompt, constructionQuestions, type AtelierBrief } from "../src/lib/atelier";
import { dreamContestScore } from "../src/lib/dream-contest";

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
  it("never uses DREAMZ catalogue products as Studio starting images", () => {
    for (const piece of PIECE_VISUALS) {
      expect(piece.image).toMatch(/^data:image\/svg\+xml,/);
      expect(piece.image).not.toContain("/img/products/");
      expect(piece.image).not.toContain("boot-of-many-colours");
    }
  });

  it("uses leather-reference swatches and visual colour choices", () => {
    const suede = MATERIAL_VISUALS.find((item) => item.id === "suede");
    expect(suede?.image).toContain("/.netlify/images?");
    expect(suede?.image).not.toContain("/img/products/");
    expect(suede?.minPlan).toBeUndefined();
    expect(COLOUR_VISUALS.length).toBeGreaterThanOrEqual(12);
    expect(COLOUR_VISUALS.every((item) => Boolean(item.hex))).toBe(true);
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
      material: "Suede",
      primaryColour: "Oxblood",
      secondaryColour: "Cream",
      construction: { soleType: "Rubber sole", buckleStyle: "Single buckle" },
    });
    expect(prompt).toContain("Material selected: Suede");
    expect(prompt).toContain("Primary colour selected: Oxblood");
    expect(prompt).toContain("Accent colour selected: Cream");
    expect(prompt).toContain("soleType: Rubber sole");
    expect(prompt).toContain("buckleStyle: Single buckle");
  });
});


describe("Dream design challenge scoring", () => {
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
