import { Link, createFileRoute } from "@tanstack/react-router";
import { getSiteSettings } from "@/server/catalog.functions";
import { Reveal } from "@/components/Reveal";
import { WhatsAppCTAButton } from "@/components/whatsapp";
import { ImageComingSoon } from "@/components/brand";
import { BRAND } from "@/lib/config";
import { useAuth } from "@/lib/auth-client";

export const Route = createFileRoute("/rewards")({
  loader: async () => ({ settings: await getSiteSettings() }),
  head: () => ({
    meta: [
      { title: `DREAMZ Rewards — ${BRAND.name}` },
      {
        name: "description",
        content:
          "DREAMZ Rewards — earn points on verified orders, refer friends, claim printed vouchers. Rewards powered by TisasNG.",
      },
    ],
  }),
  component: RewardsPage,
});

const PILLARS = [
  {
    title: "Shop",
    body: "Every verified order can earn DREAMZ Points once the programme rates are confirmed by the house.",
  },
  {
    title: "Earn",
    body: "Points, shopping credit and vouchers are tracked in your personal reward ledger — nothing invented, everything recorded.",
  },
  {
    title: "Refer",
    body: "Share your referral link, and when a referred friend's order is verified, your reward enters the ledger.",
  },
  {
    title: "Return",
    body: "Vouchers, credit and points wait in your wallet for your next piece.",
  },
];

function RewardsPage() {
  const { settings } = Route.useLoaderData() as { settings: Record<string, unknown> };
  const { user, loading } = useAuth();
  const whatsappNumber =
    (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "";

  return (
    <div>
      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-40 pb-14 text-center">
        <p className="overline-label mb-4">DREAMZ REWARDS</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">Shop. Earn. Refer. Return.</h1>
        <div className="rule-gold mx-auto mt-7" />
        <p className="text-stone mt-6 leading-relaxed max-w-xl mx-auto">
          A loyalty experience built around the house — every point, credit and
          voucher recorded in your own ledger, visible whenever you sign in.
          Rewards powered by TisasNG.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {!loading && user ? (
            <Link to="/account/rewards" className="btn-lux btn-lux-primary">
              Go to My Rewards
            </Link>
          ) : (
            <Link to="/account/login" className="btn-lux btn-lux-primary">
              Join DREAMZ Rewards
            </Link>
          )}
          <Link to="/voucher" className="btn-lux btn-lux-outline">
            Redeem a Voucher
          </Link>
        </div>
      </section>

      <section className="bg-linen">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={(i + 1) as 1 | 2 | 3}>
              <div className="h-full border-t border-ink/15 pt-5">
                <h2 className="font-editorial text-2xl mb-2">{p.title}</h2>
                <p className="text-sm text-stone leading-relaxed">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-24 grid gap-10 lg:grid-cols-2 items-center">
        <Reveal>
          <p className="overline-label mb-4">Have a printed DREAMZ voucher?</p>
          <h2 className="font-editorial text-3xl sm:text-4xl leading-tight mb-4">
            Your voucher lives in your account
          </h2>
          <p className="text-stone leading-relaxed mb-8 max-w-lg">
            Enter the code from your printed DREAMZ voucher and it moves into
            your wallet — ready to apply at checkout or keep for later.
          </p>
          <Link to="/voucher" className="btn-lux btn-lux-primary">
            Enter Voucher Code
          </Link>
        </Reveal>
        <ImageComingSoon aspect="aspect-[4/3]" label="DREAMZ Rewards — image coming soon" />
      </section>

      <section className="mx-auto max-w-3xl px-5 sm:px-8 pb-20 text-center">
        <Reveal>
          <h2 className="font-editorial text-3xl mb-4">Questions about rewards?</h2>
          <p className="text-stone mb-8">
            Our client team answers on WhatsApp.
          </p>
          <WhatsAppCTAButton
            message="Hello DREAMZ, I have a question about DREAMZ Rewards."
            whatsappNumber={whatsappNumber}
            label="Ask on WhatsApp"
          />
        </Reveal>
      </section>
    </div>
  );
}
