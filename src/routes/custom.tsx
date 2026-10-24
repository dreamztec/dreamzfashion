import { Link, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { getCatalog } from "@/server/catalog.functions";
import { ProductGrid } from "@/components/ProductCard";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";

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
  loader: async () => {
    const customizable = await getCatalog({ data: { customizable: true, limit: 12 } });
    return { customizable };
  },
  head: () => ({
    meta: [
      { title: `Design Your Dream — ${BRAND.name}` },
      {
        name: "description",
        content: `The DREAMZ Design Assistant — describe the piece you imagine and discover it within the real DREAMZ collection. Personalize leather footwear, bags and accessories.`,
      },
    ],
  }),
  component: Custom,
});

function Custom() {
  const { customizable } = Route.useLoaderData();
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div>
      <div className="relative h-[52svh] min-h-[380px] -mt-16 flex items-end overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 rainbow-rule"
          style={{ filter: "blur(90px)" }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 pb-14 text-ivory">
          <p className="overline-label !text-gold-soft mb-3">DREAMZ Design Lab</p>
          <h1 className="font-editorial text-5xl sm:text-7xl">Design Your Dream</h1>
          <p className="font-editorial text-xl sm:text-2xl mt-4 tracking-wide text-gold-soft">
            Your idea. Our craft. Your DREAMZ.
          </p>
          <p className="mt-4 max-w-lg text-ivory/80 leading-relaxed">
            Tell the design assistant what you imagine — occasion, colour,
            material, budget — and it will shape the idea with pieces from the
            real DREAMZ collection.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        {/* The atelier flow */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="font-editorial text-3xl mb-8">How the atelier works</h2>
          <ol className="grid gap-6 sm:grid-cols-3 text-sm">
            {[
              ["01", "Describe your idea", "Occasion, style, colour, material, budget."],
              ["02", "Discover pieces", "The assistant searches the real collection with you."],
              ["03", "We craft it", "Personalized, made to order, then delivered."],
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
          <p className="overline-label !text-gold mb-3">DREAMZ Design Assistant</p>
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
          <Link to="/bespoke" className="btn-lux btn-lux-outline">
            Prefer a full bespoke commission? Visit Bespoke
          </Link>
        </div>
      </div>
    </div>
  );
}
