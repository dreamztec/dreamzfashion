import { createFileRoute } from "@tanstack/react-router";
import { db } from "../../../db/index";
import { analyticsEvents } from "../../../db/schema";
import { consumeRateLimit, clientIpFromRequest } from "../../server/rate-limit.server";

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
          // Unauthenticated write endpoint — throttle and cap payload size so
          // it cannot be used to flood the database.
          const limit = await consumeRateLimit("event", clientIpFromRequest(request), 30, 60);
          if (limit.ok) {
            const body = (await request.json()) as {
              name?: string;
              data?: Record<string, unknown>;
            };
            const name = (body.name ?? "").trim();
            const metadata = body.data ?? {};
            if (name && name.length <= 60 && JSON.stringify(metadata).length <= 2048) {
              await db.insert(analyticsEvents).values({
                eventName: name,
                metadata,
              });
            }
          }
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
