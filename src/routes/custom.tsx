import { Link, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { getCatalog } from "@/server/catalog.functions";
import { getCustomDesign } from "@/server/designs.functions";
import { ProductGrid } from "@/components/ProductCard";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";

/**
 * DREAMZ LEATHER ATELIER — "Tell us the dream. We'll turn it into a leather
 * design brief."
 *
 * The old Boot-of-Many-Colours panel configurator is retired: the Boot is a
 * fixed signature design and no authored 3D model exists for any product, so
 * nothing here pretends to be a configurator or a 3D view. Customisation is
 * an intelligent leather-design consultation built on the DREAMZ
 * DREAM-TO-LEATHER METHOD.
 *
 * Cost rules: the page renders with ZERO AI calls; the atelier interface is
 * lazy-loaded; the catalogue grid is a plain database query.
 */

const LeatherAtelier = lazy(() => import("@/components/LeatherAtelier").then((m) => ({ default: m.LeatherAtelier })));

export const Route = createFileRoute("/custom")({
  validateSearch: (search: Record<string, unknown>): { design?: string; t?: string } => ({
    design: typeof search.design === "string" && /^DZD-[A-Z0-9]{8}$/.test(search.design) ? search.design : undefined,
    t: typeof search.t === "string" && /^[A-Z0-9]{24}$/.test(search.t) ? search.t : undefined,
  }),
  loader: async () => {
    const customizable = await getCatalog({ data: { customizable: true, limit: 12 } });
    return { customizable };
  },
  head: () => ({
    meta: [
      { title: `DREAMZ Leather Atelier — ${BRAND.name}` },
      {
        name: "description",
        content: `Tell us the dream and we'll turn it into a leather design brief. The DREAMZ Leather Atelier designs custom leather footwear, bags, accessories and wearable pieces around your story.`,
      },
    ],
  }),
  component: Custom,
});

function Custom() {
  const { customizable } = Route.useLoaderData();
  const search = Route.useSearch();
  const [atelierOpen, setAtelierOpen] = useState(false);
  const [retiredDesign, setRetiredDesign] = useState<{ productName: string | null; isBoot: boolean } | null>(null);

  // Old saved-design links (DZD-…) reference the retired panel workspace.
  // They are handled gracefully in the browser — never a crash.
  useEffect(() => {
    if (!search.design || !search.t) return;
    let cancelled = false;
    getCustomDesign({ data: { designId: search.design, editToken: search.t } })
      .then(async (res) => {
        if (!res.found || cancelled) return;
        const { getCatalog } = await import("@/server/catalog.functions");
        const all = await getCatalog({ data: { limit: 200 } });
        const product = all.find((p) => p.id === res.design.productId) ?? null;
        setRetiredDesign({
          productName: product?.name ?? null,
          isBoot: product?.sku === "DFK-FTW-001",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [search.design, search.t]);

  // Deep-link convenience: opening the atelier directly when arriving from a
  // campaign link without an old design reference.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("design") && params.get("start") === "1") setAtelierOpen(true);
  }, []);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-10 text-center">
        <p className="overline-label mb-3">DREAMZ Leather Atelier</p>
        <h1 className="font-editorial text-4xl sm:text-6xl uppercase">Tell us the dream</h1>
        <p className="mt-4 max-w-xl mx-auto text-stone leading-relaxed">
          We'll turn it into a leather design brief. Choose your design. Carry
          your meaning.
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-6">
        {retiredDesign && (
          <RetiredDesignNotice
            productName={retiredDesign.productName}
            isBoot={retiredDesign.isBoot}
            onStartNew={() => setAtelierOpen(true)}
          />
        )}
        {!atelierOpen ? (
          <div className="border border-gold/40 bg-gold/5 px-6 sm:px-10 py-8 text-center">
            <p className="overline-label !text-gold mb-3">The DREAMZ DREAM-TO-LEATHER Method</p>
            <p className="text-sm leading-relaxed text-stone">
              A guided consultation in eight short steps: the piece, the dream,
              the person, the character, the leather, the construction, the
              personalisation and your inspiration. At the end you receive a
              design summary, a DREAMZ render prompt you can use in any strong
              visual model, an artisan production brief — and the option to
              send it to the house for a quote.
            </p>
            <p className="mt-3 text-xs text-stone">
              No generated pictures are sold here — real leathercraft, reviewed
              by real artisans.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={() => setAtelierOpen(true)} className="btn-lux btn-lux-primary">
                Begin the Consultation
              </button>
              <WhatsAppCTAButton
                message={`Hello ${BRAND.shortName}, I'd like to design my own leather piece.`}
                label="Talk to a Designer"
              />
            </div>
          </div>
        ) : (
          <ClientOnly fallback={<p className="text-center text-stone py-16">Opening the atelier…</p>}>
            <Suspense fallback={<p className="text-sm text-stone text-center py-6">Preparing the atelier…</p>}>
              <div className="border border-ink/15 bg-white/40 px-5 sm:px-10 py-8">
                <LeatherAtelier />
              </div>
            </Suspense>
          </ClientOnly>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        {/* How the atelier works */}
        <div className="max-w-3xl mx-auto text-center mb-16 mt-6">
          <h2 className="font-editorial text-3xl mb-8">How the atelier works</h2>
          <ol className="grid gap-6 sm:grid-cols-3 text-sm">
            {[
              ["01", "Tell us the dream", "A guided consultation turns ordinary language into a professional leather brief."],
              ["02", "Receive your quote", "The atelier reviews the brief, confirms materials and confirms the price."],
              ["03", "We craft it", "Made to order after payment, then delivered."],
            ].map(([n, title, body]) => (
              <li key={n} className="border border-ink/10 px-6 py-8">
                <p className="font-editorial text-2xl text-gold mb-3">{n}</p>
                <p className="uppercase tracking-btn text-[0.68rem] mb-2">{title}</p>
                <p className="text-stone leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Customizable pieces */}
        <div className="text-center mb-10">
          <p className="overline-label mb-3">Available To Personalize</p>
          <h2 className="font-editorial text-3xl">Pieces You Can Make Yours</h2>
          <div className="rule-gold mx-auto mt-6" />
        </div>
        {customizable.length === 0 ? (
          <p className="text-center text-stone py-10">
            Physical customisation is offered through the atelier consultation —
            the collection itself is ready to wear.
          </p>
        ) : (
          <ProductGrid products={customizable} />
        )}

        <div className="text-center mt-16">
          <Link to="/royale" className="btn-lux btn-lux-outline">
            Prefer a full private commission? Visit Royale
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Old saved-design links (DZD-…) reference the retired panel workspace.
 * They never crash: the customer is told what changed and given the two
 * honest paths — the product page or the new atelier.
 */
function RetiredDesignNotice({
  productName,
  isBoot,
  onStartNew,
}: {
  productName: string | null;
  isBoot: boolean;
  onStartNew: () => void;
}) {
  return (
    <div className="border border-ink/15 bg-white/60 px-6 py-6 mb-8 text-center" role="note">
      <p className="overline-label mb-2">Saved designs have moved</p>
      <p className="text-sm text-stone leading-relaxed max-w-xl mx-auto">
        {isBoot || !productName ? (
          <>
            <strong>The Boot of Many Colours is now a fixed DREAMZ signature design</strong> and can
            no longer be customised — its panels, colours, sole and hardware
            are exactly as the house designed them. You can still view it,
            choose a size where applicable, choose a package and an optional
            inspiration message, and purchase it as designed.
          </>
        ) : (
          <>
            <strong>{productName}</strong> is no longer available in the panel
            design workspace.
          </>
        )}{" "}
        For a piece designed around you, start a new leather brief in the
        atelier below.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
        {isBoot && (
          <Link to="/product/$slug" params={{ slug: "boot-of-many-colours" }} className="btn-lux btn-lux-primary">
            View the Boot of Many Colours
          </Link>
        )}
        <button type="button" className="btn-lux btn-lux-outline" onClick={onStartNew}>
          Start a New Leather Brief
        </button>
      </div>
    </div>
  );
}
