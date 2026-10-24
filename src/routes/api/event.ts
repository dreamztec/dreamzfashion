import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db/index";
import { analyticsEvents } from "../../../db/schema";

/**
 * Lightweight analytics event collector (fire-and-forget).
 * Accepts a small JSON body: { name, data? }. No PII beyond optional
 * product slug and CTA labels. Server functions for clicks reuse this.
 */
export const Route = createFileRoute("/api/event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            name?: string;
            data?: Record<string, unknown>;
          };
          const name = (body.name ?? "").trim();
          if (!name || name.length > 60) {
            return new Response(JSON.stringify({ ok: false }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          await db.insert(analyticsEvents).values({
            eventName: name,
            metadata: body.data ?? {},
          });
        } catch {
          // Analytics must never break a page or CTA.
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: () =>
        new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
