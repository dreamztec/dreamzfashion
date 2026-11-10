/**
 * DREAMZ LEATHER ATELIER — the DREAMZ DREAM-TO-LEATHER METHOD.
 *
 * The website's intelligence layer is NOT an image generator and NOT a
 * chatbot. Its job is to interview the client, translate ordinary language
 * into professional leathercraft language, detect missing requirements,
 * check basic feasibility and produce three deliverables: a design summary, a DREAMZ render prompt
 * (for the customer to run in a stronger external visual model) and an
 * artisan production brief — plus a structured quote brief for the house.
 *
 * No DREAMZ trademark-registration claims are made anywhere. This is a
 * method name, not a legal status.
 */

// ── Step 1 — The Piece ───────────────────────────────────────────────

export const ATELIER_CATEGORIES = [
  {
    key: "footwear",
    label: "Footwear",
    pieces: [
      "Oxford",
      "Derby",
      "Loafer",
      "Boot",
      "Chelsea Boot",
      "Mule",
      "Slide",
      "Sandal",
      "Heel",
      "Other leather footwear",
    ],
  },
  {
    key: "bags",
    label: "Bags",
    pieces: [
      "Briefcase",
      "Tote",
      "Handbag",
      "Clutch",
      "Crossbody",
      "Backpack",
      "Laptop Bag",
      "Travel Bag",
      "Pouch",
      "Purse",
      "Other leather bag",
    ],
  },
  {
    key: "accessories",
    label: "Accessories",
    pieces: [
      "Belt",
      "Wallet",
      "Card Holder",
      "Passport Holder",
      "Bracelet/Cuff",
      "Watch Strap",
      "Key Holder",
      "Leather jewellery/accessory",
      "Other leather accessory",
    ],
  },
  {
    key: "wearable",
    label: "Wearable Leather",
    pieces: [
      "Jacket",
      "Leather Jacket",
      "Trouser",
      "Leather Trouser / Pants",
      "Leather Shirt",
      "Leather T-shirt",
      "Skirt",
      "Vest",
      "Fashion harness",
      "Hat",
      "Other wearable leather piece",
    ],
  },
  {
    key: "other",
    label: "Other",
    pieces: ["Other Leather Fashion Piece"],
  },
] as const;

export type AtelierCategory = (typeof ATELIER_CATEGORIES)[number]["key"];

export function piecesForCategory(category: AtelierCategory): string[] {
  return [...(ATELIER_CATEGORIES.find((c) => c.key === category)?.pieces ?? [])];
}

export function categoryForPiece(piece: string): AtelierCategory | null {
  for (const c of ATELIER_CATEGORIES) {
    if (c.pieces.includes(piece as never)) return c.key;
  }
  return null;
}

/**
 * Only leather fashion belongs in the atelier. Furniture, automotive and
 * industrial upholstery requests are politely refused and never reach the
 * design engine.
 */
const UNSUITABLE_REQUEST_PATTERN =
  /\b(car|vehicle|auto(motive)?|truck|bus|bike|motorcycle|boat|yacht|aeroplane|aircraft|airplane|plane|jet|jeep|van)\s+(seat|seats|seating|interior|interiors|upholstery|dashboard|steering|trim|door panel|door panels|headliner|roof lining)\b|\b(seat|seats|seating)\s+(cover|covers|upholster\w*)\b|\b(car\s+)?dashboard\b|\bsteering\s+(wheel|column)\b|\b(sofa|settee|couch|loveseat|chesterfield|armchair|recliner|chaise|ottoman|stool|bench|chair|chairs|furniture|headboard|bed frame|pouffe|pouf)\b|\bupholster\w*\b|\b(wall|walls)\s+(panel|panels|panelling|leather)\b|\binterior\s+(design|decor|leather)\b|\b(industrial|machine)\s+(leather|belting)\b|\b(leather\s+)?interior\b[^.]{0,24}\b(car|vehicle|auto|truck|bus|bike|motorcycle|boat|yacht|jeep|van|aeroplane|aircraft|plane)\b|\b(leather\s+)?(seat|seats|seating)\b[^.]{0,24}\b(car|vehicle|auto|truck|bus|van|jeep|boat)\b/i;

export type Classification =
  | { suitable: true }
  | { suitable: false; reason: "not_leather_fashion"; message: string };

const UNSUITABLE_MESSAGE =
  "DREAMZ specialises in leather fashion, footwear, bags, accessories and wearable leather pieces. Please describe a fashion product you would like us to create.";

export function classifyFashionRequest(text: string): Classification {
  if (!text || !text.trim()) return { suitable: true };
  const cleaned = text.toLowerCase();
  // Guard: a "chair" can appear innocently ("church chair"? no) — but
  // leather-craft contexts like "watch strap" never collide with these terms.
  if (UNSUITABLE_REQUEST_PATTERN.test(cleaned)) {
    return { suitable: false, reason: "not_leather_fashion", message: UNSUITABLE_MESSAGE };
  }
  return { suitable: true };
}

// ── Step 2 — The Dream ───────────────────────────────────────────────

export const DREAM_THEMES = [
  "Vision",
  "Ambition",
  "Faith",
  "Peace",
  "Joy",
  "Love",
  "Hope",
  "Purpose",
  "Courage",
  "Belief",
  "Resolve",
  "Mercy",
  "Excellence",
  "Sacrifice",
  "Mentorship",
  "Legacy",
  "Discipline",
  "Resilience",
  "Wisdom",
  "Gratitude",
  "Grace",
  "Unity",
  "Relationships",
] as const;

// ── Step 4 — Design character ────────────────────────────────────────

export const CHARACTER_OPTIONS = [
  "Minimal",
  "Classic",
  "Contemporary",
  "Bold",
  "Avant-garde",
  "Executive",
  "Luxurious",
  "Rugged",
  "Soft",
  "Elegant",
  "Street-luxury",
  "Traditional influence",
  "Futuristic",
  "Understated",
] as const;

// ── Step 5 — Leather intelligence ────────────────────────────────────

/**
 * Recognised leather vocabulary. These terms may appear in briefs and in the
 * generated render prompt — the artisan language layer.
 */
export const LEATHER_TERMS = [
  "Full-grain leather",
  "Top-grain leather",
  "Smooth leather",
  "Pebbled leather",
  "Pull-up leather",
  "Patent leather",
  "Suede",
  "Nubuck",
  "Embossed leather",
  "Crocodile-texture embossed leather",
  "Woven leather",
  "Braided leather",
  "Burnished finish",
  "Patina",
  "Edge paint",
  "Welt",
  "Moc-toe",
  "Brogue perforation",
  "Piping",
  "Lining",
  "Insole",
  "Outsole",
  "Heel block",
  "Toe structure",
  "Vamp",
  "Quarter",
  "Collar",
  "Eyestay",
  "Strap",
  "Gusset",
  "Handles",
  "Flap",
  "Closure",
  "Reinforcement",
  "Hardware",
  "Buckle",
  "Zipper",
  "Rivet",
  "D-ring",
  "Stitch density",
  "Contrast stitching",
  "Hand stitching",
  "Monogram",
  "Embossing",
] as const;

/**
 * Exotic skins are only described when the house has verified availability.
 * Until an admin explicitly enables genuine exotic material, "crocodile",
 * "croc", "snake", "python", "ostrich", "alligator" and similar requests are
 * translated safely into embossed calfskin language — never hallucinated
 * availability.
 */
const EXOTIC_WORDS: Array<[RegExp, string]> = [
  [/\b(crocodiles?|croc|croco)\b(\s+(skin|hide|leather))?/i, "crocodile-texture embossed leather"],
  [/\balligators?\b(\s+(skin|hide|leather))?/i, "crocodile-texture embossed leather"],
  [/\bsnake\b|\bpythons?\b(\s+(skin|hide|leather))?/i, "python-texture embossed leather"],
  [/\bostrich\b(\s+(skin|hide|leather))?/i, "ostrich-texture embossed leather"],
  [/\bstingray\b(\s+(skin|hide|leather))?/i, "stingray-texture embossed leather"],
  [/\belephant\b(\s+(skin|hide|leather))?/i, "elephant-texture embossed leather"],
];

export function safeLeatherMaterial(input: string, exoticVerified = false): string {
  const text = (input ?? "").trim();
  if (!text) return "";
  if (exoticVerified) return text;
  let out = text;
  for (const [re, safe] of EXOTIC_WORDS) out = out.replace(re, safe);
  return out;
}

export function containsExoticRequest(input: string): boolean {
  return EXOTIC_WORDS.some(([re]) => re.test(input ?? ""));
}

// ── Step 6 — Product-specific construction questions ─────────────────

export type AtelierQuestion = {
  key: string;
  label: string;
  type: "text" | "select";
  options?: string[];
  optional?: boolean;
  placeholder?: string;
};

const FOOTWEAR_LACED_QUESTIONS: AtelierQuestion[] = [
  { key: "toeShape", label: "Toe shape", type: "select", options: ["Round", "Almond", "Square", "Pointed"] },
  { key: "soleType", label: "Sole type", type: "select", options: ["Leather sole", "Rubber sole", "Commando sole", "Chunky sole"] },
  { key: "closure", label: "Closure", type: "select", options: ["Lace-up", "Monk strap", "Buckle", "Slip-on"] },
  { key: "stitchColour", label: "Stitching", type: "select", options: ["Tonal", "Contrast"], optional: true },
  { key: "fitNotes", label: "Fit notes", type: "text", optional: true, placeholder: "Wide foot, high instep…" },
];

const FOOTWEAR_OPEN_QUESTIONS: AtelierQuestion[] = [
  { key: "toeShape", label: "Front shape", type: "select", options: ["Round", "Almond", "Square", "Pointed"] },
  { key: "soleType", label: "Sole type", type: "select", options: ["Leather sole", "Rubber sole", "Chunky sole"] },
  { key: "strapStyle", label: "Upper / strap direction", type: "select", options: ["Single strap", "Double strap", "Cross straps", "Wide upper", "Minimal upper"] },
  { key: "buckleStyle", label: "Buckle / hardware", type: "select", options: ["Minimal hardware", "Single buckle", "Double buckle", "No visible hardware"] },
  { key: "fitNotes", label: "Fit notes", type: "text", optional: true, placeholder: "Wide foot, high instep…" },
];

const BOOT_QUESTIONS: AtelierQuestion[] = [
  { key: "toeShape", label: "Toe shape", type: "select", options: ["Round", "Almond", "Square", "Pointed"] },
  { key: "soleType", label: "Sole type", type: "select", options: ["Leather sole", "Rubber sole", "Commando sole", "Chunky sole"] },
  { key: "shaftHeight", label: "Boot height", type: "select", options: ["Ankle", "Mid", "High"] },
  { key: "closure", label: "Closure", type: "select", options: ["Lace-up", "Side zip", "Chelsea elastic", "Buckle", "Pull-on"] },
  { key: "fitNotes", label: "Fit notes", type: "text", optional: true, placeholder: "Wide foot, calf notes, high instep…" },
];

const HEEL_QUESTIONS: AtelierQuestion[] = [
  { key: "toeShape", label: "Front shape", type: "select", options: ["Round", "Almond", "Square", "Pointed"] },
  { key: "heelType", label: "Heel type", type: "select", options: ["Round heel", "Block heel", "Kitten heel", "Stiletto", "Wedge", "Sculpted heel"] },
  { key: "heelHeight", label: "Heel height", type: "select", options: ["Low 2–4 cm", "Mid 5–7 cm", "High 8–10 cm", "Very high 11+ cm"] },
  { key: "closure", label: "Upper / closure", type: "select", options: ["Closed pump", "Slingback", "Ankle strap", "Buckle strap", "Open toe"] },
  { key: "fitNotes", label: "Fit notes", type: "text", optional: true, placeholder: "Size, width, comfort notes…" },
];

const BAG_QUESTIONS: AtelierQuestion[] = [
  { key: "dimensions", label: "Approximate size / depth", type: "text", placeholder: "e.g. 38 × 30 × 12 cm" },
  { key: "carriage", label: "How should it be carried?", type: "select", options: ["Top handles", "Shoulder strap", "Crossbody strap", "Handles + strap"] },
  { key: "closure", label: "Closure", type: "select", options: ["Zip", "Flap + magnet", "Turn-lock", "Drawstring", "Open top"] },
  { key: "structure", label: "Structure", type: "select", options: ["Structured", "Soft", "Semi-structured"] },
  { key: "compartments", label: "Compartments", type: "select", options: ["Single space", "Two sections", "Three sections", "Laptop + essentials"], optional: true },
];

const BELT_QUESTIONS: AtelierQuestion[] = [
  { key: "width", label: "Width", type: "select", options: ["25 mm", "30 mm", "35 mm", "40 mm"] },
  { key: "length", label: "Length / waist", type: "text", placeholder: "e.g. waist 34 in" },
  { key: "buckleStyle", label: "Buckle style", type: "select", options: ["Pin buckle", "Reversible buckle", "Hook buckle", "Box-frame buckle"] },
  { key: "hardwareFinish", label: "Hardware finish", type: "select", options: ["Brass", "Gold-tone", "Gunmetal", "Matte black", "Silver-tone"] },
  { key: "edgeFinish", label: "Edge finish", type: "select", options: ["Edge paint", "Burnished", "Hand-stitched edge"] },
];

const WEARABLE_QUESTIONS: AtelierQuestion[] = [
  { key: "fit", label: "Fit", type: "select", options: ["Tailored", "Regular", "Relaxed", "Oversized"] },
  { key: "measurements", label: "Body measurements", type: "text", optional: true, placeholder: "Chest / waist / hip or your usual size" },
  { key: "closure", label: "Closure", type: "select", options: ["Zip", "Buttons", "Snaps", "Belt / wrap", "Open"] },
  { key: "lining", label: "Lining", type: "select", options: ["Fully lined", "Partially lined", "Unlined"], optional: true },
  { key: "pockets", label: "Pocket direction", type: "select", options: ["None", "Welt pockets", "Patch pockets", "Hidden pockets"], optional: true },
];

const OTHER_QUESTIONS: AtelierQuestion[] = [
  { key: "usage", label: "How will it be used?", type: "text", placeholder: "Worn, carried, gifted, displayed…" },
  { key: "dimensions", label: "Approximate size", type: "text", optional: true, placeholder: "Dimensions or scale" },
  { key: "closure", label: "Closure / fixing", type: "text", optional: true, placeholder: "Buckle, snap, zip, none…" },
];

const ACCESSORY_QUESTIONS: AtelierQuestion[] = [
  { key: "dimensions", label: "Approximate size", type: "text", optional: true, placeholder: "Dimensions or scale" },
  { key: "hardwareFinish", label: "Hardware finish", type: "select", options: ["Brass", "Gold-tone", "Gunmetal", "Matte black", "Silver-tone"], optional: true },
  { key: "edgeFinish", label: "Edge finish", type: "select", options: ["Edge paint", "Burnished", "Hand-stitched edge"], optional: true },
];

export function constructionQuestions(category: AtelierCategory, piece: string): AtelierQuestion[] {
  if (category === "footwear") {
    if (/heel/i.test(piece)) return HEEL_QUESTIONS;
    if (/boot|chelsea/i.test(piece)) return BOOT_QUESTIONS;
    if (/mule|slide|sandal|loafer/i.test(piece)) return FOOTWEAR_OPEN_QUESTIONS;
    return FOOTWEAR_LACED_QUESTIONS;
  }
  if (category === "bags") return BAG_QUESTIONS;
  if (category === "accessories") return /belt/i.test(piece) ? BELT_QUESTIONS : ACCESSORY_QUESTIONS;
  if (category === "wearable") return WEARABLE_QUESTIONS;
  return OTHER_QUESTIONS;
}

// ── The brief ────────────────────────────────────────────────────────

export type AtelierBrief = {
  category: AtelierCategory;
  piece: string;
  meaning: string[];
  customMeaning?: string;
  story?: string;
  forWhom?: string;
  stylePreference?: string;
  designAudience?: string;
  dreamGoal?: string;
  paintingChoice?: string;
  paintingNotes?: string;
  occasion?: string;
  sizeOrMeasurements?: string;
  neededBy?: string;
  feel: string[];
  primaryColour?: string;
  secondaryColour?: string;
  pattern?: string;
  texture?: string;
  material?: string;
  construction: Record<string, string>;
  personalisation?: { type: string; text?: string };
  inspirationNotes?: string;
  budgetNaira?: string;
};

function list(values: string[], joiner = ", "): string {
  return values.filter(Boolean).join(joiner);
}

function meaningPhrase(b: AtelierBrief): string {
  const words = list(b.meaning);
  if (b.customMeaning?.trim()) {
    return words ? `${words} — ${b.customMeaning.trim()}` : b.customMeaning.trim();
  }
  return words || "personal significance chosen by the client";
}

function effectiveSurfaceLabel(b: AtelierBrief): string {
  if (b.texture?.trim()) return b.texture.trim();
  if (/suede/i.test(b.material || "")) return "Natural suede nap";
  if (/nubuck/i.test(b.material || "")) return "Natural nubuck nap";
  return "not selected";
}

/**
 * DREAMZ design DNA — carried by every prompt. Distinctive, not noisy.
 */
const DREAMZ_DNA = [
  "DREAMZ design DNA: considered colour, strong leather craftsmanship, a clear silhouette and one memorable but controlled detail.",
  "Premium Nigerian fashion-house sensibility; realistic, buildable construction; balance between individuality and wearability.",
  "Distinctive, not noisy: no random decorative clutter, no unnecessary straps or hardware, no impossible construction.",
].join(" ");

const REALISM_REQUIREMENTS = [
  "One physical leather fashion product only.",
  "Photorealistic craftsmanship with correct proportions and realistic gravity.",
  "The product rests naturally on the surface — never floating.",
  "Visible stitching appropriate to the construction, believable leather grain, realistic sole/hardware/lining.",
  "Clean editorial studio photography.",
  "Neutral ivory, warm white or context-appropriate minimal background.",
].join(" ");

const NEGATIVE_CONSTRAINTS = [
  "No text around the product, no price, no marketing poster, no watermark.",
  "No random logo, no fake labels, no third-party brand marks.",
  "No additional products unless explicitly requested.",
  "No human model unless the customer requested one.",
  "No impossible seams, no floating hardware, no malformed buckles, no extra straps, no duplicated components.",
  "No excessive colours unless the customer deliberately selected them.",
  "No excessive AI ornamentation.",
].join(" ");

/** DREAMZ branding appears only where physically realistic — never oversized. */
const BRANDING_NOTE =
  "Do not add DREAMZ branding unless the client explicitly selected or requested it. If requested, keep it subtle: a small embossed mark, an insole stamp, a discreet hardware mark or the DREAMZ lightning motif — never an oversized logo covering the product.";

// ── Output 1 — Design summary ────────────────────────────────────────

const CONSTRUCTION_LABELS: Record<string, string> = {
  toeShape: "Toe shape",
  soleType: "Sole",
  heelType: "Heel",
  heelHeight: "Heel height",
  closure: "Closure",
  buckleStyle: "Buckle",
  hardwareFinish: "Hardware finish",
  stitchColour: "Stitching",
  edgeFinish: "Edge finish",
  fit: "Fit",
  shaftHeight: "Shaft height",
  ankleProfile: "Ankle profile",
  strapLayout: "Strap layout",
  dimensions: "Dimensions / size",
  carriage: "Carry style",
  structure: "Structure",
  compartments: "Compartments",
  width: "Width",
  length: "Length / waist",
  measurements: "Measurements",
  lining: "Lining",
  pockets: "Pockets",
  usage: "Use",
};

function constructionDetailLines(b: AtelierBrief): string[] {
  return Object.entries(b.construction ?? {})
    .filter(([, value]) => typeof value === "string" && value.trim())
    .map(([key, value]) => `• ${CONSTRUCTION_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (m) => m.toUpperCase())}: ${value}`);
}

export function buildDesignSummary(b: AtelierBrief): string {
  const detailLines = constructionDetailLines(b);
  const lines = [
    "DREAMZ DESIGN SPECIFICATION",
    "",
    "PRODUCT",
    `• Piece: ${b.piece}`,
    `• Category: ${b.category}`,
    `• Intended meaning: ${meaningPhrase(b)}`,
    `• Design character: ${list(b.feel) || "not specified"}`,
    b.forWhom ? `• Designed for: ${b.forWhom}` : "",
    b.stylePreference ? `• Style preference: ${b.stylePreference}` : "",
    b.designAudience ? `• Design audience: ${b.designAudience}` : "",
    b.dreamGoal ? `• The dream: ${b.dreamGoal}` : "",
    b.paintingChoice === "yes" ? `• Artwork / painting: Yes${b.paintingNotes ? " — " + b.paintingNotes : ""}` : "• Artwork / painting: No",
    b.occasion ? `• Occasion: ${b.occasion}` : "",
    "",
    "MATERIAL & COLOUR",
    `• Leather base: ${b.material ? safeLeatherMaterial(b.material) : "not selected"}`,
    `• Surface / finish: ${effectiveSurfaceLabel(b)}`,
    `• Primary colour: ${b.primaryColour || "not selected"}`,
    `• Accent colour: ${b.secondaryColour || "none selected"}`,
    b.pattern ? `• Pattern / trim direction: ${b.pattern}` : "",
    "",
    "CONSTRUCTION",
    ...(detailLines.length ? detailLines : ["• No additional construction options selected. Keep the piece standard and buildable for its product type."]),
    "",
    "PERSONALISATION",
    `• ${describePersonalisation(b)}`,
    "",
    "FIT / PRACTICAL DETAILS",
    `• Size / measurements: ${b.sizeOrMeasurements || "not supplied"}`,
    `• Needed by: ${b.neededBy || "not supplied"}`,
    `• Budget: ${b.budgetNaira ? `₦${b.budgetNaira}` : "not supplied"}`,
  ];
  if ((b.story || "").trim()) lines.push("", "DESIGN STORY", `• ${b.story!.trim()}`);
  if (b.inspirationNotes) lines.push("", "REFERENCE / INSPIRATION NOTES", `• ${b.inspirationNotes}`);
  return lines.filter((line) => line !== "").join("\n").replace(/\n{3,}/g, "\n\n");
}

function summariseConstruction(b: AtelierBrief): string {
  const entries = Object.entries(b.construction ?? {}).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return "Standard DREAMZ construction; final details confirmed with the artisan.";
  return entries.map(([k, v]) => `${k}: ${v}`).join("; ");
}

function describePersonalisation(b: AtelierBrief): string {
  const p = b.personalisation;
  if (!p || !p.type || p.type === "none") return "None — clean piece.";
  return `${p.type}${p.text ? `: "${p.text}"` : ""} (applied only if physically appropriate)`;
}

// ── Output 2 — Render prompt (sections A–M) ──────────────────────────

export const RENDER_PROMPT_SECTIONS = [
  "A. PRODUCT IDENTITY",
  "B. SILHOUETTE",
  "C. LEATHER & MATERIAL",
  "D. COLOUR SYSTEM",
  "E. CONSTRUCTION",
  "F. HARDWARE",
  "G. STITCHING & FINISH",
  "H. PERSONALISATION",
  "I. CAMERA / VIEW",
  "J. LIGHTING",
  "K. BACKGROUND",
  "L. REALISM REQUIREMENTS",
  "M. NEGATIVE CONSTRAINTS",
  "N. FINAL IMAGE DELIVERABLE",
] as const;

export function buildRenderPrompt(b: AtelierBrief): string {
  const material = b.material
    ? safeLeatherMaterial(b.material)
    : "Material not selected — use a neutral realistic leather surface only as a rendering placeholder; do not invent or name a leather type.";
  const effectiveSurface = effectiveSurfaceLabel(b);
  const finish = (effectiveSurface || b.material || "").toLowerCase();
  const grain = /suede|nubuck/i.test(finish)
    ? "matte velvety nap with natural texture variation"
    : /pebbl/i.test(finish)
      ? "distinct pebbled grain with natural depth"
      : /emboss/i.test(finish)
        ? "clearly defined embossed texture, crisp and regular"
        : /patent|gloss/i.test(finish)
          ? "glossy patent finish with clean reflections"
          : /pull-up|waxy/i.test(finish)
            ? "waxy, character-rich surface with controlled tonal pull-up at bends"
            : "fine natural grain with subtle burnished depth";
  const lockedSelections = [
    `Product: ${b.piece}`,
    `Category: ${b.category}`,
    b.material ? `Material selected: ${safeLeatherMaterial(b.material)}` : "Material selected: none",
    `Texture / finish selected: ${effectiveSurface}`,
    b.primaryColour ? `Primary colour selected: ${b.primaryColour}` : "Primary colour selected: none",
    b.secondaryColour ? `Accent colour selected: ${b.secondaryColour}` : "Accent colour selected: none",
    b.designAudience ? `Design audience selected: ${b.designAudience}` : "Design audience selected: not specified",
    b.dreamGoal ? `Dream/story selected: ${b.dreamGoal}` : "Dream/story selected: not specified",
    `Painting / artwork selected: ${b.paintingChoice === "yes" ? "yes" : "no"}${b.paintingChoice === "yes" && b.paintingNotes ? " — " + b.paintingNotes : ""}`,
    Object.keys(b.construction || {}).length
      ? ["Construction selected:", ...constructionDetailLines(b)].join("\n")
      : "Construction selections: none beyond the chosen product type",
    b.personalisation && b.personalisation.type !== "none"
      ? `Personalisation selected: ${describePersonalisation(b)}`
      : "Personalisation selected: none",
  ].join("\n");

  const sourceOfTruth = [
    "SOURCE OF TRUTH — LOCKED CLIENT SELECTIONS",
    lockedSelections,
    "",
    "NON-NEGOTIABLE GENERATION RULE:",
    "Translate only the selections above and the explicit brief below into professional leathercraft language.",
    "Do not invent a colour, material, texture, strap, buckle, heel, sole, trim, closure, ornament, logo, monogram or extra product feature that the client did not select.",
    "If a field is unspecified, keep that area visually neutral and construction-standard rather than choosing a new named option.",
    "Reference images, when supplied, are inspiration for proportion or direction only; do not copy third-party branding, logos or protected ornaments.",
    "The output must remain physically manufacturable by a real leather artisan.",
  ].join("\n");

  const sections: Array<[string, string]> = [
    [
      "A. PRODUCT IDENTITY",
      `A single handcrafted ${b.piece.toLowerCase()} in luxury leather, made by the DREAMZ atelier — a premium Nigerian leather fashion house. Intended meaning: ${meaningPhrase(b)}.`,
    ],
    [
      "B. SILHOUETTE",
      `Clear, confident ${b.piece.toLowerCase()} silhouette${b.feel.length ? `; overall character: ${list(b.feel).toLowerCase()}` : ""}. ${b.designAudience ? "Design direction: " + b.designAudience + ". " : ""}Preserve the defining geometry of a real ${b.piece.toLowerCase()}; keep all proportions physically plausible, balanced and wearable. Use the selected construction choices below to determine the visible shape. Do not add a new signature feature that was not selected.`,
    ],
    [
      "C. LEATHER & MATERIAL",
      `${material}. Selected finish: ${effectiveSurface}. Surface: ${grain}. Realistic thickness and stiffness appropriate to the piece; edge treatment finished with edge paint or burnishing as appropriate.`,
    ],
    [
      "D. COLOUR SYSTEM",
      b.primaryColour
        ? `Primary colour: ${b.primaryColour}.${b.secondaryColour ? ` Accent colour: ${b.secondaryColour}.` : " No accent colour selected."} Preserve the selected colour relationship exactly; do not introduce another colour.`
        : "No colour selected. Keep the render chromatically neutral and do not choose a named colour on the client's behalf.",
    ],
    [
      "E. CONSTRUCTION",
      `${constructionDetailLines(b).length ? constructionDetailLines(b).join(" ") : "No extra construction options selected."} Translate every selected component literally into the visible product. Correct panel assembly for a real ${b.piece.toLowerCase()}: believable seams, reinforcements, attachment points and edge finishing; construction must be something an artisan could actually pattern, cut, stitch and assemble.`,
    ],
    [
      "F. HARDWARE",
      b.construction.hardwareFinish || b.construction.buckleStyle
        ? `${[b.construction.buckleStyle, b.construction.hardwareFinish].filter(Boolean).join(", ")}. Realistic, correctly formed hardware proportioned to the piece.`
        : "No decorative hardware was selected. Use only unavoidable standard functional hardware required for the chosen product type; do not invent a buckle, zip, clasp or ornament.",
    ],
    [
      "G. STITCHING & FINISH",
      `Even stitch density appropriate to the construction${b.construction.stitchColour === "Contrast" ? " with deliberate contrast stitching" : " in tonal thread"}. Clean edges, refined finishing, natural leather patina at wear points.`,
    ],
    [
      "H. PERSONALISATION",
      describePersonalisation(b) === "None — clean piece."
        ? `No personalisation; a clean piece. ${BRANDING_NOTE}`
        : `${describePersonalisation(b)}. Any text is small, precise and physically realistic (embossed, stamped or engraved as appropriate). ${BRANDING_NOTE}`,
    ],
    [
      "I. CAMERA / VIEW",
      "Three-quarter product view at eye level with the piece, plus clarity on the signature detail; product fills the frame with breathing space.",
    ],
    [
      "J. LIGHTING",
      "Soft, directional studio lighting with gentle shadows that reveal leather grain and construction; no harsh blowouts.",
    ],
    [
      "K. BACKGROUND",
      "Neutral ivory or warm-white seamless studio background; subtle natural floor shadow anchoring the piece.",
    ],
    ["L. REALISM REQUIREMENTS", `${REALISM_REQUIREMENTS} ${DREAMZ_DNA}`],
    ["M. NEGATIVE CONSTRAINTS", NEGATIVE_CONSTRAINTS],
    [
      "N. FINAL IMAGE DELIVERABLE",
      "Generate one finished photorealistic product image, not a sketch, mood board, collage or technical drawing. Show the complete product fully inside frame, large enough to inspect construction. Preserve every selected material, finish, colour and component exactly. If a selected detail is physically visible from the chosen angle, make it legible. Do not show captions, labels, arrows, specification text, packaging or unrelated props."
    ],
  ];
  return [sourceOfTruth, ...sections.map(([title, body]) => `${title}\n${body}`)].join("\n\n");
}

// ── Output 3 — Artisan production brief ──────────────────────────────

export function buildArtisanBrief(b: AtelierBrief): string {
  const material = b.material ? safeLeatherMaterial(b.material) : null;
  const lines = [
    "ARTISAN PRODUCTION BRIEF — DREAMZ LEATHER ATELIER",
    `Product type: ${b.piece} (${b.category})`,
    `Upper/body leather: ${material ?? "AT ARTELIER DISCRETION — recommend and confirm with client"} [ARTISAN CONFIRMATION REQUIRED]`,
    `Leather finish: ${effectiveSurfaceLabel(b)} [ARTISAN CONFIRMATION REQUIRED]`,
    "Lining: appropriate to the piece; confirm colour and material [ARTISAN CONFIRMATION REQUIRED]",
    `Sole/base: ${b.construction.soleType || "n/a for this piece"}`,
    `Major parts: standard pattern for a ${b.piece.toLowerCase()}, adjusted to the silhouette notes below`,
    `Stitching: ${b.construction.stitchColour === "Contrast" ? "contrast stitching" : "tonal stitching"}, even stitch density`,
    `Hardware: ${[b.construction.buckleStyle, b.construction.hardwareFinish].filter(Boolean).join(", ") || "minimal, match house standards"} [ARTISAN CONFIRMATION REQUIRED]`,
    `Closure: ${b.construction.closure || "per standard pattern"}`,
    `Edge finish: ${b.construction.edgeFinish || "edge paint or burnished — confirm"}`,
    `Measurements: ${b.sizeOrMeasurements || b.construction.dimensions || b.construction.measurements || "TO BE CONFIRMED WITH CLIENT"} [ARTISAN CONFIRMATION REQUIRED]`,
    `Colour placements: primary ${b.primaryColour || "open"}${b.secondaryColour ? `, accent ${b.secondaryColour}` : ""}`,
    `Personalisation: ${describePersonalisation(b)} [ARTISAN CONFIRMATION REQUIRED — verify feasibility]`,
    `Production notes: client meaning — ${meaningPhrase(b)}. ${b.story ? `Client story: ${b.story}` : ""}`,
    `Deadline: ${b.neededBy || "not specified"} [ARTISAN CONFIRMATION REQUIRED — confirm timeline]`,
    "Details requiring artisan confirmation: leather availability, hardware sourcing, personalisation feasibility, exact measurements and timeline.",
  ];
  return lines.join("\n");
}

// ── Output 4 — Quote brief ───────────────────────────────────────────

export function buildQuoteBrief(
  b: AtelierBrief,
  refs: { requestNumber: string; renderPrompt: string; artisanBrief: string; designSummary: string; catalogueIds: number[]; inspirationCount: number },
): Record<string, unknown> {
  return {
    requestNumber: refs.requestNumber,
    selections: {
      category: b.category,
      piece: b.piece,
      meaning: meaningPhrase(b),
      forWhom: b.forWhom ?? null,
      stylePreference: b.stylePreference ?? null,
      occasion: b.occasion ?? null,
      sizeOrMeasurements: b.sizeOrMeasurements ?? null,
      neededBy: b.neededBy ?? null,
      feel: b.feel,
      primaryColour: b.primaryColour ?? null,
      secondaryColour: b.secondaryColour ?? null,
      pattern: b.pattern ?? null,
      texture: b.texture ?? null,
      material: b.material ?? null,
      construction: b.construction,
      personalisation: b.personalisation ?? { type: "none" },
      inspirationNotes: b.inspirationNotes ?? null,
      inspirationFiles: refs.inspirationCount,
      budgetNaira: b.budgetNaira ?? null,
    },
    aiDesignSummary: refs.designSummary,
    renderPromptSnapshot: refs.renderPrompt,
    artisanBriefSnapshot: refs.artisanBrief,
    budget: b.budgetNaira ?? null,
    deadline: b.neededBy ?? null,
    recommendedCatalogueReferences: refs.catalogueIds,
    status: "new",
  };
}

// ── Model-specific prompt support ────────────────────────────────────

export type PromptFormat = "universal" | "chatgpt" | "gemini" | "grok";

/**
 * The design specification is identical for every destination; only minor
 * formatting changes per model. Private customer information is NEVER part
 * of the prompt — the builder only receives design fields.
 */
export function formatPromptFor(prompt: string, format: PromptFormat): string {
  if (format === "universal") return prompt;
  const header =
    format === "chatgpt"
      ? "Generate a single photorealistic product image following this brief exactly:"
      : format === "gemini"
        ? "Create one photorealistic product image. Follow every constraint below:"
        : "Render one photorealistic product image. Obey all constraints:";
  return `${header}\n\n${prompt}`;
}

// ── Privacy ──────────────────────────────────────────────────────────

/**
 * Defence in depth: strip anything that looks like customer contact
 * information before a prompt leaves the platform. Names typed as part of a
 * physical monogram are intentional and kept.
 */
export function stripPrivateInfo(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[redacted]")
    .replace(/(\+?\d[\d\s-]{7,}\d)/g, "[redacted]");
}
