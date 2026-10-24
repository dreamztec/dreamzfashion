import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/config";
import { Wordmark } from "@/components/brand";
import { useCart, useCartHydrated } from "@/store/cart";
import { useAuth } from "@/lib/auth-client";

const PRIMARY_NAV: Array<{ label: string; to: string }> = [
  { label: "Shop", to: "/shop" },
  { label: "Design Yours", to: "/custom" },
  { label: "Earn with DREAMZ", to: "/earn" },
  { label: "Corporate Orders", to: "/corporate" },
];

export function Header({
  announcement,
}: {
  announcement?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hydrated = useCartHydrated((s) => s.hydrated);
  const count = useCart((s) => (hydrated ? s.count() : 0));
  const openCart = useCart((s) => s.open);
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  // Header is transparent over the hero on the homepage until scrolled.
  const transparent = isHome && !scrolled && !mobileOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="fixed top-0 inset-x-0 z-[70]">
      {announcement && (
        <div className="bg-ink text-ivory text-[0.62rem] uppercase tracking-luxe text-center py-2 px-4">
          {announcement}
        </div>
      )}
      <div
        className={`transition-colors duration-300 ${
          transparent
            ? "bg-transparent text-ivory"
            : "bg-ivory/95 backdrop-blur border-b border-ink/10 text-ink"
        }`}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: mobile menu + primary nav */}
            <div className="flex items-center gap-6 flex-1">
              <button
                className="lg:hidden p-2 -ml-2"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" stroke="currentColor" strokeWidth="1.4" fill="none">
                  {mobileOpen ? (
                    <path d="M3 3l14 14M17 3L3 17" />
                  ) : (
                    <path d="M2 6h16M2 14h16" />
                  )}
                </svg>
              </button>
              <nav className="hidden lg:flex items-center gap-5" aria-label="Primary">
                {PRIMARY_NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    search={item.to === "/shop" ? { q: undefined } : undefined}
                    className="nav-link text-[0.62rem] uppercase tracking-btn whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Center: wordmark (text-based until approved branding is uploaded) */}
            <Link to="/" aria-label={`${BRAND.name} — home`} className="shrink-0">
              {transparent ? (
                <Wordmark size="md" tone="light" />
              ) : (
                <Wordmark size="sm" />
              )}
            </Link>

            {/* Right: utility */}
            <div className="flex items-center justify-end gap-3 sm:gap-4 flex-1">
              {user ? (
                <Link
                  to="/account"
                  className="nav-link hidden md:inline text-[0.62rem] uppercase tracking-btn"
                  aria-label="Your DREAMZ account"
                >
                  Account
                </Link>
              ) : (
                <Link
                  to="/account/login"
                  className="nav-link hidden md:inline text-[0.62rem] uppercase tracking-btn"
                >
                  Sign In
                </Link>
              )}
              <Link
                to="/track-order" search={{ order: undefined }}
                className="nav-link hidden xl:inline text-[0.62rem] uppercase tracking-btn"
              >
                Track Order
              </Link>
              <Link
                to={user ? "/account" : "/account/login"}
                aria-label={user ? "Your account" : "Sign in"}
                className="p-2"
              >
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <circle cx="10" cy="7" r="3.2" />
                  <path d="M3.5 17c1.2-3.2 3.6-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
                </svg>
              </Link>
              <button
                onClick={openCart}
                aria-label={`Open cart${count > 0 ? `, ${count} items` : ""}`}
                className="relative p-2 -mr-2"
              >
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M4 6h12l-1 11H5L4 6z" />
                  <path d="M7 6V5a3 3 0 0 1 6 0v1" />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-oxblood text-ivory text-[0.6rem] flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-ivory text-ink border-b border-ink/10 max-h-[80svh] overflow-y-auto">
            <nav className="px-6 py-6 flex flex-col gap-1" aria-label="Mobile">
              {[...PRIMARY_NAV, { label: user ? "My Account" : "Sign In", to: user ? "/account" : "/account/login" }, { label: "Track Order", to: "/track-order" }, { label: "Have a Voucher?", to: "/voucher" }].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  search={item.to === "/shop" ? { q: undefined } : undefined}
                  onClick={() => setMobileOpen(false)}
                  className="py-3.5 font-editorial text-2xl border-b border-ink/5 last:border-0"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
