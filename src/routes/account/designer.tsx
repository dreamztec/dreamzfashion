import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyDesignerState, updateDesignerProfile } from "@/server/designer.functions";
import { designerPlanPriceLabel } from "@/lib/designer-plans";

export const Route = createFileRoute("/account/designer")({
  component: DesignerAccount,
});

type State = Awaited<ReturnType<typeof getMyDesignerState>>;

function DesignerAccount() {
  const [state, setState] = useState<State | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [dreamStatement, setDreamStatement] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    getMyDesignerState()
      .then((next) => {
        setState(next);
        if (!next.unauthenticated && next.profile) {
          setDisplayName(next.profile.displayName);
          setDreamStatement(next.profile.dreamStatement);
          setBio(next.profile.bio);
          setIsPublic(next.profile.isPublic);
        }
      })
      .catch(() => setNotice("Your designer profile could not be loaded just now."));
  }, []);

  const save = async () => {
    if (!displayName.trim()) {
      setNotice("Choose the public name you want shown on your Dreamer page.");
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await updateDesignerProfile({
        data: { displayName: displayName.trim(), dreamStatement, bio, isPublic },
      });
      if (!response.ok) {
        setNotice("Please sign in again and retry.");
        return;
      }
      setNotice("Your Dreamer page has been updated.");
      const next = await getMyDesignerState();
      setState(next);
    } catch {
      setNotice("Your Dreamer page could not be updated just now.");
    } finally {
      setSaving(false);
    }
  };

  if (!state) return <div className="skeleton h-64 w-full" />;
  if (state.unauthenticated) return <p className="text-stone">Please sign in to manage your Dreamer page.</p>;

  const plan = state.plan;

  return (
    <div>
      <div className="flex flex-wrap justify-between gap-4 items-start mb-8">
        <div>
          <p className="overline-label mb-2">DREAMZ Open Atelier</p>
          <h1 className="font-editorial text-3xl">My Dreamer Page</h1>
        </div>
        <Link to="/studio-plans" className="btn-lux btn-lux-outline !py-2.5">Upgrade Studio</Link>
      </div>

      {notice && <div className="border border-gold/40 bg-gold/5 px-4 py-3 text-sm mb-6">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="border border-ink/10 p-6">
          {state.profile ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <label>
                  <span className="text-xs uppercase tracking-btn">Public designer name</span>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-lux mt-2" maxLength={80} />
                </label>
                <label>
                  <span className="text-xs uppercase tracking-btn">Your dream</span>
                  <input value={dreamStatement} onChange={(e) => setDreamStatement(e.target.value)} className="input-lux mt-2" maxLength={180} placeholder="My dream is to…" />
                </label>
              </div>
              <label className="block mt-4">
                <span className="text-xs uppercase tracking-btn">Short bio</span>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-lux mt-2 min-h-28" maxLength={600} placeholder="Tell people what you create or care about. Do not publish private contact details." />
              </label>
              <label className="mt-4 flex items-start gap-3 text-sm">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-1" />
                <span>
                  <strong>Show my Dreamer page publicly.</strong>
                  <span className="block text-xs text-stone mt-1">Only designs you explicitly publish appear. Private designs and reference images stay hidden.</span>
                </span>
              </label>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" disabled={saving} onClick={() => void save()} className="btn-lux btn-lux-primary">
                  {saving ? "Saving…" : "Save Dreamer Page"}
                </button>
                {state.profile.isPublic && (
                  <Link to="/dreamer/$slug" params={{ slug: state.profile.slug }} className="btn-lux btn-lux-outline">
                    View Public Page
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div>
              <h2 className="font-editorial text-2xl">Your page is created with your first saved design.</h2>
              <p className="text-sm text-stone mt-3">Start designing and DREAMZ will automatically create your Dreamer identity and portfolio.</p>
              <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary inline-block mt-5">
                Create My First Design
              </Link>
            </div>
          )}
        </div>

        <aside className="border border-ink/10 p-5 h-fit">
          <p className="overline-label">Current Studio</p>
          <h2 className="font-editorial text-2xl mt-2">{plan.name}</h2>
          <p className="text-sm mt-1">{designerPlanPriceLabel(plan)}</p>
          <div className="mt-5">
            <p className="text-xs uppercase tracking-btn">Design capacity</p>
            <p className="font-editorial text-3xl mt-1">{state.used} / {plan.designLimit}</p>
            <p className="text-xs text-stone mt-1">{state.remaining} remaining this season</p>
          </div>
          {state.profile?.foundingNumber && (
            <p className="mt-5 border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-gold">
              Founding Dreamer #{String(state.profile.foundingNumber).padStart(3, "0")}
            </p>
          )}
          {state.pendingUpgrade && (
            <p className="mt-4 text-xs text-stone">
              Upgrade request pending: <strong>{state.pendingUpgrade.requestedPlan}</strong>.
            </p>
          )}
          <Link to="/account/designs" className="nav-link inline-block mt-5 text-xs">Manage my designs →</Link>
          {state.earnCode ? (
            <p className="mt-4 text-xs text-forest">Earn with DREAMZ active · code {state.earnCode}</p>
          ) : (
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="text-xs text-stone leading-relaxed">Want verified sales from your shared links to qualify for earnings? Activate the free Earn with DREAMZ programme.</p>
              <Link to="/earn" className="nav-link inline-block mt-2 text-xs">Activate Earn — free →</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
