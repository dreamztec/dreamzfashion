import { Link, createFileRoute } from "@tanstack/react-router";
import { getCatalog } from "@/server/catalog.functions";
import { ProductGrid } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";
import { getSiteSettings } from "@/server/catalog.functions";

export const Route = createFileRoute("/royale")({
  loader: async () => {
    const [settings, all] = await Promise.all([
      getSiteSettings(),
      getCatalog({ data: { limit: 200 } }),
    ]);
    return {
      settings,
      showcase: all.filter((p) => p.productLine === "royale").slice(0, 3),
    };
  },
  head: () => ({
    meta: [
      { title: `DREAMZ Royale — ${BRAND.name}` },
      {
        name: "description",
        content:
          "DREAMZ Royale — premium customisation and bespoke client work. Created for one client. Created around one vision.",
      },
    ],
  }),
  component: RoyalePage,
});

const ROYALE_STEPS = [
  {
    step: "I",
    title: "Share the Vision",
    body: "Product type, design direction, colours, materials, size, monogram, hardware, sole and finishing — tell us what the piece must say.",
  },
  {
    step: "II",
    title: "The Occasion",
    body: "Where will it be worn? An occasion shapes a piece as much as any measurement.",
  },
  {
    step: "III",
    title: "Budget & Date",
    body: "A budget you have in mind and the date you need it — no ceilings, no assumptions.",
  },
  {
    step: "IV",
    title: "Consultation",
    body: "Our atelier team reviews the request personally and continues with you — here, or on WhatsApp.",
  },
];

function RoyalePage() {
  const { settings, showcase } = Route.useLoaderData() as {
    settings: Record<string, unknown>;
    showcase: Awaited<ReturnType<typeof getCatalog>>;
  };
  const whatsappNumber =
    (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "";

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[72svh] flex items-center overflow-hidden bg-ink">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20 rainbow-rule"
          style={{ filter: "blur(90px)" }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 py-24 text-ivory">
          <p className="overline-label !text-gold-soft fade-up">DREAMZ ROYALE</p>
          <h1 className="font-editorial text-5xl sm:text-7xl leading-[1.02] mt-5 max-w-3xl fade-up fade-up-1">
            Created for one client. Created around one vision.
          </h1>
          <p className="mt-6 max-w-xl text-ivory/85 leading-relaxed fade-up fade-up-2">
            Royale is our premium client service — a piece designed around you,
            from first sketch to final finish. Not a price band. A
            collaboration with the atelier.
          </p>
          <div className="mt-9 flex flex-wrap gap-4 fade-up fade-up-3">
            <Link to="/royale/request" className="btn-lux btn-lux-gold">
              Start a Design
            </Link>
            <Link to="/royale/request" className="btn-lux text-ivory border border-ivory/40 hover:border-ivory">
              Bespoke Request
            </Link>
          </div>
        </div>
      </section>

      {/* The four movements */}
      <section className="mx-auto max-w-5xl px-5 sm:px-8 py-20 lg:py-28">
        <Reveal>
          <div className="text-center mb-14">
            <p className="overline-label mb-3">The Journey</p>
            <h2 className="font-editorial text-3xl sm:text-5xl">Four movements, one piece</h2>
            <div className="rule-gold mx-auto mt-6" />
          </div>
        </Reveal>
        <div className="grid gap-10 sm:grid-cols-2">
          {ROYALE_STEPS.map((s, i) => (
            <Reveal key={s.step} delay={(i % 2 + 1) as 1 | 2}>
              <div className="border-t border-ink/15 pt-6">
                <p className="font-editorial text-4xl text-gold">{s.step}</p>
                <h3 className="font-editorial text-2xl mt-3 mb-2">{s.title}</h3>
                <p className="text-stone leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Showcase — completed Royale pieces may appear in the gallery */}
      {showcase.length > 0 && (
        <section className="bg-linen">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-20">
            <Reveal>
              <div className="text-center mb-12">
                <p className="overline-label mb-3">Royale Gallery</p>
                <h2 className="font-editorial text-3xl sm:text-4xl">Work from the atelier</h2>
                <p className="text-stone mt-3 max-w-xl mx-auto">
                  Completed Royale commissions, shown as inspiration for what we
                  can create around you.
                </p>
              </div>
            </Reveal>
            <ProductGrid products={showcase} />
          </div>
        </section>
      )}

      {/* Consultation CTA */}
      <section className="mx-auto max-w-3xl px-5 sm:px-8 py-20 lg:py-28 text-center">
        <Reveal>
          <p className="overline-label mb-4">Client Service</p>
          <h2 className="font-editorial text-3xl sm:text-5xl leading-tight mb-6">
            Your consultation begins with a conversation
          </h2>
          <p className="text-stone leading-relaxed max-w-xl mx-auto mb-10">
            Submit a Royale request and our team will reach out to shape the
            brief with you. Every request receives a reference and a personal
            response — no automated quotes, no obligation.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/royale/request" className="btn-lux btn-lux-primary">
              Request Consultation
            </Link>
            <WhatsAppCTAButton
              message="Hello DREAMZ, I would like to begin a Royale consultation."
              whatsappNumber={whatsappNumber}
              label="Continue on WhatsApp"
            />
          </div>
        </Reveal>
      </section>
    </div>
  );
}
