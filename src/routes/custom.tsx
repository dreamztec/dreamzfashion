import { ClientOnly, Link, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { getCatalog } from "@/server/catalog.functions";
import { ProductGrid } from "@/components/ProductCard";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { DESIGN_TEMPLATES } from "@/lib/design-templates";
import { isPosterArtwork } from "@/lib/img";
import { DesignWorkspace } from "@/components/DesignWorkspace";


/**
 * Design Your Dream — the DREAMZ Design Assistant lives here.
 *
 * Cost rules baked into this page:
 * - The page renders with ZERO AI calls. The catalogue grid below is a plain
 *   database query, same as the Shop.
 * - The assistant interface is lazy-loaded: its code (and any AI usage) only
 *   enters the browser when the customer opens the assistant.
 */

const DesignAssistant = lazy(() => import("@/components/DesignAssistant").then((m) => ({ default: m.DesignAssistant })));

export const Route = createFileRoute("/custom")({
  validateSearch: (search: Record<string, unknown>): { design?: string; t?: string } => ({
    design: typeof search.design === "string" && /^DZD-[A-Z0-9]{8}$/.test(search.design) ? search.design : undefined,
    t: typeof search.t === "string" && /^[A-Z0-9]{24}$/.test(search.t) ? search.t : undefined,
  }),
  loader: async () => {
    const [customizable, all] = await Promise.all([
      getCatalog({ data: { customizable: true, limit: 12 } }),
      getCatalog({ data: { limit: 200 } }),
    ]);
    // Products with a design template (Boot of Many Colours first).
    const workspaceProducts = DESIGN_TEMPLATES.map((t) => all.find((p) => p.sku === t.productSku))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => {
        const photo = p.images.find((i) => !isPosterArtwork(i.url)) ?? p.images[0] ?? null;
        return {
          id: p.id,
          sku: p.sku,
          slug: p.slug,
          name: p.name,
          price: p.price,
          checkoutReady: p.checkoutReady,
          imageUrl: photo?.url ?? null,
          imageAlt: photo?.altText ?? null,
        };
      });
    return { customizable, workspaceProducts };
  },
  head: () => ({
    meta: [
      { title: `Design Your Dream Outfit — ${BRAND.name}` },
      {
        name: "description",
        content: `The DREAMZ Design Assistant — describe the piece you imagine and discover it within the real DREAMZ collection. Personalize leather footwear, bags and accessories.`,
      },
    ],
  }),
  component: Custom,
});

function Custom() {
  const { customizable, workspaceProducts } = Route.useLoaderData();
  const search = Route.useSearch();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const base = workspaceProducts[0] ?? null;
  const template = base ? DESIGN_TEMPLATES.find((t) => t.productSku === base.sku) ?? null : null;
  const initialDesign = search.design && search.t ? { designId: search.design, editToken: search.t } : null;

  return (
    <div>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-10 text-center">
        <p className="overline-label mb-3">DREAMZ Design Lab</p>
        <h1 className="font-editorial text-4xl sm:text-6xl uppercase">Design Your Dream Outfit</h1>
        <p className="mt-4 max-w-xl mx-auto text-stone leading-relaxed">
          Start from a real DREAMZ design, choose the colour and leather of each
          part, add your inspiration photos, and save it. Our artisans price and
          make it for you.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-6">
        {base && template ? (
          <ClientOnly fallback={<p className="text-center text-stone py-16">Opening the workspace…</p>}>
            <DesignWorkspace template={template} product={base} initialDesign={initialDesign} />
          </ClientOnly>
        ) : (
          <p className="text-center text-stone py-10">
            The design workspace is being prepared. Tell us your idea with the design assistant below.
          </p>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        {/* The atelier flow */}
        <div className="max-w-3xl mx-auto text-center mb-16 mt-10">
          <h2 className="font-editorial text-3xl mb-8">How the atelier works</h2>
          <ol className="grid gap-6 sm:grid-cols-3 text-sm">
            {[
              ["01", "Design or describe", "Choose each part above, or describe your idea to the assistant."],
              ["02", "Receive your quote", "The house reviews your design and confirms the price."],
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

        {/* The assistant — loaded only when opened */}
        <div className="max-w-3xl mx-auto border border-gold/40 bg-gold/5 px-6 sm:px-10 py-8 mb-16">
          <p className="overline-label !text-gold mb-3">Not sure yet? DREAMZ Design Assistant</p>
          {!assistantOpen ? (
            <>
              <p className="text-sm leading-relaxed text-stone">
                Shoes, bags, belts, wallets, a gift or something bespoke —
                describe it and the assistant will recommend pieces from the
                live collection, refine your idea with you, and on request
                sketch an AI concept of your direction. Every recommendation
                comes from the actual DREAMZ catalogue with real prices and
                availability.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setAssistantOpen(true)}
                  className="btn-lux btn-lux-primary"
                >
                  Open the Design Assistant
                </button>
                <WhatsAppCTAButton
                  message={`Hello ${BRAND.shortName}, I'd like to design my own piece.`}
                  label="Talk to a Designer"
                />
              </div>
            </>
          ) : (
            <Suspense
              fallback={
                <p className="text-sm text-stone text-center py-6">Preparing the studio…</p>
              }
            >
              <DesignAssistant />
            </Suspense>
          )}
        </div>

        {/* Customizable pieces */}
        <div className="text-center mb-10">
          <p className="overline-label mb-3">Available To Personalize</p>
          <h2 className="font-editorial text-3xl">Pieces You Can Make Yours</h2>
          <div className="rule-gold mx-auto mt-6" />
        </div>
        {customizable.length === 0 ? (
          <p className="text-center text-stone py-10">
            Customizable pieces are being curated. Check back soon.
          </p>
        ) : (
          <ProductGrid products={customizable} />
        )}

        <div className="text-center mt-16">
          <Link to="/royale" className="btn-lux btn-lux-outline">
            Prefer a full bespoke commission? Visit Bespoke
          </Link>
        </div>
      </div>
    </div>
  );
}
