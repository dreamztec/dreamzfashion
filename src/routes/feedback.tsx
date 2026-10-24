import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { feedback } from "../../db/schema";
import { BRAND } from "@/lib/config";

const FeedbackSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  orderNumber: z.string().max(40).optional().or(z.literal("")),
  feedbackType: z.enum([
    "Product",
    "Website",
    "Delivery",
    "Customer Service",
    "Customization",
    "Payment",
    "Other",
  ]),
  message: z.string().min(5).max(2000),
});

const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator(FeedbackSchema)
  .handler(async ({ data }) => {
    await db.insert(feedback).values({
      name: data.name,
      email: data.email,
      orderNumber: data.orderNumber || null,
      feedbackType: data.feedbackType,
      message: data.message,
    });
    return { ok: true };
  });

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: `Send Us Feedback — ${BRAND.name}` },
      { name: "description", content: `Share your experience with ${BRAND.name}. We read every message.` },
    ],
  }),
  component: Feedback,
});

const FEEDBACK_TYPES = [
  "Product",
  "Website",
  "Delivery",
  "Customer Service",
  "Customization",
  "Payment",
  "Other",
] as const;

function Feedback() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const typeRaw = String(fd.get("feedbackType") || "");
    try {
      await submitFeedback({
        data: {
          name: String(fd.get("name") || ""),
          email: String(fd.get("email") || ""),
          orderNumber: String(fd.get("orderNumber") || ""),
          feedbackType: (FEEDBACK_TYPES as readonly string[]).includes(typeRaw)
            ? (typeRaw as (typeof FEEDBACK_TYPES)[number])
            : "Other",
          message: String(fd.get("message") || ""),
        },
      });
      setSubmitted(true);
    } catch {
      setError("Your message could not be sent just now. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-5 pt-32 pb-24">
      <div className="text-center mb-12">
        <p className="overline-label mb-3">Client Care</p>
        <h1 className="font-editorial text-4xl sm:text-5xl">Send Us Feedback</h1>
        <p className="text-stone mt-4 leading-relaxed">
          Praise, problems, ideas — we read every message.
        </p>
      </div>

      {submitted ? (
        <div className="border border-ink/10 px-8 py-14 text-center">
          <p className="text-forest text-3xl mb-5" aria-hidden="true">✓</p>
          <h2 className="font-editorial text-2xl mb-3">Thank you</h2>
          <p className="text-stone text-sm leading-relaxed">
            Your feedback has reached us. We appreciate you taking the time.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div>
            <label htmlFor="f-name" className="input-lux-label">Name *</label>
            <input id="f-name" name="name" required className="input-lux" autoComplete="name" />
          </div>
          <div>
            <label htmlFor="f-email" className="input-lux-label">Email *</label>
            <input id="f-email" name="email" type="email" required className="input-lux" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="f-order" className="input-lux-label">
              Order Number <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input id="f-order" name="orderNumber" className="input-lux uppercase" placeholder="DFK-…" />
          </div>
          <div>
            <label htmlFor="f-type" className="input-lux-label">Feedback Type *</label>
            <select id="f-type" name="feedbackType" required defaultValue="" className="input-lux">
              <option value="" disabled>Select type</option>
              {FEEDBACK_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f-message" className="input-lux-label">Message *</label>
            <textarea id="f-message" name="message" rows={5} required minLength={5} className="input-lux" />
          </div>
          {error && (
            <p role="alert" className="border border-oxblood/40 bg-oxblood/5 text-oxblood text-sm px-4 py-3">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-lux btn-lux-primary">
            {submitting ? "Sending…" : "Send Feedback"}
          </button>
        </form>
      )}
    </div>
  );
}