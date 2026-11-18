import { Link, createFileRoute } from "@tanstack/react-router";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/studio-plans")({
  head: () => ({
    meta: [
      { title: `Design Your Dream — Free DREAMZ Studio — ${BRAND.name}` },
      { name: "description", content: "DREAMZ design Studio is free. Make and share leather design ideas, explore materials and submit selected concepts for a production quote. No subscriptions." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: FreeStudio,
});

function FreeStudio() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-5 sm:px-8 pt-32 pb-20 text-center">
        <p className="overline-label mb-3">DREAMZ OPEN ATELIER</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">The Dream Studio is free.</h1>
        <p className="text-stone mt-6 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          No monthly or yearly subscriptions. Create your leather concept, explore
          the details, save it privately, share it publicly when ready and
          request a quotation if you want DREAMZ to manufacture it.
          New Dreamer accounts can save up to 30 designs.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-9">
          <Link to="/custom" search={{design:undefined,t:undefined,start:"1",brief:undefined}} className="btn-lux btn-lux-primary">Design My Dream</Link>
          <Link to="/dreams" className="btn-lux btn-lux-outline">Explore Community Designs</Link>
          <Link to="/shop" search={{q:undefined,tier:undefined,min:undefined,max:undefined,size:undefined,colour:undefined,availability:undefined,sort:undefined}} className="btn-lux btn-lux-outline">Shop DREAMZ</Link>
        </div>
        <p className="text-xs text-stone mt-7">AI image previews may be subject to fair-use limits. A design preview is not a manufactured product or a guaranteed production approval. Existing approved Studio access is honoured under its original terms.</p>
      </section>
    </div>
  );
}
