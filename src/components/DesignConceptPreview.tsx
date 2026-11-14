import { studioIllustration } from "@/lib/studio-illustrations";
import {
  FINISH_VISUALS,
  MATERIAL_VISUALS,
  colourVisual,
  constructionVisual,
  materialSurfaceLabel,
  visualForPiece,
} from "@/lib/visual-designer";

export type ConceptPreviewData = {
  piece?: string | null;
  material?: string | null;
  texture?: string | null;
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
  // Saved drafts may still contain catalogue URLs. Never render these as blank designs.
  // Technical SVG changes instantly when the customer picks a leather colour.
  // No reference photograph is sampled or modified.
  const image = piece ? studioIllustration(piece.piece, primary?.hex ?? preview.primaryColour ?? undefined) : null;
  const construction = preview.construction || {};
  const material = MATERIAL_VISUALS.find((item) => item.label === preview.material) || null;
  const finish = FINISH_VISUALS.find((item) => item.label === preview.texture) || null;
  const componentRefs = [
    material?.image ? { label: "Leather", value: material.label, image: material.image } : null,
    finish?.image ? { label: "Finish", value: finish.label, image: finish.image } : null,
    construction.soleType
      ? constructionVisual(construction.soleType)?.image
        ? { label: "Sole", value: construction.soleType, image: constructionVisual(construction.soleType)!.image! }
        : null
      : null,
    construction.toeShape
      ? constructionVisual(construction.toeShape)?.image
        ? { label: "Toe", value: construction.toeShape, image: constructionVisual(construction.toeShape)!.image! }
        : null
      : null,
    construction.heelType
      ? constructionVisual(construction.heelType)?.image
        ? { label: "Heel", value: construction.heelType, image: constructionVisual(construction.heelType)!.image! }
        : null
      : null,
    (construction.buckleStyle || construction.closure)
      ? constructionVisual(construction.buckleStyle || construction.closure)?.image
        ? {
            label: construction.buckleStyle ? "Hardware" : "Closure",
            value: construction.buckleStyle || construction.closure,
            image: constructionVisual(construction.buckleStyle || construction.closure)!.image!,
          }
        : null
      : null,
  ]
    .filter((item): item is { label: string; value: string; image: string } => Boolean(item))
    .slice(0, 6);

  return (
    <div className="border border-ink/10 bg-white overflow-hidden">
      <div className={"relative overflow-hidden bg-white " + (compact ? "aspect-[4/3]" : "aspect-[5/4]")}>
        {image ? (
          <img
            src={image}
            alt={preview.piece ? preview.piece + " clean labelled Studio drawing in " + (preview.primaryColour || "neutral") : "DREAMZ visual design workspace"}
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-stone">
            <span className="font-editorial text-2xl">Choose a piece to begin</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-12 pb-4 text-white">
          <p className="text-[0.62rem] uppercase tracking-btn opacity-80">Technical colour sketch · Not a finished design</p>
          <p className="font-editorial text-xl">{preview.piece || "Choose a leather piece"}</p>
        </div>
      </div>

      {componentRefs.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-ink/10 border-b border-ink/10">
          {componentRefs.map((component) => (
            <div key={component.label} className="bg-white">
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
        {preview.material && (
          <div>
            <p className="uppercase tracking-btn text-[0.58rem] text-stone">Surface</p>
            <p className="mt-1">{materialSurfaceLabel(preview.material, preview.texture)}</p>
          </div>
        )}
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
          The diagram updates to your selected primary colour. It is only a labelled construction guide, not the final generated product image or an exact manufacturing drawing. Generate the finished image from your design prompt; the DREAMZ maker confirms proportions, fit, materials and construction before production.
        </p>
      )}
    </div>
  );
}
