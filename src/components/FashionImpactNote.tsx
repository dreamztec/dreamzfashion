import { Link } from "@tanstack/react-router";

const NETWORK_GROUP = "https://mydreamnetwork.dreamz-gc.com/dreamz-group";
const NETWORK_DREAM = "https://mydreamnetwork.dreamz-gc.com/dreams/new";

/**
 * The fashion storefront is about products and customers, not group accounts.
 * Only the Dreams 2 Reality network owns and reports DREAMZ Group progress.
 */
export function FashionImpactNote({ full = false }: { full?: boolean }) {
  return (
    <section className={"bg-ivory " + (full ? "pt-32 pb-20" : "py-10")} aria-labelledby="dreamz-impact-title">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="border-y border-ink/15 py-8 sm:py-10 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div className="max-w-2xl">
            <p className="overline-label !text-brand-purple">Every order can support a dream</p>
            <h2 id="dreamz-impact-title" className="font-editorial text-3xl sm:text-4xl mt-3">
              Your dream outfit. Someone else’s next opportunity.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone leading-relaxed">
              When you shop or design with DREAMZ Fashion, you support a bigger mission:
              helping people around the world work toward their dreams.
            </p>
            <p className="mt-3 text-sm text-stone">
              <strong className="text-ink">DREAMZ Group commits 1% of its revenue to supporting dreams.</strong>
              {" "}This is a commitment from the Group, not an extra fee added to your order.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-6 sm:mt-0 sm:shrink-0">
            <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary">
              Design Your Dream Outfit
            </Link>
            <a href={NETWORK_GROUP} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-outline">
              Explore Our Mission ↗
            </a>
          </div>
        </div>
        {full && (
          <div className="mt-8">
            <p className="text-sm text-stone">Have a dream beyond fashion? You can make a plan and track your own progress for free on Dreams to Reality.</p>
            <a href={NETWORK_DREAM} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 underline underline-offset-4 font-semibold">
              Create and track your own dream ↗
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
