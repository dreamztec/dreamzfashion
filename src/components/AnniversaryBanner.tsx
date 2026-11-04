import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

/**
 * DREAMZ 5-Year Experience — elegant anniversary announcement.
 *
 * Presented as a refined introductory panel on the homepage's first
 * meaningful view; dismissible and remembered for the session so it never
 * repeatedly interrupts the shopper. "The Billion-Naira Collection." is the
 * campaign's name for the anniversary collection ambition — it never claims
 * an amount already earned.
 */

const DISMISS_KEY = "dfk-5yr-banner-dismissed";
export const ANNIVERSARY_DISMISS_KEY = DISMISS_KEY;
const ANNIVERSARY_DATE = "2027-06-12T00:00:00+01:00"; // 12 June 2027, West Africa Time

/** Whole days remaining until 12 June 2027; null once the date has passed. */
export function bannerDaysUntil(now: number): number | null {
  const target = new Date(ANNIVERSARY_DATE).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - now;
  return diff > 0 ? Math.ceil(diff / 86_400_000) : null;
}

export function AnniversaryBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    // Session-scoped: the banner returns next session, never mid-visit.
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    setDays(bannerDaysUntil(Date.now()));
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private browsing — dismiss for this render only */
    }
    setDismissed(true);
  };

  return (
    <section
      aria-label="DREAMZ 5-Year Experience announcement"
      className="mx-auto max-w-7xl px-5 sm:px-8 pb-12"
    >
      <div className="relative border border-gold/50 bg-ink text-ivory px-6 sm:px-12 py-10 sm:py-14 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-gold blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-gold blur-3xl" />
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the anniversary announcement"
          className="absolute top-3 right-3 p-2 text-ivory/70 hover:text-ivory transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden="true">
            <path d="M2 2l14 14M16 2L2 16" />
          </svg>
        </button>

        <p className="overline-label !text-gold-soft mb-4">DREAMZ — 5 YEARS</p>
        <p className="font-editorial text-2xl sm:text-3xl tracking-wide">12 JUNE 2027</p>
        <h2 className="font-editorial text-3xl sm:text-5xl mt-3 leading-tight uppercase">
          The Billion-Naira Collection.
        </h2>
        <p className="mt-4 text-ivory/80 text-sm max-w-xl mx-auto leading-relaxed">
          The DREAMZ 5-Year Experience — our fifth-anniversary collection
          ambition. Early-access members see every piece first.
        </p>
        {days != null && (
          <p className="mt-3 text-[0.66rem] uppercase tracking-btn text-ivory/60" aria-label={`${days} days until 12 June 2027`}>
            {days.toLocaleString("en-NG")} days to 12 June 2027
          </p>
        )}
        <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/dreamz-5" className="btn-lux btn-lux-gold">
            Discover the 5-Year Experience
          </Link>
          <Link
            to="/dreamz-5"
            className="btn-lux text-ivory border border-ivory/40 hover:border-ivory"
          >
            Join Early Access
          </Link>
        </div>
      </div>
    </section>
  );
}
