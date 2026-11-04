import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /d5ex route: canonically resolves to the DREAMZ 5-Year Experience — the
 * anniversary landing page at /dreamz-5 ("The Billion-Naira Collection",
 * 12 June 2027). Legacy links and campaigns keep working.
 */
export const Route = createFileRoute("/d5ex")({
  beforeLoad: () => {
    throw redirect({ to: "/dreamz-5", replace: true });
  },
});
