import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * "Bespoke" is no longer customer-facing vocabulary — the premium design and
 * customization service is DREAMZ Royale. This legacy URL forwards so old
 * links and bookmarks keep working.
 */
export const Route = createFileRoute("/bespoke")({
  beforeLoad: () => {
    throw redirect({ to: "/royale", replace: true });
  },
});
