import { describe, expect, it } from "vitest";
import {
  ATELIER_CATEGORIES,
  categoryForPiece,
  classifyFashionRequest,
  constructionQuestions,
  containsExoticRequest,
  formatPromptFor,
  piecesForCategory,
  RENDER_PROMPT_SECTIONS,
  safeLeatherMaterial,
  stripPrivateInfo,
  buildArtisanBrief,
  buildDesignSummary,
  buildRenderPrompt,
  buildQuoteBrief,
  type AtelierBrief,
} from "../src/lib/atelier";
import { DESIGN_TEMPLATES, templateForModel, templateForSku } from "../src/lib/design-templates";
import {
  INSPIRATION_CHOICES,
  isPhysicalPlacement,
  isSacredSource,
  messageLineKey,
  messageSummary,
  placementsForProduct,
  resolvePlacement,
  snapshotFromMessage,
  MEANING_THEMES,
} from "../src/lib/meaning";
import { bannerDaysUntil, ANNIVERSARY_DISMISS_KEY } from "../src/components/AnniversaryBanner";

const brief: AtelierBrief = {
  category: "footwear",
  piece: "Oxford",
  meaning: ["Faith"],
  story: "A gift for my brother finishing his degree.",
  forWhom: "My brother",
  stylePreference: "Unisex",
  occasion: "Graduation",
  sizeOrMeasurements: "EU 43",
  neededBy: "14 February",
  feel: ["Executive", "Minimal"],
  primaryColour: "Oxblood",
  secondaryColour: "Cream",
  material: "Full-grain leather",
  construction: { toeShape: "Round", soleType: "Leather sole", stitchColour: "Contrast" },
  personalisation: { type: "initials", text: "A.O." },
};

describe("the Boot of Many Colours is a fixed signature design", () => {
  it("has no design template and cannot be re-entered into any workspace", () => {
    expect(DESIGN_TEMPLATES).toEqual([]);
    expect(templateForSku("DFK-FTW-001")).toBeNull();
    expect(templateForModel("boot-of-many-colours")).toBeNull();
  });
});

describe("the atelier only accepts leather fashion", () => {
  it("lists exactly the leather-fashion categories — no furniture or automotive", () => {
    const labels = ATELIER_CATEGORIES.map((c) => c.label);
    expect(labels).toEqual(["Footwear", "Bags", "Accessories", "Wearable Leather", "Other"]);
    const allPieces = ATELIER_CATEGORIES.flatMap((c) => c.pieces as readonly string[]);
    const text = allPieces.join(" ").toLowerCase();
    for (const banned of ["sofa", "chair", "car seat", "upholster", "interior", "dashboard"]) {
      expect(text).not.toContain(banned);
    }
    expect(piecesForCategory("other")).toEqual(["Other Leather Fashion Piece"]);
  });

  it("accepts every leather-fashion category including Other Leather Fashion Piece", () => {
    for (const piece of [
      "Oxford",
      "Tote",
      "Belt",
      "Jacket",
      "Watch Strap",
      "Other Leather Fashion Piece",
      "Other leather bag",
      "Leather jewellery/accessory",
    ]) {
      expect(classifyFashionRequest(piece)).toEqual({ suitable: true });
      expect(categoryForPiece(piece)).not.toBeNull();
    }
  });

  it("politely rejects furniture, upholstery and automotive work", () => {
    for (const request of [
      "I want a leather car seat",
      "Reupholster my sofa in leather",
      "Leather interior for my car",
      "A leather chair for my office",
      "leather wall panels for my living room",
      "car dashboard trim",
      "upholstery for a boat",
      "leather dining chairs, six of them",
    ]) {
      const verdict = classifyFashionRequest(request);
      expect(verdict.suitable).toBe(false);
      if (!verdict.suitable) {
        expect(verdict.message).toContain("DREAMZ specialises in leather fashion");
        expect(verdict.message).toContain("Please describe a fashion product");
      }
    }
  });

  it("does not reject legitimate fashion briefs that mention rooms or travel", () => {
    expect(classifyFashionRequest("A briefcase for board meetings").suitable).toBe(true);
    expect(classifyFashionRequest("A leather jacket with a circuit-board lining pattern").suitable).toBe(true);
  });
});

describe("dynamic questions match the product type", () => {
  it("asks footwear about soles but never asks bags for a sole", () => {
    const footwear = constructionQuestions("footwear", "Oxford").map((q) => q.key);
    expect(footwear).toContain("soleType");
    expect(footwear).toContain("toeShape");
    const bag = constructionQuestions("bags", "Tote").map((q) => q.key);
    expect(bag).not.toContain("soleType");
    expect(bag).toContain("dimensions");
    expect(bag).toContain("compartments");
  });

  it("never asks shoe size on a wallet path and keeps each screen small", () => {
    const accessory = constructionQuestions("accessories", "Wallet");
    expect(accessory.map((q) => q.key)).not.toContain("sizeOrMeasurements");
    for (const [category, piece] of [
      ["footwear", "Oxford"],
      ["bags", "Handbag"],
      ["accessories", "Belt"],
      ["wearable", "Jacket"],
      ["other", "Other Leather Fashion Piece"],
    ] as const) {
      expect(constructionQuestions(category, piece).length).toBeLessThanOrEqual(5);
    }
  });

  it("belts get width, buckle and edge questions", () => {
    const keys = constructionQuestions("accessories", "Belt").map((q) => q.key);
    expect(keys).toEqual(expect.arrayContaining(["width", "buckleStyle", "edgeFinish", "hardwareFinish"]));
  });
});

describe("the render prompt carries the DREAMZ technical structure", () => {
  const prompt = buildRenderPrompt(brief);

  it("contains every mandatory section A–M in order", () => {
    let cursor = 0;
    for (const section of RENDER_PROMPT_SECTIONS) {
      const at = prompt.indexOf(section, cursor);
      expect(at).toBeGreaterThanOrEqual(0);
      cursor = at;
    }
  });

  it("speaks professional leathercraft and enforces realism", () => {
    expect(prompt).toContain("Full-grain leather");
    expect(prompt).toContain("leather grain");
    expect(prompt).toContain("stitch");
    expect(prompt).toContain("never floating");
    expect(prompt).toContain("Distinctive, not noisy");
    expect(prompt).toContain("No random logo");
    expect(prompt).toContain("No impossible seams");
    expect(prompt).toContain("lightning motif");
  });

  it("never invents prices, stock, SKUs or availability", () => {
    expect(prompt).not.toMatch(/₦/);
    expect(prompt).not.toMatch(/in stock|discount|SKU/i);
    const withBudget = buildDesignSummary({ ...brief, budgetNaira: "250,000" });
    expect(withBudget).toContain("Budget: ₦250,000"); // only the customer's own figure
    expect(buildDesignSummary(brief)).toContain("Budget: not supplied");
    expect(buildDesignSummary(brief)).not.toMatch(/In stock|Available now/i);
  });

  it("excludes private customer information from every prompt copy", () => {
    const dirty = buildRenderPrompt({
      ...brief,
      story: "Contact me at ada@example.com or call 08031234567 — surprise party!",
      forWhom: "Ada Obi",
    });
    const universal = stripPrivateInfo(dirty);
    expect(universal).not.toContain("ada@example.com");
    expect(universal).not.toContain("08031234567");
    for (const format of ["chatgpt", "gemini", "grok"] as const) {
      expect(formatPromptFor(universal, format)).not.toContain("ada@example.com");
    }
  });

  it("describes exotic requests safely unless the admin verified genuine material", () => {
    expect(safeLeatherMaterial("crocodile skin tote")).toBe("crocodile-texture embossed leather tote");
    expect(safeLeatherMaterial("python and ostrich mix")).toBe("python-texture embossed leather and ostrich-texture embossed leather mix");
    expect(safeLeatherMaterial("crocodile", true)).toBe("crocodile");
    expect(containsExoticRequest("I want croc")).toBe(true);
    expect(containsExoticRequest("pebbled calfskin")).toBe(false);
  });

  it("formats identically in spec, differently in framing", () => {
    const universal = formatPromptFor(prompt, "universal");
    expect(formatPromptFor(prompt, "chatgpt")).toContain(universal);
    expect(formatPromptFor(prompt, "gemini")).toContain("A. PRODUCT IDENTITY");
    expect(formatPromptFor(prompt, "grok")).toContain("M. NEGATIVE CONSTRAINTS");
  });

  it("the artisan brief marks unverified details for confirmation", () => {
    const artisan = buildArtisanBrief(brief);
    expect(artisan).toContain("ARTISAN CONFIRMATION REQUIRED");
    expect(artisan).toContain("Upper/body leather");
    expect(artisan).toContain("Colour placements");
    const quote = buildQuoteBrief(brief, {
      requestNumber: "REQ-1",
      renderPrompt: prompt,
      artisanBrief: artisan,
      designSummary: buildDesignSummary(brief),
      catalogueIds: [1, 2],
      inspirationCount: 2,
    });
    expect(quote).toMatchObject({ requestNumber: "REQ-1", status: "new", budget: null, deadline: "14 February" });
    expect((quote.renderPromptSnapshot as string)).toContain("A. PRODUCT IDENTITY");
    expect((quote.selections as Record<string, unknown>).meaning).toContain("Faith");
  });
});

describe("make it meaningful rules", () => {
  const message = {
    messageId: "DQ-FAITH-01",
    version: 1,
    theme: "Faith",
    source: "dreamz",
    text: "Take the next step with courage.",
    reference: null,
    translation: null,
    attribution: "DREAMZ",
    rtl: false,
  };

  it("offers four equally-treated choices and no religious preselection", () => {
    expect(INSPIRATION_CHOICES.map((c) => c.label)).toEqual(["Bible", "Qur’an", "DREAMZ Quote", "No Message"]);
    expect(MEANING_THEMES).toContain("Faith");
  });

  it("falls back to the Message Card when a sacred text has no respectful placement", () => {
    expect(resolvePlacement({ source: "bible", requested: "message_card", allowed: ["message_card", "gift_note"] })).toBe("message_card");
    expect(resolvePlacement({ source: "bible", requested: "sole", allowed: ["message_card"] })).toBe("message_card");
    expect(resolvePlacement({ source: "quran", requested: "outsole", allowed: ["message_card"] })).toBe("message_card");
    expect(resolvePlacement({ source: "dreamz", requested: "embossing", allowed: ["message_card", "embossing"] })).toBe("embossing");
    expect(resolvePlacement({ source: "dreamz", requested: "engraving", allowed: ["message_card"] })).toBeNull();
  });

  it("knows which placements touch the product and which sources are sacred", () => {
    expect(isPhysicalPlacement("embossing")).toBe(true);
    expect(isPhysicalPlacement("message_card")).toBe(false);
    expect(isSacredSource("bible")).toBe(true);
    expect(isSacredSource("quran")).toBe(true);
    expect(isSacredSource("dreamz")).toBe(false);
  });

  it("separates cart lines by message and placement", () => {
    const a = snapshotFromMessage(message, "message_card");
    const b = snapshotFromMessage(message, "embossing");
    expect(messageLineKey(a)).not.toBe(messageLineKey(b));
    expect(messageLineKey(a)).toBe(messageLineKey(snapshotFromMessage(message, "message_card")));
    expect(messageLineKey(null)).toBe("");
    expect(messageSummary(a)).toContain("Take the next step with courage.");
  });

  it("defaults to the house placements and honours the admin allow-list", () => {
    expect(placementsForProduct(null)).toEqual(["message_card", "gift_note"]);
    expect(placementsForProduct(["message_card"])).toEqual(["message_card"]);
  });
});

describe("5-year experience", () => {
  it("counts down to 12 June 2027 and stops at the date", () => {
    expect(bannerDaysUntil(new Date("2027-06-11T00:00:00+01:00").getTime())).toBe(1);
    expect(bannerDaysUntil(new Date("2027-06-12T00:00:00+01:00").getTime())).toBeNull();
    expect(bannerDaysUntil(new Date("2026-11-04T00:00:00Z").getTime())).toBeGreaterThan(200);
  });

  it("remembers dismissal for the session only", () => {
    expect(ANNIVERSARY_DISMISS_KEY).toBe("dfk-5yr-banner-dismissed");
  });
});
