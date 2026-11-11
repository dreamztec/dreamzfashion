import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-client";
import { getPassport, savePassportDream, claimPassport, submitPassportTicket } from "@/server/passports.functions";
import { img } from "@/lib/img";

export const Route = createFileRoute("/p/$code")({
  head: () => ({ meta: [{ title: "Your Product Passport — DREAMZ" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ProductPassport,
});
type Passport = Awaited<ReturnType<typeof getPassport>>;
function ProductPassport() {
  const { code } = Route.useParams();
  const { user, loading, passwordAction } = useAuth();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dream, setDream] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const validCode = /^DRZ-\d{6,12}$/.test(code);
  const signedIn = !!user && !passwordAction;
  const reload = useCallback(async () => { const p = await getPassport({ data: { code } }); setPassport(p); setDream(p.dream); }, [code]);
  useEffect(() => {
    let active = true;
    setPassport(null); setError(""); setNotice("");
    if (signedIn && validCode) getPassport({ data: { code } }).then(p => { if (active) { setPassport(p); setDream(p.dream); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : "Could not load your passport. Please try again."); });
    return () => { active = false; };
  }, [code, user?.id, signedIn, validCode]);
  async function act(fn: () => Promise<unknown>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); await reload(); setNotice(message); } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(false); }
  }
  async function support(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form);
    await act(async () => { await submitPassportTicket({ data: { code, kind: String(fd.get("kind")) as "Care question", message: String(fd.get("message")) } }); form.reset(); }, "Your request has been received. You can follow its progress below.");
  }
  return <main className="mx-auto max-w-6xl px-5 sm:px-8 pt-32 pb-20">
    <div className="flex flex-wrap justify-between gap-4 mb-9 text-xs uppercase tracking-widest"><Link to="/">DREAMZ Fashion ↗</Link><Link to="/account/passports">My passports</Link></div>
    <section className="bg-ink text-white p-7 sm:p-12 relative overflow-hidden">
      <p className="text-xs tracking-[.25em] uppercase text-gold mb-6">DREAMZ Product Passport</p>
      <h1 className="font-editorial text-5xl sm:text-7xl max-w-2xl leading-tight">Every piece has a story.<br /><span className="text-gold">This is where it lives.</span></h1>
      <p className="mt-6 max-w-xl text-white/75 leading-relaxed">The inspiration. The craft. The care that keeps it with you. One permanent home for your DREAMZ piece.</p>
      <div className="border-t border-white/20 mt-9 pt-5 flex flex-wrap justify-between gap-4"><span className="font-mono tracking-wider">{validCode ? code : "Check your product number"}</span><span className="text-sm text-white/60">Made for your journey</span></div>
    </section>
    {!validCode ? <p role="alert" className="mt-8">This passport number is not valid. Please check the QR code or contact DREAMZ.</p> : loading ? <p role="status" className="mt-8">Checking your account…</p> : !signedIn ? <section className="max-w-2xl mx-auto text-center py-12">
      <p className="overline-label mb-3">Your story starts here</p><h2 className="font-editorial text-4xl">Open your product passport</h2>
      <p className="text-stone mt-4 leading-relaxed">Create a DREAMZ account with your email, verify it, then sign in to discover the product story, care guide and support. Already a member? Use your existing account.</p>
      <Link to="/account/login" search={{ returnTo: `/p/${code}` }} className="btn-lux btn-lux-primary mt-7">Create an account / Sign in</Link>
      <p className="text-xs text-stone mt-5">Scanning lets you explore a piece. Ownership is confirmed separately with the private code supplied by DREAMZ.</p>
      <Link to="/shop" className="inline-block underline mt-6 text-sm">Explore the DREAMZ website</Link>
    </section> : <>
      {error && <div role="alert" className="my-6 border border-oxblood p-4">{error}<button className="underline ml-3" onClick={() => void act(reload, "Passport refreshed.")} disabled={busy}>Try again</button></div>}
      {notice && <p role="status" className="my-6 border border-gold p-4">{notice}</p>}
      {!passport && !error && <p role="status" className="py-10">Opening the story…</p>}
      {passport && <div className="space-y-12 mt-12">
        <section className="grid md:grid-cols-[1.5fr_1fr] gap-10">
          <div><p className="overline-label mb-3">01 / The product story</p><h2 className="font-editorial text-5xl mb-5">{passport.title}</h2><p className="whitespace-pre-line leading-relaxed text-stone">{passport.story}</p></div>
          <aside className="border border-ink/15 p-6">
            {passport.imageUrl && <img src={img(passport.imageUrl, { w: 640 })} alt={passport.title} className="w-full aspect-square object-contain mb-5" />}
            <p className="text-xs uppercase tracking-widest text-stone">Product record</p><p className="font-mono text-2xl my-3">{passport.code}</p>
            <dl className="text-sm space-y-4"><div><dt className="text-stone">Collection</dt><dd>{passport.collection || "DREAMZ"}</dd></div><div><dt className="text-stone">Category</dt><dd>{passport.category}</dd></div><div><dt className="text-stone">Progress</dt><dd>{passport.productionStatus}</dd></div><div><dt className="text-stone">Ownership</dt><dd>{passport.isOwner ? "Registered to your account" : "You are viewing this product story"}</dd></div></dl>
          </aside>
        </section>
        {code === "DRZ-000001" && <section className="border-y border-gold/40 py-8"><p className="overline-label mb-3">02 / The Billionaire Dream journal</p><h2 className="font-editorial text-3xl mb-3">The first documented chapter</h2><p className="text-stone max-w-3xl leading-relaxed">VANITY FLEX begins our Product Passport record: a step in building DREAMZ into a billion-naira business through thoughtful leather products and lasting customer relationships. This record follows the piece as it moves from production into its owner's journey.</p></section>}
        <section className="bg-gold/10 p-7 sm:p-10"><p className="overline-label mb-4">A note for your journey</p><blockquote className="font-editorial text-3xl">{passport.encouragement}</blockquote>
          <form className="mt-8" onSubmit={e => { e.preventDefault(); void act(() => savePassportDream({ data: { code, dream } }), "Saved to your account. Your dream is private."); }}><label htmlFor="passport-dream" className="input-lux-label">What dream are you walking towards?</label><textarea id="passport-dream" maxLength={1000} className="input-lux min-h-28" value={dream} onChange={e => setDream(e.target.value)} placeholder="Write your dream, or simply save this passport." /><p className="text-xs text-stone mt-2">Only you can view this note in your account. It does not appear to other people scanning the QR.</p><button disabled={busy} className="btn-lux btn-lux-primary mt-4">{busy ? "Saving…" : passport.saved ? "Update my dream" : "Save to my passports"}</button></form>
        </section>
        <section><p className="overline-label mb-3">Care for the journey ahead</p><h2 className="font-editorial text-4xl mb-6">Know your piece</h2><div className="grid md:grid-cols-3 gap-6">{[["Materials & construction", passport.materials], ["Your care guide", passport.care], ["Expected service life", passport.lifespan]].map(([title, body]) => <article key={title} className="border border-ink/15 p-6"><h3 className="font-editorial text-2xl mb-3">{title}</h3><p className="text-sm text-stone whitespace-pre-line leading-relaxed">{body}</p></article>)}</div></section>
        {!passport.isOwner && <section className="border border-ink/15 p-6"><h2 className="font-editorial text-3xl">Is this your product?</h2>{passport.canClaim ? <form className="mt-4 max-w-lg" onSubmit={e => { e.preventDefault(); void act(() => claimPassport({ data: { code, claimCode } }), "Ownership confirmed. This product is now linked to your account."); }}><label htmlFor="claim-code" className="input-lux-label">Private claim code from inside your package</label><input id="claim-code" className="input-lux" value={claimCode} onChange={e => setClaimCode(e.target.value)} minLength={12} maxLength={100} required autoComplete="off" /><button disabled={busy} className="btn-lux btn-lux-outline mt-4">Register my ownership</button></form> : <p className="text-stone mt-3">Ask DREAMZ to confirm your ownership using the support form below. The printed QR is a product link, not proof of ownership.</p>}</section>}
        <section className="grid md:grid-cols-2 gap-10"><div><p className="overline-label mb-3">We stay with the product</p><h2 className="font-editorial text-4xl mb-4">Care, repairs & support</h2><p className="text-stone mb-5">Your request goes to the DREAMZ team and is visible only to you and authorised staff. Return here to read their response.</p><form onSubmit={support} className="space-y-4"><label className="block input-lux-label">How can we help?<select name="kind" className="input-lux mt-2">{["Care question", "Repair request", "Complaint", "Ownership help"].map(k => <option key={k}>{k}</option>)}</select></label><label className="block input-lux-label">Tell us what happened<textarea name="message" className="input-lux min-h-32 mt-2" minLength={10} maxLength={3000} required /></label><button className="btn-lux btn-lux-primary" disabled={busy}>{busy ? "Sending…" : "Send to DREAMZ"}</button></form></div><div><h3 className="font-editorial text-3xl mb-5">Your support history</h3>{passport.tickets.length === 0 ? <p className="text-stone">You have no support requests for this piece yet.</p> : passport.tickets.map(t => <article key={t.id} className="border border-ink/15 p-5 mb-4"><p className="text-xs uppercase tracking-wider">Request #{t.id} · {t.status}</p><h4 className="mt-3 font-medium">{t.kind}</h4><p className="text-sm text-stone whitespace-pre-line mt-2">{t.message}</p>{t.reply && <div className="bg-gold/10 p-3 mt-4"><p className="text-xs uppercase mb-2">DREAMZ response</p><p className="text-sm whitespace-pre-line">{t.reply}</p></div>}</article>)}</div></section>
        <p className="text-xs text-stone border-t border-ink/10 pt-6">Record updated {new Date(passport.updatedAt).toLocaleDateString("en-NG")}. Keep this QR or product number for future visits.</p>
      </div>}
    </>}
  </main>;
}
