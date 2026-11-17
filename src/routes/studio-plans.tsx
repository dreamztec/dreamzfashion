import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PUBLIC_DESIGNER_PLANS, designerPlanPriceLabel, type DesignerPlanId } from "@/lib/designer-plans";
import { requestDesignerUpgrade } from "@/server/designer.functions";
import { useAuth } from "@/lib/auth-client";
import { waLink } from "@/lib/contact";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/studio-plans")({
  head: () => ({
    meta: [
      { title: `Design Studio Access — Dreamer, Creator Plus, Studio Pro — ${BRAND.name}` },
      { name: "description", content: "Start designing free with DREAMZ. Upgrade to a non-recurring 30-day Creator Plus or Studio Pro design-access pass when you need more projects." },
    ],
  }),
  component: StudioPlansPage,
});

function StudioPlansPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = async (plan: DesignerPlanId) => {
    if (plan === "free" || plan === "pro" || !user) return;
    setPending(plan);
    setNotice(null);
    try {
      const res = await requestDesignerUpgrade({ data: { requestedPlan: plan, note: "New Creator Studio access pass: confirm 30-day term and advertised price before activation." } });
      setNotice(res.ok ? "Request recorded. DREAMZ will confirm availability, price and payment instructions before activation." : "Sign in to request access.");
    } catch {
      setNotice("We could not submit the request right now. Please contact DREAMZ directly.");
    } finally { setPending(null); }
  };

  return (
    <div>
      <header className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-12 text-center">
        <p className="overline-label mb-3">DREAMZ DESIGN STUDIO</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">One dream. More ways to create.</h1>
        <p className="mt-5 max-w-2xl mx-auto text-stone leading-relaxed">
          Start free. Move to Creator Plus when you need more design space,
          or Studio Pro when creating for clients. Paid access is a fixed 30-day pass,
          not an automatically renewing monthly or yearly subscription.
          Designing a product does not automatically place a manufacturing order.
        </p>
      </header>

      {notice && <p role="status" className="max-w-3xl mx-auto mb-5 px-5 text-sm text-oxblood">{notice}</p>}

      <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {PUBLIC_DESIGNER_PLANS.map((plan) => (
            <article key={plan.id} className={`border p-7 flex flex-col ${plan.id === "creator" ? "border-gold bg-gold/5" : "border-ink/10"}`}>
              <p className="overline-label">{plan.id==="free" ? "Start here" : plan.id==="creator" ? "For creators" : "For client professionals"}</p>
              <h2 className="font-editorial text-3xl mt-2">{plan.name}</h2>
              <p className="font-editorial text-xl mt-3">{designerPlanPriceLabel(plan)}</p>
              <p className="text-sm text-stone mt-4 leading-relaxed">{plan.summary}</p>
              <p className="text-xs uppercase tracking-btn mt-5">{plan.designLimit} total saved projects</p>
              <ul className="text-sm text-stone space-y-2 mt-5 flex-1">
                {plan.benefits.map(x=><li key={x}>✓ {x}</li>)}
              </ul>
              {plan.id==="free" ? (
                <Link to="/custom" search={{design:undefined,t:undefined,start:"1",brief:undefined}} className="btn-lux btn-lux-outline mt-7 text-center">Start free</Link>
              ) : user ? (
                <button type="button" className="btn-lux btn-lux-primary mt-7" disabled={pending===plan.id} onClick={()=>void request(plan.id)}>{pending===plan.id?"Sending…":"Request "+plan.name}</button>
              ) : (
                <Link to="/account/login" search={{reset:undefined,returnTo:"/studio-plans"}} className="btn-lux btn-lux-primary mt-7 text-center">Sign in to request</Link>
              )}
            </article>
          ))}
        </div>
        <p className="text-xs text-stone leading-relaxed mt-8 border border-ink/10 p-5">
          Paid Studio passes are reviewed and activated manually after payment is verified; online pass checkout is not active.
          The access clock starts upon confirmed activation and does not auto-renew.
          The save limit is the total number of projects in an account, not a new quota every month.
          Creating, publishing or sharing a design is free from any promise of sales, commission or production.
          Existing previously approved paid access keeps its originally agreed term.
          <a href={waLink("Hello DREAMZ, I would like to discuss Creator Studio access.")} target="_blank" rel="noopener noreferrer" className="underline ml-1">Speak to DREAMZ.</a>
        </p>
      </section>
      <section className="bg-ivory-deep">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-14">
          <h2 className="font-editorial text-3xl">Want us to make it real?</h2>
          <p className="text-stone mt-3 max-w-2xl">Design a leather piece, share your story and ask DREAMZ for a production quote. For a private wardrobe service, explore our Royale atelier. For a signature collection with your audience, apply to the Creator Collaboration programme instead of buying a Studio pass.</p>
          <div className="flex gap-3 flex-wrap mt-6">
            <Link to="/custom" search={{design:undefined,t:undefined,start:"1",brief:undefined}} className="btn-lux btn-lux-primary">Design your dream</Link>
            <Link to="/creators" className="btn-lux btn-lux-outline">Creator collaborations</Link>
            <Link to="/royale" className="btn-lux btn-lux-outline">Private Royale</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
