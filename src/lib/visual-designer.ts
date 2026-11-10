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

function svgCard(label: string, kind: string, accent = "#7b5b3a"): string {
  const drawings: Record<string, string> = {
    shoe: '<path d="M35 150c30-4 54-19 75-49 18 12 28 29 62 35 25 4 39 16 34 31-4 11-17 17-36 17H58c-25 0-34-10-23-34Z"/><path d="M65 142h86"/><path d="M109 103v47"/>',
    boot: '<path d="M77 40h70v84c10 8 26 13 48 20 14 5 21 14 18 25-3 12-15 18-34 18H67c-20 0-30-10-24-26 6-15 22-23 34-29V40Z"/><path d="M77 80h70"/>',
    heel: '<path d="M41 146c30-4 55-18 76-47 17 10 32 21 54 27 19 5 31 16 28 29-3 12-14 18-33 18H65c-24 0-33-10-24-27Z"/><path d="M169 155v36h15v-37"/><path d="M58 174h116"/>',
    slide: '<path d="M37 157c19-27 43-41 73-41 35 0 62 13 91 36l-7 27H50Z"/><path d="M74 118c8 25 15 39 23 58"/><path d="M116 116c9 23 18 38 29 59"/>',
    bag: '<rect x="49" y="76" width="142" height="111" rx="14"/><path d="M84 77c2-31 18-47 36-47s34 16 36 47"/><path d="M61 112h118"/>',
    tote: '<path d="M52 68h136l15 119H37L52 68Z"/><path d="M86 70c1-28 13-42 34-42s33 14 34 42"/>',
    briefcase: '<rect x="38" y="83" width="164" height="101" rx="10"/><path d="M91 84V61h58v23"/><path d="M38 118h164"/><rect x="111" y="111" width="18" height="15" rx="3"/>',
    belt: '<path d="M29 106h155v36H29Z"/><rect x="184" y="99" width="38" height="50" rx="6"/><path d="M194 111h18v26h-18Z"/><circle cx="65" cy="124" r="3"/><circle cx="84" cy="124" r="3"/>',
    wallet: '<rect x="47" y="70" width="146" height="110" rx="12"/><path d="M47 103h146"/><path d="M120 70v110"/>',
    strap: '<path d="M97 27h46l-7 166H104L97 27Z"/><circle cx="120" cy="163" r="4"/><circle cx="120" cy="145" r="4"/>',
    jacket: '<path d="M72 53 101 34h38l29 19 31 27-23 29-20-17v102H84V92l-20 17-23-29 31-27Z"/><path d="M120 35v159"/><path d="M84 106h72"/>',
    trouser: '<path d="M84 39h72l-7 155h-28l-1-93-1 93H91L84 39Z"/><path d="M85 70h70"/>',
    accessory: '<circle cx="120" cy="116" r="62"/><circle cx="120" cy="116" r="38"/><path d="M120 54v24M120 154v24"/>',
    "heel-round": '<path d="M45 136h126l26 21H58Z"/><path d="M165 153c16 3 22 14 19 35h-22c5-15 6-26 3-35Z"/>',
    "heel-block": '<path d="M45 136h126l26 21H58Z"/><rect x="158" y="153" width="29" height="39" rx="3"/>',
    "heel-stiletto": '<path d="M45 136h126l26 21H58Z"/><path d="M174 153h7l-3 39h-5Z"/>',
    "heel-wedge": '<path d="M45 136h126l26 21H58Z"/><path d="M142 153h44l4 39h-63Z"/>',
    sole: '<path d="M37 123c29-33 66-52 101-45 35 7 56 31 65 54-8 34-37 55-78 57-45 2-79-21-88-66Z"/><path d="M58 127h125"/>',
    "toe-round": '<path d="M42 161c6-46 35-74 78-74s72 28 78 74c-30 17-126 17-156 0Z"/>',
    "toe-square": '<path d="M45 91h150v88H45Z"/>',
    "toe-point": '<path d="M120 63 199 176H41L120 63Z"/>',
    buckle: '<rect x="61" y="74" width="118" height="84" rx="12"/><rect x="83" y="94" width="74" height="44" rx="8"/><path d="M120 95v43"/>',
    closure: '<path d="M62 55h96v132H62Z"/><path d="M110 55v132"/><circle cx="120" cy="121" r="7"/>',
  };
  const drawing = drawings[kind] || drawings.accessory;
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${label}">
    <rect width="240" height="240" fill="#f4efe6"/>
    <g fill="none" stroke="#1b1917" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${drawing}</g>
    <rect x="18" y="201" width="204" height="25" rx="12" fill="${accent}" opacity=".10"/>
    <text x="120" y="218" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#1b1917">${label.replace(/&/g, "and")}</text>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(raw);
}

function commons(file: string): string {
  const remote = "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=900";
  return "/.netlify/images?url=" + encodeURIComponent(remote) + "&w=560&h=420&fit=cover&q=76";
}

function kindForPiece(piece: string): string {
  if (/chelsea|boot/i.test(piece)) return "boot";
  if (/heel/i.test(piece)) return "heel";
  if (/slide|sandal|mule/i.test(piece)) return "slide";
  if (/oxford|derby|loafer/i.test(piece)) return "shoe";
  if (/briefcase|laptop/i.test(piece)) return "briefcase";
  if (/tote|travel|backpack/i.test(piece)) return "tote";
  if (/handbag|clutch|crossbody|pouch|purse/i.test(piece)) return "bag";
  if (/belt/i.test(piece)) return "belt";
  if (/wallet|card|passport/i.test(piece)) return "wallet";
  if (/watch strap/i.test(piece)) return "strap";
  if (/jacket|vest/i.test(piece)) return "jacket";
  if (/trouser|skirt/i.test(piece)) return "trouser";
  return "accessory";
}

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
  ["wearable","Trouser","Tailored or relaxed leather bottom"],
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
  image: svgCard(piece, kindForPiece(piece)),
}));

export function categoryVisual(category: AtelierCategory): string {
  const labels: Record<AtelierCategory, [string,string]> = {
    footwear: ["Footwear","shoe"],
    bags: ["Bags","bag"],
    accessories: ["Accessories","accessory"],
    wearable: ["Leather Wear","jacket"],
    other: ["Other Leather Fashion","accessory"],
  };
  const [label, kind] = labels[category];
  return svgCard(label, kind, "#8d6d3d");
}

export const MATERIAL_VISUALS: VisualOption[] = [
  {
    id: "full-grain",
    label: "Full-grain leather",
    note: "Premium hide grade with the natural grain surface left intact. Marks and grain vary from hide to hide.",
    image: commons("LeatherTexture.jpg"),
    bestFor: "Premium shoes, boots, structured bags, belts and long-life accessories.",
    credit: "Natural-grain visual reference. A photo cannot prove leather grade; DREAMZ confirms the actual hide before production.",
  },
  {
    id: "top-grain",
    label: "Top-grain leather",
    note: "Grain-side leather that may be lightly corrected for a cleaner, more even appearance.",
    image: commons("Brown Leather.jpg"),
    bestFor: "Refined footwear, bags, wallets and wearable leather.",
    credit: "Surface reference: Cbobdude / Wikimedia Commons, CC BY-SA 4.0. DREAMZ confirms the actual top-grain hide before production.",
  },
  {
    id: "suede",
    label: "Suede",
    note: "Soft leather with a visible velvety nap. The nap can change shade when brushed.",
    image: commons("A Derby of suede leather with brogues.jpg"),
    bestFor: "Loafers, mules, selected boots, bags and soft accent panels.",
    credit: "Suede reference: Wikimedia Commons, CC0.",
  },
  {
    id: "nubuck",
    label: "Nubuck",
    note: "Grain-side leather lightly buffed to create a fine, velvety surface.",
    image: commons("Nubuk-Leder, Muster.jpg"),
    bestFor: "Premium casual boots, loafers, bags and tactile statement panels.",
    credit: "Nubuck sample reference: Wikimedia Commons, public domain.",
  },
];

export const FINISH_VISUALS: VisualOption[] = [
  {
    id: "smooth",
    label: "Smooth",
    note: "Clean, even surface with a formal and minimal appearance.",
    image: commons("Leather021 8K Color.png"),
    bestFor: "Oxford shoes, loafers, dress boots, belts and structured bags.",
  },
  {
    id: "pebbled",
    label: "Pebbled",
    note: "Visible grain texture that adds depth and helps disguise everyday scuffs.",
    image: commons("Leather007 4K Color.png"),
    bestFor: "Bags, wallets, casual footwear and high-touch accessories.",
  },
  {
    id: "pull-up",
    label: "Pull-up / waxy",
    note: "Oil- or wax-rich leather that becomes lighter where it bends or stretches, creating character.",
    image: commons("Red leather oxford shoes by Eugene Pik (2021) 03.jpg"),
    bestFor: "Rugged boots, travel bags, briefcases and heritage-style pieces.",
    credit: "Pull-up behaviour reference: Eugene Pik / Wikimedia Commons, CC BY-SA 4.0.",
  },
  {
    id: "patent",
    label: "Patent gloss",
    note: "High-gloss coated finish for a polished statement look.",
    image: commons("Patent leather shoes.jpg"),
    bestFor: "Heels, formal footwear and controlled accent panels.",
    credit: "Patent leather reference: Kristin / Wikimedia Commons, CC BY 2.0.",
  },
  {
    id: "embossed",
    label: "Embossed",
    note: "Pattern pressed into the surface. DREAMZ confirms the actual embossing plate or hide available.",
    image: commons("Cordoue 1.jpg"),
    bestFor: "Bags, belts, footwear panels and statement accessories.",
    credit: "Embossed leather reference: Armorial / Wikimedia Commons, CC BY-SA 3.0.",
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
  image: svgCard(label, "accessory", hex),
}));

export const TOE_VISUALS: VisualOption[] = [
  { id:"round", label:"Round", note:"Comfortable, classic front.", image:svgCard("Round toe","toe-round") },
  { id:"almond", label:"Almond", note:"Soft taper between round and pointed.", image:svgCard("Almond toe","toe-round","#8b6a42") },
  { id:"square", label:"Square", note:"Sharper contemporary front.", image:svgCard("Square toe","toe-square") },
  { id:"pointed", label:"Pointed", note:"Longer, sharper fashion profile.", image:svgCard("Pointed toe","toe-point") },
];

export const SOLE_VISUALS: VisualOption[] = [
  { id:"leather", label:"Leather sole", note:"Slim, formal and refined.", image:svgCard("Leather sole","sole") },
  { id:"rubber", label:"Rubber sole", note:"Everyday grip and easier wet-weather wear.", image:svgCard("Rubber sole","sole","#444") },
  { id:"commando", label:"Commando sole", note:"Deeper tread for boots and rugged footwear.", image:svgCard("Commando sole","sole","#2d2d2d") },
  { id:"chunky", label:"Chunky sole", note:"Thicker modern profile.", image:svgCard("Chunky sole","sole","#222") },
];

export const HEEL_VISUALS: VisualOption[] = [
  { id:"round", label:"Round heel", note:"Rounded heel profile with a softer visual line.", image:svgCard("Round heel","heel-round") },
  { id:"block", label:"Block heel", note:"Stable, broad heel base.", image:svgCard("Block heel","heel-block") },
  { id:"kitten", label:"Kitten heel", note:"Low slim heel, elegant and easier to wear.", image:svgCard("Kitten heel","heel-stiletto") },
  { id:"stiletto", label:"Stiletto", note:"Slim high heel for a sharper formal silhouette.", image:svgCard("Stiletto","heel-stiletto"), minPlan:"creator" },
  { id:"wedge", label:"Wedge", note:"Continuous heel-to-sole mass for stability.", image:svgCard("Wedge","heel-wedge") },
  { id:"sculpted", label:"Sculpted heel", note:"Art-led heel shape, subject to engineering review.", image:svgCard("Sculpted heel","heel-round","#6d3d53"), minPlan:"creator" },
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
  return CONSTRUCTION_VISUALS[label.toLowerCase()] || null;
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
