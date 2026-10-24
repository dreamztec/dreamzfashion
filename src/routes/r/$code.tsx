import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { recordReferralVisitFn } from "@/server/referral.functions";
import { BRAND } from "@/lib/config";

/**
 * Referral entry point: /r/CODE
 *
 * Records the click server-side (a click never creates a reward), stores a
 * first-party attribution id in localStorage for later registration/order
 * linkage, then continues to the destination the visitor came for.
 */
export const Route = createFileRoute("/r/$code")({
  validateSearch: (search: Record<string, unknown>) => ({
    to: typeof search.to === "string" ? search.to : undefined,
  }),
  loaderDeps: ({ search }) => ({ to: search.to }),
  loader: async ({ params, deps }) => {
    // The server function resolves the referrer; invalid codes still land on
    // the homepage without error.
    try {
      return await recordReferralVisitFn({
        data: {
          code: params.code.toUpperCase(),
          landingPath: "/",
          to: deps.to || "",
        },
      });
    } catch {
      return { ok: false as const, referrerId: null, to: "/" };
    }
  },
  head: () => ({
    meta: [{ title: `${BRAND.name}` }],
  }),
  component: ReferralEntry,
});

function ReferralEntry() {
  const navigate = useNavigate();
  const { referrerId, sessionId, to } = Route.useLoaderData() as {
    referrerId: number | null;
    sessionId: string | null;
    to?: string;
  };

  useEffect(() => {
    try {
      if (referrerId) {
        localStorage.setItem("dfk-ref", JSON.stringify({ referrerId, sessionId, at: Date.now() }));
      }
    } catch {
      /* attribution storage is best-effort */
    }
    // Continue to the linked destination (creator storefronts deep-link).
    void navigate({ to: (to && to.startsWith("/") ? to : "/") as never, replace: true });
  }, [referrerId, sessionId, to, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="skeleton h-6 w-40" />
    </div>
  );
}
