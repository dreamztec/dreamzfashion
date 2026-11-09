
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
};

export const PIECE_VISUALS: VisualPiece[] = [
  { category: "footwear", piece: "Oxford", image: "/img/products/ascension-oxford.jpg", note: "Structured lace-up shoe" },
  { category: "footwear", piece: "Loafer", image: "/img/products/classic-black-penny-loafer.jpg", note: "Slip-on, refined and versatile" },
  { category: "footwear", piece: "Boot", image: "/img/products/boot-of-many-colours-studio.jpg", note: "Statement ankle or high boot" },
  { category: "footwear", piece: "Chelsea Boot", image: "/img/products/boot-of-many-colours.jpg", note: "Clean pull-on boot direction" },
  { category: "footwear", piece: "Mule", image: "/img/products/asiwaju-mule-brown.jpg", note: "Open-back leather footwear" },
  { category: "footwear", piece: "Slide", image: "/img/products/spectrum-buckle-slide.jpg", note: "Easy luxury with custom straps" },
  { category: "footwear", piece: "Sandal", image: "/img/products/prism-cross-sandal.jpg", note: "Open construction with strap freedom" },
  { category: "bags", piece: "Handbag", image: "/img/products/executive-leather-handbag.jpg", note: "Structured personal carry" },
  { category: "bags", piece: "Briefcase", image: "/img/products/executive-spectrum-briefcase.jpg", note: "Executive work bag" },
  { category: "bags", piece: "Tote", image: "/img/products/regent-croc-tote.jpg", note: "Open everyday carry" },
  { category: "bags", piece: "Pouch", image: "/img/products/purpose-wrist-pouch.jpg", note: "Compact wrist or hand carry" },
  { category: "bags", piece: "Purse", image: "/img/products/pedra-satchel.jpg", note: "Compact leather bag" },
  { category: "accessories", piece: "Belt", image: "/img/products/legacy-leather-belt.jpg", note: "Leather belt and buckle system" },
  { category: "accessories", piece: "Bracelet/Cuff", image: "/img/products/resolve-double-buckle-cuff.jpg", note: "Small leather statement piece" },
  { category: "accessories", piece: "Watch Strap", image: "/img/products/strap-twist.jpg", note: "Personal leather strap" },
  { category: "wearable", piece: "Jacket", image: "/img/products/leadership-utility-vest.jpg", note: "Wearable leather outer layer" },
  { category: "wearable", piece: "Trouser", image: "/img/products/excellence-tailored-trousers.jpg", note: "Tailored leather bottom" },
  { category: "wearable", piece: "Vest", image: "/img/products/courage-lace-up-vest.jpg", note: "Layered leather top" },
];

export const MATERIAL_VISUALS: VisualOption[] = [
  {
    id: "full-grain",
    label: "Full-grain leather",
    note: "Natural grain, premium ageing and strong structure.",
    image: "/img/products/asiwaju-mule-brown-detail.jpg",
  },
  {
    id: "smooth",
    label: "Smooth leather",
    note: "Clean surface for formal and minimal pieces.",
    image: "/img/products/ascension-oxford.jpg",
  },
  {
    id: "woven",
    label: "Woven leather",
    note: "Interlaced leather texture for controlled detail.",
    image: "/img/products/lightning-strap-loafer.jpg",
    minPlan: "creator",
  },
  {
    id: "embossed-croc",
    label: "Crocodile-texture embossed leather",
    note: "Embossed texture only unless genuine exotic availability is separately verified.",
    image: "/img/products/regent-croc-tote.jpg",
    minPlan: "creator",
  },
  {
    id: "pebbled",
    label: "Pebbled leather",
    note: "Textured grain that hides wear well.",
    image: "/img/products/executive-leather-handbag.jpg",
  },
  {
    id: "suede",
    label: "Suede",
    note: "Soft matte nap. Final hide colour and nap are confirmed by the atelier.",
    image: "/img/products/crimson-pin.jpg",
  },
  {
    id: "nubuck",
    label: "Nubuck",
    note: "Fine brushed surface with a soft premium hand.",
    minPlan: "creator",
  },
  {
    id: "patent",
    label: "Patent leather",
    note: "High-gloss finish for controlled statement details.",
    image: "/img/products/voltage-noir-loafer.jpg",
    minPlan: "creator",
  },
];

export const COLOUR_VISUALS: VisualOption[] = [
  { id: "black", label: "Black", note: "Deep neutral", hex: "#141414", image: "/img/products/classic-black-penny-loafer.jpg" },
  { id: "chocolate", label: "Chocolate Brown", note: "Deep brown", hex: "#4E3024", image: "/img/products/asiwaju-mule-brown.jpg" },
  { id: "cognac", label: "Cognac", note: "Warm classic leather", hex: "#9A5427", image: "/img/products/dreamz-purpose-cognac-royal-blue.jpg" },
  { id: "tan", label: "Tan", note: "Warm light brown", hex: "#C98B4E", image: "/img/products/dreamz-faith-tan-green.jpg" },
  { id: "oxblood", label: "Oxblood", note: "Deep red-brown", hex: "#5A1A1F", image: "/img/products/dreamz-faith-black-oxblood.jpg" },
  { id: "burgundy", label: "Burgundy", note: "Wine red", hex: "#7A1F35", image: "/img/products/dreamz-integrity-black-burgundy.jpg" },
  { id: "navy", label: "Navy", note: "Dark blue", hex: "#1F2A4A", image: "/img/products/dreamz-faith-taupe-navy.jpg" },
  { id: "royal-blue", label: "Royal Blue", note: "Bright deep blue", hex: "#24459A", image: "/img/products/dreamz-confidence-black-royal-blue.jpg" },
  { id: "forest", label: "Forest Green", note: "Deep green", hex: "#2F5A3C", image: "/img/products/dreamz-harmony-tan-forest-green.jpg" },
  { id: "emerald", label: "Emerald", note: "Rich green", hex: "#1F7A58", image: "/img/products/dreamz-vision-green-red-orange-brown.jpg" },
  { id: "cream", label: "Cream", note: "Warm pale neutral", hex: "#EFE4CF", image: "/img/products/dreamz-harmony-cream-multicolour.jpg" },
  { id: "white", label: "White", note: "Clean neutral", hex: "#F6F4EF", image: "/img/products/dreamz-grace-black-white.jpg" },
  { id: "burnt-orange", label: "Burnt Orange", note: "Warm accent", hex: "#C8512A", image: "/img/products/dreamz-rhythm-olive-orange-brown-black.jpg" },
  { id: "sky-blue", label: "Sky Blue", note: "Light accent", hex: "#4FA3D9", image: "/img/products/dreamz-balance-beige-burnt-orange-slate-blue.jpg" },
];

export const HARDWARE_VISUALS: VisualOption[] = [
  { id: "minimal", label: "Minimal hardware", note: "Keep fittings quiet and functional.", image: "/img/products/asiwaju-mule-brown-detail.jpg" },
  { id: "single-buckle", label: "Single buckle", note: "One controlled buckle detail.", image: "/img/products/verona-buckle-slide.jpg" },
  { id: "double-buckle", label: "Double buckle", note: "Two balanced fastening points.", image: "/img/products/spectrum-buckle-slide.jpg", minPlan: "creator" },
  { id: "medallion", label: "Medallion detail", note: "A central decorative hardware moment.", image: "/img/products/heritage-medallion-oxford.jpg", minPlan: "creator" },
];

export const SOLE_VISUALS: VisualOption[] = [
  { id: "leather", label: "Leather sole", note: "Formal, slim and refined.", image: "/img/products/ascension-oxford.jpg" },
  { id: "rubber", label: "Rubber sole", note: "Everyday grip and durability.", image: "/img/products/onyx-stride.jpg" },
  { id: "chunky", label: "Chunky sole", note: "Heavier modern profile.", image: "/img/products/onyx-wave.jpg", minPlan: "creator" },
  { id: "lug", label: "Lug sole", note: "Rugged tread direction.", image: "/img/products/boot-of-many-colours-studio.jpg", minPlan: "creator" },
];

export const PROJECT_MODES = [
  { id: "self", label: "For myself", note: "Create around your own dream and style.", minPlan: "free" as DesignerPlanId },
  { id: "gift", label: "For someone else", note: "Design a gift or personal piece for another person.", minPlan: "free" as DesignerPlanId },
  { id: "client", label: "For a client", note: "Create and organise work for a paying client.", minPlan: "studio" as DesignerPlanId },
  { id: "family", label: "For my family", note: "Build coordinated designs for a family project.", minPlan: "studio" as DesignerPlanId },
];

export function visualForPiece(piece: string | null | undefined): VisualPiece | null {
  if (!piece) return null;
  return PIECE_VISUALS.find((item) => item.piece === piece) || null;
}

export function colourVisual(name: string | null | undefined): VisualOption | null {
  if (!name) return null;
  return COLOUR_VISUALS.find((item) => item.label.toLowerCase() === name.toLowerCase()) || null;
}
