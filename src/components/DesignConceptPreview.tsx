
import { colourVisual, visualForPiece } from "@/lib/visual-designer";

export type ConceptPreviewData = {
  piece?: string | null;
  material?: string | null;
  primaryColour?: string | null;
  secondaryColour?: string | null;
  image?: string | null;
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
  const image = preview.image || piece?.image || "/img/hero-boot-of-many-colours.jpg";

  return (
    <div className="border border-ink/10 bg-ivory-deep/50 overflow-hidden">
      <div className={"relative overflow-hidden bg-white " + (compact ? "aspect-[4/3]" : "aspect-[5/4]")}>
        <img
          src={image}
          alt={preview.piece ? preview.piece + " visual reference" : "DREAMZ leather design visual reference"}
          className="absolute inset-0 h-full w-full object-cover"
        />
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
      </div>
      {!compact && (
        <p className="px-4 pb-4 text-[0.66rem] text-stone leading-relaxed">
          Visual reference only. The final artisan-approved leather, construction and colour placement are confirmed before production.
        </p>
      )}
    </div>
  );
}
