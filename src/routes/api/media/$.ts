import { createFileRoute } from "@tanstack/react-router";
import { getBlobStore } from "@/server/blobs.server";
import { resolveMediaKey } from "@/lib/media-key";

/**
 * Streams admin-uploaded media from Netlify Blobs.
 * GET /api/media/media/<timestamp>-<filename>
 */
export const Route = createFileRoute("/api/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = resolveMediaKey(params);
        if (!key) {
          return new Response("Not found", { status: 404 });
        }
        try {
          const blob = await getBlobStore().get(key, { type: "blob" });
          if (!blob) return new Response("Not found", { status: 404 });
          return new Response(blob, {
            headers: {
              "Content-Type": blob.type || "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
