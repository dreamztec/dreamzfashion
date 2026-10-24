import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "../../db/index";
import { bespokeRequests } from "../../db/schema";
import { ImageComingSoon } from "@/components/brand";
import { BRAND } from "@/lib/config";
import { WhatsAppCTAButton, CallCTAButton } from "@/components/whatsapp";
import { CONTACT } from "@/lib/contact";

const BespokeSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal("")),
  productType: z.string().min(2).max(60),
  color: z.string().max(60).optional().or(z.literal("")),
  material: z.string().max(60).optional().or(z.literal("")),
  size: z.string().max(20).optional().or(z.literal("")),
  budget: z.string().max(60).optional().or(z.literal("")),
  deadline: z.string().max(60).optional().or(z.literal("")),
  referenceUrl: z.string().max(400).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});

const submitBespoke = createServerFn({ method: "POST" })
  .inputValidator(BespokeSchema)
  .handler(async ({ data }) => {
    const [row] = await db
      .insert(bespokeRequests)
      .values({
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        productType: data.productType,
        color: data.color || null,
        material: data.material || null,
        size: data.size || null,
        budget: data.budget || null,
        deadline: data.deadline || null,
        referenceUrl: data.referenceUrl || null,
        message: data.message || null,
      })
      .returning();
    return { ok: true as const, reference: `BR-${String(row?.id ?? 0).padStart(5, "0")}` };
  });

export const Route = createFileRoute("/bespoke")({
  head: () => ({
    meta: [
      { title: `Bespoke — ${BRAND.name}` },
      {
        name: "description",
        content: `Commission a bespoke piece from ${BRAND.name} — custom footwear, bags and accessories made to your measurements, colours and finishing.`,
      },
    ],
  }),
  component: Bespoke,
});

function Bespoke() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitBespoke({
        data: {
          name: String(fd.get("name") || ""),
          phone: String(fd.get("phone") || ""),
          email: String(fd.get("email") || ""),
          productType: String(fd.get("productType") || ""),
          color: String(fd.get("color") || ""),
          material: String(fd.get("material") || ""),
          size: String(fd.get("size") || ""),
          budget: String(fd.get("budget") || ""),
          deadline: String(fd.get("deadline") || ""),
          referenceUrl: String(fd.get("referenceUrl") || ""),
          message: String(fd.get("message") || ""),
        },
      });
      setSubmitted(result.reference);
    } catch {
      setError("Your request could not be sent just now. Please try again, or reach us on WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center mb-14">
        <p className="overline-label mb-4">Made To Order</p>
        <h1 className="font-editorial text-4xl sm:text-6xl">Bespoke</h1>
        <p className="font-editorial text-xl sm:text-2xl mt-6 tracking-wide">
          Your Idea. Our Craft. Your DREAMZ.
        </p>
        <div className="rule-gold mx-auto mt-8" />
        <p className="text-stone mt-8 leading-relaxed max-w-xl mx-auto">
          A bespoke {BRAND.shortName} piece begins with a conversation. Tell us
          what you imagine — the product, the colour, the material, the
          occasion — and our workshop will craft it around you.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-5 sm:px-8 grid gap-12 lg:grid-cols-[1fr_1.1fr] items-start mb-8">
        <div className="hidden lg:block">
          <ImageComingSoon aspect="aspect-[4/5]" label="Bespoke craft — image coming soon" />
        </div>

        <div>
          {submitted ? (
            <div className="border border-ink/10 px-8 py-14 text-center">
              <p className="text-forest text-3xl mb-5" aria-hidden="true">✓</p>
              <h2 className="font-editorial text-2xl mb-3">Request received</h2>
              <p className="text-stone text-sm leading-relaxed max-w-sm mx-auto mb-2">
                Thank you. Your consultation reference is{" "}
                <strong>{submitted}</strong> — our team will reach out to
                schedule your consultation.
              </p>
              <p className="text-xs text-stone mb-6">
                For a faster response, message us on WhatsApp with your reference.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <WhatsAppCTAButton
                  message={`Hello ${BRAND.shortName}, I have submitted bespoke request ${submitted} and would like to continue the consultation.`}
                  label="Continue on WhatsApp"
                />
                <CallCTAButton label={`Call ${CONTACT.phoneDisplay}`} />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="productType" className="input-lux-label">What are we making? *</label>
                <select id="productType" name="productType" required defaultValue="" className="input-lux">
                  <option value="" disabled>Select product type</option>
                  <option>Custom Footwear</option>
                  <option>Custom Bag</option>
                  <option>Custom Accessories</option>
                  <option>Other Bespoke Piece</option>
                </select>
              </div>
              <div>
                <label htmlFor="b-name" className="input-lux-label">Name *</label>
                <input id="b-name" name="name" required className="input-lux" autoComplete="name" />
              </div>
              <div>
                <label htmlFor="b-phone" className="input-lux-label">Phone *</label>
                <input id="b-phone" name="phone" type="tel" required className="input-lux" autoComplete="tel" placeholder="0803 000 0000" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-email" className="input-lux-label">Email</label>
                <input id="b-email" name="email" type="email" className="input-lux" autoComplete="email" />
              </div>
              <div>
                <label htmlFor="b-color" className="input-lux-label">Preferred Colour</label>
                <input id="b-color" name="color" className="input-lux" placeholder="Oxblood" />
              </div>
              <div>
                <label htmlFor="b-material" className="input-lux-label">Material</label>
                <input id="b-material" name="material" className="input-lux" placeholder="Full-grain leather" />
              </div>
              <div>
                <label htmlFor="b-size" className="input-lux-label">Size</label>
                <input id="b-size" name="size" className="input-lux" placeholder="43" />
              </div>
              <div>
                <label htmlFor="b-budget" className="input-lux-label">Budget</label>
                <input id="b-budget" name="budget" className="input-lux" placeholder="₦100,000 – ₦250,000" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-deadline" className="input-lux-label">Needed By</label>
                <input id="b-deadline" name="deadline" className="input-lux" placeholder="e.g. 14 February" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-reference" className="input-lux-label">Reference Image Link</label>
                <input id="b-reference" name="referenceUrl" type="url" className="input-lux" placeholder="Link to a photo that inspires the piece" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="b-message" className="input-lux-label">Tell Us About The Piece</label>
                <textarea id="b-message" name="message" rows={4} className="input-lux" placeholder="The occasion, the story, the details that matter to you…" />
              </div>
              {error && (
                <p role="alert" className="sm:col-span-2 border border-oxblood/40 bg-oxblood/5 text-oxblood text-sm px-4 py-3">
                  {error}
                </p>
              )}
              <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
                <button type="submit" disabled={submitting} className="btn-lux btn-lux-primary flex-1">
                  {submitting ? "Sending…" : "Request a Consultation"}
                </button>
              </div>
            </form>
          )}
          <div className="mt-5 text-center space-y-3">
            <WhatsAppCTAButton message={`Hello ${BRAND.shortName}, I'd like to discuss a bespoke piece.`} label="Message DREAMZ on WhatsApp" />
            <p className="text-xs text-stone">
              Or call{" "}
              <a href={CONTACT.phoneHref} className="underline hover:text-ink">{CONTACT.phoneDisplay}</a>
              {" · "}
              <a href={`mailto:${CONTACT.email}`} className="underline hover:text-ink break-all">{CONTACT.email}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}