import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import { getCurrentCustomer } from "@/server/auth.server";
import { clientIpFromRequest, consumeRateLimit } from "@/server/rate-limit.server";

const folder = "dreamz/dp";
const MAX_BYTES = 4 * 1024 * 1024;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || "";
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || "";
  // A product environment name is public, but the key and secret never leave the server.
  const validName = /^[a-zA-Z0-9_-]+$/.test(cloudName);
  return {
    cloudName,
    apiKey,
    apiSecret,
    ready: validName && Boolean(apiKey && apiSecret),
  };
}

/**
 * Public DP publishing requires authenticated, explicitly consenting customers.
 * The canvas image is made locally. Only the completed composite is sent here
 * after a separate "publish publicly" opt-in.
 *
 * GET  /api/dream-dp  — safe config status (no secrets)
 * POST /api/dream-dp  — validates PNG, uploads to Cloudinary over server TLS
 *
 * No arbitrary folders, public IDs, transforms or external asset URLs are
 * accepted from the browser. Storage is rate limited by account and IP.
 */
export const Route = createFileRoute("/api/dream-dp")({
  server: {
    handlers: {
      GET: async () => json({ available: config().ready }),
      POST: async ({ request }) => {
        const cfg = config();
        if (!cfg.ready) {
          return json({ error: "Public Dream DP links are not configured yet. Download and share the image instead." }, 503);
        }
        const requestOrigin = request.headers.get("origin");
        if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
          return json({ error: "Invalid request origin." }, 403);
        }

        let customer: Awaited<ReturnType<typeof getCurrentCustomer>>;
        try {
          customer = await getCurrentCustomer();
        } catch {
          return json({ error: "We could not verify your sign-in. Please try again." }, 503);
        }
        if (!customer) {
          return json({ error: "Sign in to publish a permanent public DP link. You can still download your DP without signing in." }, 401);
        }
        const perUser = await consumeRateLimit("cloudinary-dp-customer", String(customer.id), 5, 24 * 3600);
        if (!perUser.ok) {
          return json({ error: "You've reached the daily public DP limit. You can still download your DP." }, 429);
        }
        const perIp = await consumeRateLimit("cloudinary-dp-ip", clientIpFromRequest(request), 10, 3600);
        if (!perIp.ok) {
          return json({ error: "Too many public DP uploads from this connection. Try later." }, 429);
        }

        let body: FormData;
        try {
          body = await request.formData();
        } catch {
          return json({ error: "Please choose a valid Dream DP image." }, 400);
        }
        if (body.get("consent") !== "publish-public") {
          return json({ error: "You must explicitly agree to publish your photograph as part of a public DP." }, 400);
        }
        const file = body.get("file");
        if (!file || typeof file === "string" || file.size === 0 || file.size > MAX_BYTES) {
          return json({ error: "Choose a PNG image smaller than 4 MB." }, 400);
        }
        if (file.type !== "image/png") {
          return json({ error: "Only completed PNG Dream DPs can be published." }, 400);
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
        if (bytes.length < 24 || !pngHeader.every((n, i) => bytes[i] === n)) {
          return json({ error: "That file is not a valid PNG image." }, 400);
        }
        // Prevent 1x1 pixel and oversized decompression bomb uploads.
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const width = view.getUint32(16);
        const height = view.getUint32(20);
        if (width < 320 || height < 320 || width > 3000 || height > 3000) {
          return json({ error: "The DP image dimensions are not supported." }, 400);
        }

        const id = randomUUID();
        const cloudinaryForm = new FormData();
        cloudinaryForm.set("file", new Blob([bytes], { type: "image/png" }), "dream-dp.png");
        cloudinaryForm.set("folder", folder);
        cloudinaryForm.set("public_id", id);
        cloudinaryForm.set("overwrite", "false");
        const endpoint = "https://api.cloudinary.com/v1_1/" + cfg.cloudName + "/image/upload";

        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: "Basic " + Buffer.from(cfg.apiKey + ":" + cfg.apiSecret).toString("base64"),
            },
            body: cloudinaryForm,
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) {
            console.error("[dreamz] Cloudinary DP publish failed (status)", response.status);
            return json({ error: "Cloudinary could not publish the image. Check the configuration or download your DP instead." }, 502);
          }
          const uploaded = await response.json() as {
            public_id?: string;
            secure_url?: string;
            version?: number;
          };
          if (
            uploaded.public_id !== folder + "/" + id ||
            typeof uploaded.version !== "number" ||
            !Number.isSafeInteger(uploaded.version) ||
            uploaded.version <= 0 ||
            typeof uploaded.secure_url !== "string" ||
            !uploaded.secure_url.startsWith("https://res.cloudinary.com/" + cfg.cloudName + "/image/upload/")
          ) {
            return json({ error: "The image was uploaded, but the public response was unexpected. Contact DREAMZ support." }, 502);
          }
          const slug = id + "_v" + uploaded.version;
          const url = new URL("/dp/" + slug, request.url).href;
          return json({ ok: true, shareUrl: url, imageUrl: uploaded.secure_url });
        } catch {
          return json({ error: "Cloudinary could not be reached. Your DP is still available to download." }, 502);
        }
      },
    },
  },
});
