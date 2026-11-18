import { createFileRoute } from "@tanstack/react-router";
import { GoogleGenAI } from "@google/genai";
import { getCurrentCustomer } from "@/server/auth.server";
import { clientIpFromRequest, consumeRateLimit } from "@/server/rate-limit.server";

/**
 * Netlify AI Gateway image preview — only inside the authenticated DREAMZ
 * design journey. Free, but rate-limited because image inference costs money.
 * Client images/references are not supplied; only the composed design prompt.
 * Never used to set a product price or approve manufacture.
 */
const MODEL = "gemini-3.1-flash-lite-image";
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export const Route = createFileRoute("/api/ai-dream-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const customer = await getCurrentCustomer().catch(() => null);
        if (!customer) return json({ error: "Sign in to generate your DREAMZ image preview." }, 401);

        // Per-account and per-IP throttles both apply; quotas are independent.
        const account = await consumeRateLimit("dreamz-ai-account", String(customer.id), 2, 86400);
        if (!account.ok) return json({ error: "Your two complimentary image previews for today are used. Return tomorrow or use the copyable design prompt." }, 429);
        const ip = await consumeRateLimit("dreamz-ai-ip", clientIpFromRequest(request), 8, 86400);
        if (!ip.ok) return json({ error: "Too many image requests from this connection today. Please try later." }, 429);

        let prompt: string;
        try {
          const input: unknown = await request.json();
          if (!input || typeof input !== "object" || !("prompt" in input) || typeof input.prompt !== "string") {
            return json({ error: "Compose a design in the DREAMZ Studio first." }, 400);
          }
          prompt = input.prompt.trim();
        } catch {
          return json({ error: "Please send a valid design prompt." }, 400);
        }
        if (prompt.length < 100 || prompt.length > 7500) {
          return json({ error: "Please complete your design selections before generating an image." }, 400);
        }
        // Runtime credentials are provided by Netlify AI Gateway where enabled.
        // No API keys or model access are exposed to the browser.
        if (!process.env.GEMINI_API_KEY) {
          return json({ error: "DREAMZ AI previews are not active on this deployment. Use Copy Full Prompt with your preferred image tool." }, 503);
        }
        try {
          const ai = new GoogleGenAI({});
          const result = await ai.models.generateContent({
            model: MODEL,
            contents:
              "Generate ONE realistic product-only concept rendering based on the following LOCKED DREAMZ customer specifications. Preserve the specified product type, construction, material, primary/secondary colours and personalisation. Do not add brand logos, buckles, straps, ornaments, soles, straps or other product features that are not in the selections. If ambiguous, keep neutral standard construction. Studio background, complete product visible, no text, no people. This is an illustrative preview, not a product photograph or approved manufacturing specification.\n\n" +
              prompt,
            config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
          });
          const parts = result.candidates?.[0]?.content?.parts ?? [];
          const part = parts.find((p) => p.inlineData?.data);
          if (!part?.inlineData?.data) return json({ error: "The image model did not return a usable preview. Try copying your prompt to another image tool." }, 502);
          const mime = part.inlineData.mimeType ?? "image/png";
          if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
            return json({ error: "The image model returned an unsupported file type." }, 502);
          }
          const bytes = Buffer.from(part.inlineData.data, "base64");
          if (bytes.length > 5_000_000) return json({ error: "The generated image is too large to save. Try again later." }, 502);
          return new Response(bytes, {
            status: 200,
            headers: { "Content-Type": mime, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" },
          });
        } catch (error) {
          console.error("[DREAMZ AI] Image preview unavailable:", error instanceof Error ? error.name : "unknown");
          return json({ error: "We couldn't generate an image just now. Your design is safe; use the Copy Full Prompt option or try again later." }, 503);
        }
      },
    },
  },
});
