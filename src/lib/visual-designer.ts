import { studioIllustration } from "./studio-illustrations";
import type { AtelierCategory } from "@/lib/atelier";
import type { DesignerPlanId } from "@/lib/designer-plans";

export type VisualPiece = {
  category: AtelierCategory;
  piece: string;
  image: string;
  note: string;
};

export type VisualOption = {
  id: string;
  label: string;
  note: string;
  image?: string;
  hex?: string;
  minPlan?: DesignerPlanId;
  bestFor?: string;
  credit?: string;
};

function svgCard(label: string, _kind: string, accent?: string): string {
  return studioIllustration(label, accent);
}
function pieceReferenceImage(piece: string): string { return studioIllustration(piece); }

const PIECES: Array<[AtelierCategory, string, string]> = [
  ["footwear","Oxford","Structured lace-up shoe"],
  ["footwear","Derby","Open-lacing formal or smart-casual shoe"],
  ["footwear","Loafer","Slip-on shoe with clean upper"],
  ["footwear","Boot","Ankle or higher leather boot"],
  ["footwear","Chelsea Boot","Pull-on boot with clean side profile"],
  ["footwear","Mule","Open-back leather footwear"],
  ["footwear","Slide","Easy open footwear with one or more straps"],
  ["footwear","Sandal","Open construction with strap freedom"],
  ["footwear","Heel","Women's heeled leather footwear"],
  ["footwear","Other leather footwear","Start from a neutral footwear direction"],
  ["bags","Briefcase","Structured work bag"],
  ["bags","Tote","Open or zip-top everyday carry"],
  ["bags","Handbag","Structured or soft personal carry"],
  ["bags","Clutch","Compact hand-held bag"],
  ["bags","Crossbody","Compact bag worn across the body"],
  ["bags","Backpack","Two-strap back carry"],
  ["bags","Laptop Bag","Protective work and device carry"],
  ["bags","Travel Bag","Higher-capacity travel carry"],
  ["bags","Pouch","Compact wrist or hand carry"],
  ["bags","Purse","Compact personal bag"],
  ["bags","Other leather bag","Start from a neutral bag direction"],
  ["accessories","Belt","Leather belt and buckle system"],
  ["accessories","Wallet","Folded or card-based leather wallet"],
  ["accessories","Card Holder","Slim card carry"],
  ["accessories","Passport Holder","Travel document cover"],
  ["accessories","Bracelet/Cuff","Small leather statement piece"],
  ["accessories","Watch Strap","Personal leather watch strap"],
  ["accessories","Key Holder","Compact key carry"],
  ["accessories","Leather jewellery/accessory","Small leather accessory"],
  ["accessories","Other leather accessory","Start from a neutral accessory direction"],
  ["wearable","Jacket","Leather outerwear"],
  ["wearable","Leather Jacket","Leather outerwear"],
  ["wearable","Trouser","Tailored or relaxed leather bottom"],
  ["wearable","Leather Trouser / Pants","Tailored or relaxed leather bottom"],
  ["wearable","Leather Shirt","Structured or relaxed leather shirt"],
  ["wearable","Leather T-shirt","Minimal leather tee silhouette"],
  ["wearable","Skirt","Leather skirt silhouette"],
  ["wearable","Vest","Layered leather top"],
  ["wearable","Fashion harness","Wearable leather harness"],
  ["wearable","Hat","Leather headwear"],
  ["wearable","Other wearable leather piece","Start from a neutral wearable direction"],
  ["other","Other Leather Fashion Piece","Describe another leather fashion item"],
];

export const PIECE_VISUALS: VisualPiece[] = PIECES.map(([category,piece,note]) => ({
  category,
  piece,
  note,
  image: pieceReferenceImage(piece),
}));

export function categoryVisual(category: AtelierCategory): string {
  return studioIllustration({footwear: "Oxford", bags: "Tote", accessories: "Belt", wearable: "Jacket", other: "Leather sample"}[category]);
}

export const MATERIAL_VISUALS: VisualOption[] = [
  {
    id: "full-grain",
    label: "Full-grain leather",
    note: "Premium hide grade with the natural grain surface left intact. Marks and grain vary from hide to hide.",
    image: studioIllustration("Full-grain leather"),
    bestFor: "Premium shoes, boots, structured bags, belts and long-life accessories.",
    credit: "Illustrative surface sample; actual leather is confirmed before production.",
  },
  {
    id: "top-grain",
    label: "Top-grain leather",
    note: "Grain-side leather that may be lightly corrected for a cleaner, more even appearance.",
    image: studioIllustration("Top-grain leather"),
    bestFor: "Refined footwear, bags, wallets and wearable leather.",
    credit: "Illustrative surface sample; actual leather is confirmed before production.",
  },
  {
    id: "suede",
    label: "Suede",
    note: "Soft leather with a visible velvety nap. The nap can change shade when brushed.",
    image: studioIllustration("Suede"),
    bestFor: "Loafers, mules, selected boots, bags and soft accent panels.",
    credit: "Illustrative surface sample; actual leather is confirmed before production.",
  },
  {
    id: "nubuck",
    label: "Nubuck",
    note: "Grain-side leather lightly buffed to create a fine, velvety surface.",
    image: studioIllustration("Nubuck"),
    bestFor: "Premium casual boots, loafers, bags and tactile statement panels.",
    credit: "Illustrative surface sample; actual leather is confirmed before production.",
  },
];

export const FINISH_VISUALS: VisualOption[] = [
  {
    id: "smooth",
    label: "Smooth",
    note: "Clean, even surface with a formal and minimal appearance.",
    image: studioIllustration("Smooth"),
    bestFor: "Oxford shoes, loafers, dress boots, belts and structured bags.",
  },
  {
    id: "pebbled",
    label: "Pebbled",
    note: "Visible grain texture that adds depth and helps disguise everyday scuffs.",
    image: studioIllustration("Pebbled"),
    bestFor: "Bags, wallets, casual footwear and high-touch accessories.",
  },
  {
    id: "pull-up",
    label: "Pull-up / waxy",
    note: "Oil- or wax-rich leather that becomes lighter where it bends or stretches, creating character.",
    image: studioIllustration("Pull-up / waxy"),
    bestFor: "Rugged boots, travel bags, briefcases and heritage-style pieces.",
    credit: "Illustrative surface sample; actual leather is confirmed before production.",
  },
  {
    id: "patent",
    label: "Patent gloss",
    note: "High-gloss coated finish for a polished statement look.",
    image: studioIllustration("Patent gloss"),
    bestFor: "Heels, formal footwear and controlled accent panels.",
    credit: "Illustrative surface sample; actual leather is confirmed before production.",
  },
  {
    id: "embossed",
    label: "Embossed",
    note: "Pattern pressed into the surface. DREAMZ confirms the actual embossing plate or hide available.",
    image: studioIllustration("Embossed"),
    bestFor: "Bags, belts, footwear panels and statement accessories.",
    credit: "Illustrative surface sample; actual leather is confirmed before production.",
  },
];

export const COLOUR_VISUALS: VisualOption[] = [
  ["black","Black","#151515"],["espresso","Espresso","#35251e"],["chocolate","Chocolate Brown","#513225"],
  ["cognac","Cognac","#9a5427"],["tan","Tan","#c88b4d"],["oxblood","Oxblood","#5b1b22"],
  ["burgundy","Burgundy","#7b2037"],["navy","Navy","#1e2947"],["royal-blue","Royal Blue","#23479c"],
  ["sky-blue","Sky Blue","#65a9d9"],["forest","Forest Green","#2e5b3c"],["emerald","Emerald","#217b59"],
  ["olive","Olive","#6d6b38"],["cream","Cream","#eee1c8"],["ivory","Ivory","#f5f0e5"],
  ["white","White","#f7f6f2"],["grey","Slate Grey","#72777d"],["orange","Burnt Orange","#c85b2e"],
].map(([id,label,hex]) => ({
  id,
  label,
  hex,
  note: "Colour direction — final dye/hide tone is confirmed by the atelier.",
  image: studioIllustration("Leather sample", hex),
}));

export const TOE_VISUALS: VisualOption[] = [
  { id:"round", label:"Round", note:"Comfortable, classic front. Isolated shape illustration.", image:studioIllustration("Round") },
  { id:"almond", label:"Almond", note:"Soft taper between round and pointed. Isolated shape illustration.", image:studioIllustration("Almond") },
  { id:"square", label:"Square", note:"Sharper contemporary front. Isolated shape illustration.", image:studioIllustration("Square") },
  { id:"pointed", label:"Pointed", note:"Longer, sharper fashion profile. Isolated shape illustration.", image:studioIllustration("Pointed") },
];

export const SOLE_VISUALS: VisualOption[] = [
  { id:"leather", label:"Leather sole", note:"Slim, formal and refined. Isolated component illustration.", image:studioIllustration("Leather sole") },
  { id:"rubber", label:"Rubber sole", note:"Everyday grip and easier wet-weather wear. Isolated component illustration.", image:studioIllustration("Rubber sole") },
  { id:"commando", label:"Commando sole", note:"Deeper tread for boots and rugged footwear. Isolated component illustration.", image:studioIllustration("Commando sole") },
  { id:"chunky", label:"Chunky sole", note:"Thicker modern profile. Isolated component illustration.", image:studioIllustration("Chunky sole") },
];

export const HEEL_VISUALS: VisualOption[] = [
  { id:"round", label:"Round heel", note:"Rounded heel profile. Isolated heel illustration; final proportions confirmed before production.", image:studioIllustration("Round heel") },
  { id:"block", label:"Block heel", note:"Stable, broad heel base. Isolated heel illustration.", image:studioIllustration("Block heel") },
  { id:"kitten", label:"Kitten heel", note:"Low slim heel. Isolated heel illustration.", image:studioIllustration("Kitten heel") },
  { id:"stiletto", label:"Stiletto", note:"Slim high heel. Isolated heel illustration.", image:studioIllustration("Stiletto"), minPlan:"creator" },
  { id:"wedge", label:"Wedge", note:"Continuous heel-to-sole mass. Isolated heel illustration.", image:studioIllustration("Wedge") },
  { id:"sculpted", label:"Sculpted heel", note:"Art-led heel shape, subject to engineering review. Isolated heel illustration.", image:studioIllustration("Sculpted heel"), minPlan:"creator" },
];

export const HARDWARE_VISUALS: VisualOption[] = [
  { id:"minimal", label:"Minimal hardware", note:"Keep fittings quiet and functional.", image:svgCard("Minimal hardware","buckle") },
  { id:"pin", label:"Pin buckle", note:"Classic prong buckle.", image:svgCard("Pin buckle","buckle") },
  { id:"single", label:"Single buckle", note:"One controlled buckle detail.", image:svgCard("Single buckle","buckle","#9a743c") },
  { id:"double", label:"Double buckle", note:"Two balanced fastening points.", image:svgCard("Double buckle","buckle","#9a743c"), minPlan:"creator" },
  { id:"hook", label:"Hook buckle", note:"Minimal hook-style fastening.", image:svgCard("Hook buckle","buckle","#3d3d3d") },
  { id:"box", label:"Box-frame buckle", note:"Structured rectangular buckle.", image:svgCard("Box-frame buckle","buckle","#575757") },
];

export const CONSTRUCTION_VISUALS: Record<string, VisualOption> = Object.fromEntries(
  [
    ...TOE_VISUALS,
    ...SOLE_VISUALS,
    ...HEEL_VISUALS,
    ...HARDWARE_VISUALS,
    { id:"lace", label:"Lace-up", note:"Traditional lacing.", image:svgCard("Lace-up","closure") },
    { id:"slip", label:"Slip-on", note:"No fastening required.", image:svgCard("Slip-on","closure") },
    { id:"monk", label:"Monk strap", note:"Strap-and-buckle closure.", image:svgCard("Monk strap","closure") },
    { id:"buckle", label:"Buckle", note:"Buckle-fastened closure.", image:svgCard("Buckle closure","closure") },
    { id:"button", label:"Button", note:"Button fastening.", image:svgCard("Button closure","closure") },
    { id:"zip", label:"Zip", note:"Zip closure.", image:svgCard("Zip closure","closure") },
    { id:"flap", label:"Flap + magnet", note:"Fold-over flap with magnetic fastening.", image:svgCard("Flap + magnet","bag") },
    { id:"turn", label:"Turn-lock", note:"Structured rotating lock.", image:svgCard("Turn-lock","buckle") },
    { id:"draw", label:"Drawstring", note:"Gathered opening.", image:svgCard("Drawstring","bag") },
    { id:"open", label:"Open top", note:"Fast access without a closure.", image:svgCard("Open top","tote") },
    { id:"top-handles", label:"Top handles", note:"Carried by hand or forearm.", image:svgCard("Top handles","bag") },
    { id:"shoulder", label:"Shoulder strap", note:"Longer single-shoulder carry.", image:svgCard("Shoulder strap","bag") },
    { id:"crossbody", label:"Crossbody strap", note:"Long adjustable strap across the body.", image:svgCard("Crossbody strap","bag") },
    { id:"handles-strap", label:"Handles + strap", note:"Two carrying modes.", image:svgCard("Handles + strap","briefcase") },
    { id:"structured", label:"Structured", note:"Firm shape with reinforcement.", image:svgCard("Structured","briefcase") },
    { id:"soft", label:"Soft", note:"Relaxed drape and lighter structure.", image:svgCard("Soft","tote") },
    { id:"semi", label:"Semi-structured", note:"Balanced shape and flexibility.", image:svgCard("Semi-structured","bag") },
    { id:"tonal", label:"Tonal", note:"Thread close to the leather colour.", image:svgCard("Tonal stitch","accessory") },
    { id:"contrast", label:"Contrast", note:"Visible contrasting thread.", image:svgCard("Contrast stitch","accessory","#a64034") },
    { id:"edge", label:"Edge paint", note:"Clean coated leather edge.", image:svgCard("Edge paint","accessory") },
    { id:"burnished", label:"Burnished", note:"Smoothed, polished natural edge.", image:svgCard("Burnished","accessory","#8a5d33") },
    { id:"hand-edge", label:"Hand-stitched edge", note:"Visible stitched edge detail.", image:svgCard("Hand-stitched edge","accessory") },
  ].map((x) => [x.label.toLowerCase(), x]),
);

export function constructionVisual(label: string | null | undefined): VisualOption | null {
  if (!label) return null;
  return CONSTRUCTION_VISUALS[label.toLowerCase()] || {
    id: label.toLowerCase(), label, note: "Construction direction; final details confirmed by the atelier.",
    image: studioIllustration(label),
  };
}

export const PROJECT_MODES = [
  { id:"self", label:"For myself", note:"Create around your own dream and style.", minPlan:"free" as DesignerPlanId },
  { id:"gift", label:"For someone else", note:"Design for any gender, style or size — not just your own.", minPlan:"free" as DesignerPlanId },
  { id:"client", label:"For a client", note:"Create and organise a private design for a client.", minPlan:"studio" as DesignerPlanId },
  { id:"family", label:"For my family", note:"Build coordinated designs for a family project.", minPlan:"studio" as DesignerPlanId },
];

export function visualForPiece(piece: string | null | undefined): VisualPiece | null {
  if (!piece) return null;
  return PIECE_VISUALS.find((item) => item.piece === piece) || null;
}

export function colourVisual(name: string | null | undefined): VisualOption | null {
  if (!name) return null;
  return COLOUR_VISUALS.find((item) => item.label.toLowerCase() === name.toLowerCase()) || null;
}

export function recommendedMaterials(category: AtelierCategory | null, piece: string): string[] {
  if (category === "bags") return ["Full-grain leather","Top-grain leather","Nubuck"];
  if (category === "wearable") return ["Top-grain leather","Suede","Nubuck"];
  if (category === "accessories") return ["Full-grain leather","Top-grain leather"];
  if (/heel|oxford/i.test(piece)) return ["Top-grain leather","Suede"];
  if (/boot/i.test(piece)) return ["Full-grain leather","Nubuck","Suede"];
  if (/slide|sandal|mule|loafer/i.test(piece)) return ["Full-grain leather","Top-grain leather","Suede"];
  return ["Full-grain leather","Top-grain leather"];
}

export function compatibleFinishLabels(materialLabel: string | null | undefined): string[] {
  const material = (materialLabel || "").toLowerCase();
  if (!material) return [];
  if (material.includes("suede") || material.includes("nubuck")) return [];
  if (material.includes("full-grain")) return ["Smooth", "Pebbled", "Pull-up / waxy"];
  if (material.includes("top-grain")) return ["Smooth", "Pebbled", "Patent gloss", "Embossed"];
  return FINISH_VISUALS.map((item) => item.label);
}

export function materialSurfaceLabel(materialLabel: string | null | undefined, finishLabel: string | null | undefined): string {
  if (finishLabel) return finishLabel;
  const material = (materialLabel || "").toLowerCase();
  if (material.includes("suede")) return "Natural suede nap";
  if (material.includes("nubuck")) return "Natural nubuck nap";
  return "Not selected";
}

export function recommendedFinishes(category: AtelierCategory | null, piece: string): string[] {
  if (/heel/i.test(piece)) return ["Smooth","Patent gloss"];
  if (/boot/i.test(piece)) return ["Smooth","Pull-up / waxy","Pebbled"];
  if (/oxford|derby|loafer/i.test(piece)) return ["Smooth","Pebbled"];
  if (category === "bags") return ["Pebbled","Smooth","Embossed"];
  if (category === "accessories") return ["Smooth","Pebbled","Embossed"];
  if (category === "wearable") return ["Smooth"];
  return ["Smooth","Pebbled"];
}
