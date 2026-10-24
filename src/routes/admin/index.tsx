import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { adminLogin } from "@/server/admin.functions";
import { setAdminKey, clearAdminKey, getAdminKey } from "@/lib/admin-client";
import { BRAND } from "@/lib/config";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: `Admin — ${BRAND.name}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

type AdminRole = "owner" | "sales" | "operations";

const NAV: Array<{ label: string; to: string; roles: AdminRole[] }> = [
  { label: "Dashboard", to: "/admin/overview", roles: ["owner", "sales", "operations"] },
  { label: "Orders", to: "/admin/orders", roles: ["owner", "sales", "operations"] },
  { label: "Products", to: "/admin/products", roles: ["owner", "operations"] },
  { label: "Media", to: "/admin/media", roles: ["owner", "operations"] },
  { label: "Corporate", to: "/admin/corporate", roles: ["owner", "sales"] },
  { label: "Partners", to: "/admin/partners", roles: ["owner", "sales"] },
  { label: "Bespoke", to: "/admin/bespoke", roles: ["owner", "sales"] },
  { label: "Design Requests", to: "/admin/design-requests", roles: ["owner", "sales"] },
  { label: "Royale", to: "/admin/royale", roles: ["owner", "sales"] },
  { label: "Partnerships", to: "/admin/partnerships", roles: ["owner", "sales"] },
  { label: "Waitlist", to: "/admin/waitlist", roles: ["owner", "sales"] },
  { label: "Feedback", to: "/admin/feedback", roles: ["owner", "sales"] },
  { label: "Vouchers", to: "/admin/vouchers", roles: ["owner"] },
  { label: "Campaigns", to: "/admin/campaigns", roles: ["owner"] },
  { label: "Team", to: "/admin/users", roles: ["owner"] },
  { label: "Settings", to: "/admin/settings", roles: ["owner"] },
];

const ROLE_KEY = "dfk-admin-role";

function AdminLayout() {
  const [token, setToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : sessionStorage.getItem("dfk-admin-session"),
  );
  const [role, setRole] = useState<AdminRole | null>(() =>
    typeof window === "undefined"
      ? null
      : ((sessionStorage.getItem(ROLE_KEY) as AdminRole | null) ?? null),
  );
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Identity-based admins (team members) get in with their account session —
  // the cookie rides along and the server resolves the role.
  useEffect(() => {
    if (token || checking) return;
    setChecking(true);
    adminLogin({ data: { secret: "" } })
      .then((result) => {
        if (result.ok) {
          setRole(result.role);
          sessionStorage.setItem(ROLE_KEY, result.role);
          setToken(getAdminKey() || "identity");
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (token) {
    const allowed = NAV.filter((n) => !role || n.roles.includes(role));
    return (
      <div className="min-h-screen bg-ivory">
        <div className="bg-ink text-ivory sticky top-0 z-40">
          <div className="mx-auto max-w-6xl px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[0.65rem] uppercase tracking-luxe whitespace-nowrap">
                {BRAND.initials} Admin{role ? ` — ${role}` : ""}
              </p>
              <div className="flex items-center gap-4">
                <Link to="/" className="text-xs uppercase tracking-btn hover:text-gold-soft">
                  View Site
                </Link>
                <button
                  onClick={() => {
                    clearAdminKey();
                    sessionStorage.removeItem(ROLE_KEY);
                    setToken(null);
                    setRole(null);
                  }}
                  className="text-xs uppercase tracking-btn text-gold-soft hover:text-ivory"
                >
                  Sign Out
                </button>
              </div>
            </div>
            <nav className="mt-3 flex gap-x-5 gap-y-2 overflow-x-auto pb-1 flex-wrap" aria-label="Admin sections">
              {allowed.map((n) => (
                <Link key={n.to} to={n.to} className="text-xs uppercase tracking-btn hover:text-gold-soft whitespace-nowrap">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <Outlet />
      </div>
    );
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const result = await adminLogin({ data: { secret } });
      if (result.ok) {
        setRole(result.role);
        sessionStorage.setItem(ROLE_KEY, result.role);
        if (secret) setAdminKey(secret);
        setToken(secret || "identity");
      } else {
        setError(result.error ?? "Sign in failed");
      }
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <form onSubmit={handleLogin} className="w-full max-w-sm border border-ink/15 px-8 py-12 bg-ivory">
        <p className="overline-label mb-2">{BRAND.name}</p>
        <h1 className="font-editorial text-3xl mb-8">Admin Access</h1>
        <label htmlFor="admin-secret" className="input-lux-label">Access Key</label>
        <input
          id="admin-secret"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="input-lux"
          autoComplete="current-password"
        />
        {error && (
          <p role="alert" className="mt-4 text-sm text-oxblood">{error}</p>
        )}
        <button type="submit" disabled={checking} className="btn-lux btn-lux-primary w-full mt-6">
          {checking ? "Verifying…" : "Enter Dashboard"}
        </button>
        <p className="mt-6 text-xs text-stone leading-relaxed">
          Sign in with the master access key, or with a DREAMZ account that has
          been added to the admin team (owner, sales or operations).
        </p>
      </form>
    </div>
  );
}
