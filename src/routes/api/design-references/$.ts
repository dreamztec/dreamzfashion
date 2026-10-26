import { createFileRoute } from "@tanstack/react-router";
import { consumeRateLimit, clientIpFromRequest } from "@/server/rate-limit.server";

/**
 * Customer inspiration images for the design workspace.
 *   POST /api/design-references        multipart "file" → { refId }
 *   GET  /api/design-references/<id>   streams the image to holders of the id
 *
 * References are private: ids are random (100+ bits), never listed, served
 * with no-store / noindex headers, and kept out of the public /api/media
 * route. Validation (type by magic bytes, size) happens on the server.
 */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/design-references/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Anonymous uploads are validated hard (magic bytes, 5 MB cap) but
          // must also be throttled so Blob storage cannot be filled at will.
          const limit = await consumeRateLimit("design-ref-upload", clientIpFromRequest(request), 10, 60 * 60);
          if (!limit.ok) {
            return json(
              { error: "You have uploaded several images recently. Please try again in about an hour." },
              429,
            );
          }
          const form = await request.formData();
          const file = form.get("file");
          if (!file || typeof file === "string") return json({ error: "Choose an image to upload." }, 400);
          const bytes = new Uint8Array(await file.arrayBuffer());
          const { storeReference } = await import("@/server/designs.server");
          const stored = await storeReference({ bytes, name: file.name || null });
          return json({ refId: stored.refId, contentType: stored.contentType });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed.";
          // Validation errors are user-actionable; anything else is a storage fault.
          const userFacing = /image|file|MB|upload/i.test(message);
          if (!userFacing) console.error("[dreamz] reference upload failed:", message);
          return json(
            { error: userFacing ? message : "We couldn't store that image just now. Please try again." },
            userFacing ? 400 : 500,
          );
        }
      },
      GET: async ({ params }) => {
        const refId = String((params as { _splat?: string })._splat ?? "").replace(/^\/+/, "");
        const { readReference } = await import("@/server/designs.server");
        const found = await readReference(refId).catch(() => null);
        if (!found) return new Response("Not found", { status: 404 });
        return new Response(found.blob, {
          headers: {
            "Content-Type": found.contentType,
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
