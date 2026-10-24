import { createServerFn } from "@tanstack/react-start";

/**
 * RPC bridge for the public creator storefront. The route file must never
 * import a *.server module directly — this wrapper keeps the query
 * server-side and hands the client only the safe projection.
 */
export const getCreatorStorefrontFn = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data }) => {
    const { getCreatorStorefront } = await import("./partners.server");
    return getCreatorStorefront(data);
  });
