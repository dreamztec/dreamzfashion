import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DESIGNER_PLANS, designerPlanPriceLabel } from "@/lib/designer-plans";
import { requestDesignerUpgrade } from "@/server/designer.functions";
import { useAuth } from "@/lib/auth-client";
import { CONTACT } from "@/lib/contact";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/studio-plans")({
  head: () => ({
    meta: [
      { title: `DREAMZ Creator Studio Plans — ${BRAND.name}` },
      {
        name: "description",
        content: "Start with three free DREAMZ leather designs, then unlock more design capacity, client tools and family projects.",
      },
    ],
  }),
  component: StudioPlans,
});

function StudioPlans() {
  const { user } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = async (plan: "free" | "creator" | "studio" | "pro") => {
    if (plan === "free") return;
    if (!user) return;
    setPending(plan);
    setNotice(null);
    try {
      const response = await requestDesignerUpgrade({ data: { requestedPlan: plan, note: "" } });
      if (response.ok) setNotice("Upgrade request received. DREAMZ will confirm activation and payment instructions with you.");
      else setNotice("Please sign in before requesting an upgrade.");
    } catch {
      setNotice("We couldn't send the upgrade request just now. Contact DREAMZ on WhatsApp instead.");
    } finally {
      setPending(null);
    }
  };

  const whatsapp = "https://wa.me/" + CONTACT.whatsappNumber.replace(/\D/g, "") +
    "?text=" + encodeURIComponent("Hello DREAMZ, I want to upgrade my DREAMZ Creator Studio plan.");

  return (
    <div>
      <header className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-12 text-center">
        <p className="overline-label mb-3">DREAMZ Open Atelier</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">Create more. Serve clients. Build your page.</h1>
        <p className="mt-5 max-w-2xl mx-auto text-stone leading-relaxed">
          Everyone starts free with three saved designs and a public Dreamer page.
          Paid Studio plans increase creation capacity and unlock professional workflow tools — they do not buy votes, guaranteed sales or guaranteed income.
        </p>
      </header>

      {notice && (
        <div className="mx-auto max-w-3xl px-5 mb-6">
          <div className="border border-gold/40 bg-gold/5 px-4 py-3 text-sm">{notice}</div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-16">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {DESIGNER_PLANS.map((plan) => (
            <article key={plan.id} className={"border p-6 flex flex-col " + (plan.id === "creator" ? "border-gold/60 bg-gold/5" : "border-ink/10")}>
              <p className="overline-label">{plan.id === "free" ? "Start here" : "Creator Studio"}</p>
              <h2 className="font-editorial text-3xl mt-2">{plan.name}</h2>
              <p className="font-editorial text-xl mt-2">{designerPlanPriceLabel(plan)}</p>
              <p className="text-sm text-stone mt-3 leading-relaxed">{plan.summary}</p>
              <p className="mt-5 text-xs uppercase tracking-btn">{plan.designLimit} saved designs / season</p>
              <ul className="mt-5 space-y-2 text-sm text-stone flex-1">
                {plan.benefits.map((benefit) => <li key={benefit}>✓ {benefit}</li>)}
              </ul>

              {plan.id === "free" ? (
                <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-outline mt-7 text-center">
                  Start Free
                </Link>
              ) : user ? (
                <button
                  type="button"
                  disabled={pending === plan.id}
                  onClick={() => void request(plan.id)}
                  className="btn-lux btn-lux-primary mt-7"
                >
                  {pending === plan.id ? "Sending…" : "Request " + plan.name}
                </button>
              ) : (
                <Link to="/account/login" search={{ reset: undefined, returnTo: "/studio-plans" }} className="btn-lux btn-lux-primary mt-7 text-center">
                  Sign In to Upgrade
                </Link>
              )}
            </article>
          ))}
        </div>

        <div className="mt-8 border border-ink/10 p-5 text-xs text-stone leading-relaxed">
          Online plan payment is not activated on the site yet. Upgrade requests are reviewed by DREAMZ and activated only after payment is independently confirmed. Your current access does not disappear while a request is pending.
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="underline text-ink ml-1">Contact DREAMZ on WhatsApp.</a>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-ivory-deep">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="border border-ink/10 bg-ivory p-7">
              <p className="overline-label">Private Service · Abuja</p>
              <h2 className="font-editorial text-3xl mt-2">Mr Dreamz Private Atelier Visit</h2>
              <p className="font-editorial text-2xl mt-3">₦250,000 booking</p>
              <p className="text-sm text-stone mt-4 leading-relaxed">
                An in-person DREAMZ design and fitting session at your agreed location in Abuja.
                Use it for yourself, a couple, a family or a private wardrobe consultation. Production of the leather pieces is quoted separately.
              </p>
              <p className="text-xs text-stone mt-3">Outside Abuja: transportation and accommodation, where required, are added separately.</p>
              <a
                href={"https://wa.me/" + CONTACT.whatsappNumber.replace(/\D/g, "") + "?text=" + encodeURIComponent("Hello DREAMZ, I want to book the ₦250,000 Mr Dreamz Private Atelier Visit.")}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lux btn-lux-primary inline-block mt-6"
              >
                Request a Private Visit
              </a>
            </article>

            <article className="border border-ink/10 bg-ivory p-7">
              <p className="overline-label">Private House</p>
              <h2 className="font-editorial text-3xl mt-2">Concierge Design Relationship</h2>
              <p className="font-editorial text-2xl mt-3">From ₦1,000,000</p>
              <p className="text-sm text-stone mt-4 leading-relaxed">
                For families, executives and private clients who want an ongoing relationship with the DREAMZ atelier: dedicated consultations, organised measurement/design records and priority coordination.
              </p>
              <p className="text-xs text-stone mt-3">Scope and production are agreed in a private proposal before commitment.</p>
              <Link to="/royale" className="btn-lux btn-lux-outline inline-block mt-6">
                Explore DREAMZ Royale
              </Link>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
