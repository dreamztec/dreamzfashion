/**
 * Design templates for the "Design Your Dream Outfit" workspace.
 *
 * A template lists the named, independently choosable parts of a real
 * DREAMZ design and the options the workshop can make. Server-side design
 * validation uses the same definition, so a saved design can only contain
 * options listed here.
 *
 * 3D status: no authored GLB/glTF model with separately named meshes exists
 * for any DREAMZ product yet, so every template is `has3d: false` and the
 * workspace presents an honestly labelled written specification. When a
 * faithful model arrives, set `model3d` (URL + mesh name per part) and bump
 * `modelVersion`; saved briefs keep their version.
 *
 * Geometry (shaft height, heel height) is deliberately NOT offered: those
 * changes need authored geometry variants, not stretched imagery.
 */

export type DesignPart = { key: string; label: string; defaultColour: string; materials: string[] };

export type DesignTemplate = {
  productSku: string;
  modelId: string;
  modelVersion: string;
  has3d: boolean;
  model3d: null | { url: string; meshByPart: Record<string, string> };
  title: string;
  parts: DesignPart[];
  components: Array<{ key: string; label: string; options: string[] }>;
  sizes: string[];
};

export const LEATHER_PALETTE: Array<{ name: string; hex: string }> = [
  { name: "Burnt Orange", hex: "#C8512A" },
  { name: "Sky Blue", hex: "#4FA3D9" },
  { name: "Royal Blue", hex: "#24459A" },
  { name: "Navy", hex: "#1F2A4A" },
  { name: "Burgundy", hex: "#7A1F35" },
  { name: "Oxblood", hex: "#5A1A1F" },
  { name: "Mustard", hex: "#D9A53A" },
  { name: "Tan", hex: "#C98B4E" },
  { name: "Cognac", hex: "#9A5427" },
  { name: "Chocolate Brown", hex: "#4E3024" },
  { name: "Plum Brown", hex: "#4A2A33" },
  { name: "Forest Green", hex: "#2F5A3C" },
  { name: "Emerald", hex: "#1F7A58" },
  { name: "Cream", hex: "#EFE4CF" },
  { name: "White", hex: "#F6F4EF" },
  { name: "Charcoal Black", hex: "#2A2A2C" },
  { name: "Black", hex: "#141414" },
];

const LEATHERS = ["Smooth leather", "Pebbled leather", "Suede"];

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    productSku: "DFK-FTW-001",
    modelId: "boot-of-many-colours",
    modelVersion: "brief-1",
    has3d: false,
    model3d: null,
    title: "Boot of Many Colours",
    // Panels as photographed on the approved product image (left boot).
    parts: [
      { key: "toe_cap", label: "Toe cap", defaultColour: "Burnt Orange", materials: LEATHERS.slice(0, 2) },
      { key: "front_vamp", label: "Front vamp panel", defaultColour: "Sky Blue", materials: LEATHERS.slice(0, 2) },
      { key: "cross_vamp", label: "Cross-vamp panel", defaultColour: "Burgundy", materials: LEATHERS.slice(0, 2) },
      { key: "instep_panel", label: "Instep panel", defaultColour: "Mustard", materials: LEATHERS.slice(0, 2) },
      { key: "rear_vamp", label: "Rear vamp panel", defaultColour: "Chocolate Brown", materials: LEATHERS.slice(0, 2) },
      { key: "heel_quarter", label: "Heel quarter", defaultColour: "Navy", materials: LEATHERS.slice(0, 2) },
      { key: "shaft", label: "Shaft", defaultColour: "Charcoal Black", materials: LEATHERS },
      { key: "eyestay", label: "Eyestay (lacing panel)", defaultColour: "Plum Brown", materials: LEATHERS.slice(0, 2) },
      { key: "collar", label: "Padded collar", defaultColour: "Tan", materials: LEATHERS.slice(0, 2) },
    ],
    components: [
      { key: "sole", label: "Sole", options: ["Tan lug sole (as photographed)", "Black lug sole"] },
      { key: "laces", label: "Laces", options: ["Tan waxed (as photographed)", "Chocolate brown waxed", "Black waxed"] },
      { key: "hardware", label: "Eyelet hardware", options: ["Brass (as photographed)", "Gunmetal", "Black"] },
    ],
    sizes: ["40", "41", "42", "43", "44", "45", "46"],
  },
];

export function templateForSku(sku: string | null | undefined): DesignTemplate | null {
  return DESIGN_TEMPLATES.find((t) => t.productSku === sku) ?? null;
}

export function templateForModel(modelId: string | null | undefined): DesignTemplate | null {
  return DESIGN_TEMPLATES.find((t) => t.modelId === modelId) ?? null;
}

export type DesignSelection = {
  parts: Record<string, string>;
  materials: Record<string, string>;
  components: Record<string, string>;
  size: string | null;
};

export function defaultSelection(t: DesignTemplate): DesignSelection {
  return {
    parts: Object.fromEntries(t.parts.map((p) => [p.key, p.defaultColour])),
    materials: Object.fromEntries(t.parts.map((p) => [p.key, p.materials[0]])),
    components: Object.fromEntries(t.components.map((c) => [c.key, c.options[0]])),
    size: null,
  };
}

/** Returns a list of problems; empty means the selection is valid. */
export function validateSelection(t: DesignTemplate, s: DesignSelection): string[] {
  const errors: string[] = [];
  const colourNames = new Set(LEATHER_PALETTE.map((c) => c.name));
  for (const part of t.parts) {
    const colour = s.parts[part.key];
    if (!colour || !colourNames.has(colour)) errors.push(`Choose a listed colour for ${part.label}.`);
    const material = s.materials[part.key];
    if (!material || !part.materials.includes(material)) errors.push(`Choose a listed material for ${part.label}.`);
  }
  for (const key of Object.keys(s.parts)) if (!t.parts.some((p) => p.key === key)) errors.push(`Unknown part: ${key}.`);
  for (const key of Object.keys(s.materials)) if (!t.parts.some((p) => p.key === key)) errors.push(`Unknown part: ${key}.`);
  for (const c of t.components) {
    if (!c.options.includes(s.components[c.key] ?? "")) errors.push(`Choose a listed option for ${c.label}.`);
  }
  for (const key of Object.keys(s.components)) if (!t.components.some((c) => c.key === key)) errors.push(`Unknown option: ${key}.`);
  if (s.size !== null && !t.sizes.includes(s.size)) errors.push("Choose a listed size.");
  return errors;
}

/** Flat, artisan-readable summary carried into cart and order lines. */
export function selectionSummary(t: DesignTemplate, s: DesignSelection): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of t.parts) out[p.label] = `${s.parts[p.key]} — ${s.materials[p.key]}`;
  for (const c of t.components) out[c.label] = s.components[c.key];
  if (s.size) out["Size (EU)"] = s.size;
  return out;
}
