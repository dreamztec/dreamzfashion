import {
  HARDWARE_VISUALS,
  MATERIAL_VISUALS,
  SOLE_VISUALS,
  colourVisual,
  visualForPiece,
} from "@/lib/visual-designer";

export type ConceptPreviewData = {
  piece?: string | null;
  material?: string | null;
  primaryColour?: string | null;
  secondaryColour?: string | null;
  image?: string | null;
  construction?: Record<string, string> | null;
};

export function DesignConceptPreview({
  preview,
  compact = false,
}: {
  preview: ConceptPreviewData;
  compact?: boolean;
}) {
  const piece = visualForPiece(preview.piece);
  const primary = colourVisual(preview.primaryColour);
  const secondary = colourVisual(preview.secondaryColour);
  const suppliedImage =
    preview.image &&
    !preview.image.startsWith("/img/products/") &&
    preview.image !== "/img/hero-boot-of-many-colours.jpg"
      ? preview.image
      : null;
  const image = suppliedImage || piece?.image || null;
  const construction = preview.construction || {};
  const material = MATERIAL_VISUALS.find((item) => item.label === preview.material) || null;
  const sole = SOLE_VISUALS.find((item) => item.label === construction.soleType) || null;
  const hardware =
    HARDWARE_VISUALS.find((item) => item.label === construction.buckleStyle) || null;
  const componentRefs = [
    material?.image ? { label: "Leather", value: material.label, image: material.image } : null,
    sole?.image ? { label: "Sole", value: sole.label, image: sole.image } : null,
    hardware?.image ? { label: "Hardware", value: hardware.label, image: hardware.image } : null,
  ].filter((item): item is { label: string; value: string; image: string } => Boolean(item));

  return (
    <div className="border border-ink/10 bg-ivory-deep/50 overflow-hidden">
      <div className={"relative overflow-hidden bg-white " + (compact ? "aspect-[4/3]" : "aspect-[5/4]")}>
        {image ? (
          <img
            src={image}
            alt={preview.piece ? preview.piece + " neutral design silhouette" : "DREAMZ blank design workspace"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-stone">
            <span className="font-editorial text-2xl">Choose a piece to begin</span>
          </div>
        )}
        {primary?.hex && (
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-25"
            style={{ backgroundColor: primary.hex, mixBlendMode: "color" }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-12 pb-4 text-white">
          <p className="text-[0.62rem] uppercase tracking-btn opacity-80">Live concept board</p>
          <p className="font-editorial text-xl">{preview.piece || "Choose a leather piece"}</p>
        </div>
      </div>

      {componentRefs.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-ink/10 border-b border-ink/10">
          {componentRefs.map((component) => (
            <div key={component.label} className="bg-ivory">
              <div className="aspect-square overflow-hidden bg-white">
                <img src={component.image} alt={component.value + " visual reference"} className="h-full w-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-[0.52rem] uppercase tracking-btn text-stone">{component.label}</p>
                <p className="text-[0.62rem] mt-0.5 line-clamp-2">{component.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="uppercase tracking-btn text-[0.58rem] text-stone">Leather</p>
          <p className="mt-1">{preview.material || "Choose material"}</p>
        </div>
        <div>
          <p className="uppercase tracking-btn text-[0.58rem] text-stone">Colour</p>
          <div className="mt-1 flex items-center gap-2">
            {primary?.hex && <span className="h-4 w-4 rounded-full border border-ink/15" style={{ backgroundColor: primary.hex }} />}
            <span>{preview.primaryColour || "Choose colour"}</span>
            {secondary?.hex && <span className="h-4 w-4 rounded-full border border-ink/15" style={{ backgroundColor: secondary.hex }} />}
          </div>
        </div>
        {construction.soleType && (
          <div>
            <p className="uppercase tracking-btn text-[0.58rem] text-stone">Sole</p>
            <p className="mt-1">{construction.soleType}</p>
          </div>
        )}
        {(construction.buckleStyle || construction.hardwareFinish || construction.heelType) && (
          <div>
            <p className="uppercase tracking-btn text-[0.58rem] text-stone">Detail</p>
            <p className="mt-1">{construction.buckleStyle || construction.heelType || construction.hardwareFinish}</p>
          </div>
        )}
      </div>
      {!compact && (
        <p className="px-4 pb-4 text-[0.66rem] text-stone leading-relaxed">
          This is a blank concept board built from your selections — not a DREAMZ catalogue product. Leather swatches are visual references; the atelier confirms the exact hide, component compatibility, colour placement and construction before production.
        </p>
      )}
    </div>
  );
}
