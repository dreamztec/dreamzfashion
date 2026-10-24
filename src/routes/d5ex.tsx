import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /d5ex route: redirects to /custom (DREAMZ Design Yours & 3D Configurator)
 * preserving access for legacy links and campaigns.
 */
export const Route = createFileRoute("/d5ex")({
  beforeLoad: () => {
    throw redirect({ to: "/custom" });
  },
});
