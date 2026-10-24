import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-client";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: `My Account — ${BRAND.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountLayout,
});

const SECTIONS = [
  { to: "/account", label: "Overview" },
  { to: "/account/orders", label: "My Orders" },
  { to: "/track-order", label: "Track Order" },
  { to: "/account/rewards", label: "DREAMZ Rewards" },
  { to: "/account/vouchers", label: "My Vouchers" },
  { to: "/account/referrals", label: "Referrals" },
  { to: "/account/partner", label: "Partner Dashboard" },
  { to: "/account/tasks", label: "Tasks & Progress" },
  { to: "/account/designs", label: "My Designs" },
  { to: "/account/royale", label: "Royale Requests" },
  { to: "/account/profile", label: "Profile" },
];

function AccountLayout() {
  const { user, loading, logout, notice, clearNotice, passwordAction } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const publicRoute = pathname.replace(/\/$/, "") === "/account/login";

  useEffect(() => {
    if (!publicRoute && !loading && (!user || passwordAction)) {
      void navigate({ to: "/account/login", search: { reset: passwordAction === "recovery" }, replace: true });
    }
  }, [user, loading, navigate, publicRoute, passwordAction]);

  if (publicRoute) return <Outlet />;

  if (loading || !user || passwordAction) {
    return (
      <div className="mx-auto max-w-md px-5 pt-40 pb-24 text-center">
        <p className="overline-label mb-4">DREAMZ</p>
        <div className="skeleton h-8 w-48 mx-auto" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-20">
      {notice && (
        <div className="mb-6 border border-gold/50 bg-gold/5 px-4 py-3 text-sm flex items-start justify-between gap-4" role="status">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} aria-label="Dismiss" className="text-stone shrink-0">×</button>
        </div>
      )}
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
        <aside className="mb-8 lg:mb-0">
          <p className="overline-label mb-4">My Account</p>
          <nav aria-label="Account sections" className="flex gap-x-5 gap-y-1 flex-wrap lg:flex-col lg:items-start">
            {SECTIONS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="nav-link text-[0.7rem] uppercase tracking-btn py-1.5 whitespace-nowrap"
                activeProps={{ className: "text-brand-red" }}
              >
                {s.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => {
                void logout().then(() => navigate({ to: "/" }));
              }}
              className="nav-link text-[0.7rem] uppercase tracking-btn py-1.5 text-left"
            >
              Log Out
            </button>
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet key={user.id} />
        </div>
      </div>
    </div>
  );
}
