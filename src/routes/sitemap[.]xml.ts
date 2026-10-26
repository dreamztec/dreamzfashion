import { createFileRoute } from "@tanstack/react-router";
import { getPublishedProducts } from "@/server/catalog.server";
import { SITE_URL } from "@/lib/config";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const staticPaths = [
          "",
          "/shop",
          "/shop/essentials",
          "/shop/originals",
          "/royale",
          "/rewards",
          "/voucher",
          "/shop/footwear",
          "/shop/bags",
          "/shop/accessories",
          "/custom",
          "/royale",
          "/lookbook",
          "/about",
          "/contact",
          "/policies",
          "/partnerships",
          "/track-order",
          "/feedback",
        ];
        let productPaths: Array<{ slug: string; updatedAt: Date | null }> = [];
        try {
          const products = await getPublishedProducts({ limit: 500 });
          productPaths = products.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt ?? null }));
        } catch {
          // Database not reachable — still serve the static sitemap
        }

        const urls = staticPaths
          .map(
            (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
  </url>`,
          )
          .concat(
            productPaths.map(
              (p) => `  <url>
    <loc>${SITE_URL}/product/${p.slug}</loc>
${p.updatedAt ? `    <lastmod>${p.updatedAt.toISOString()}</lastmod>\n` : ""}  </url>`,
            ),
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});