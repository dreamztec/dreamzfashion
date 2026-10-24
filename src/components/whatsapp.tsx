import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import { useCart, useCartHydrated } from "@/store/cart";
import type { ProductWithMedia } from "@/server/catalog.server";

/**
 * Centralized WhatsApp deep-link builder. The number comes from admin-managed
 * site settings at render time, falling back to the official company WhatsApp
 * line. No wa.me link anywhere in the app may hardcode a number.
 */
export function whatsappLink(
  message: string,
  whatsappNumber: string | undefined | null,
): string {
  const number = (whatsappNumber || CONTACT.whatsappNumber || "").replace(/\D/g, "");
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productInquiry(product: { name: string }): string {
  return `Hello ${BRAND.shortName}, I'm interested in ${product.name}.`;
}

export function customInquiry(product: { name: string }): string {
  return `Hello ${BRAND.shortName}, I need help customizing ${product.name}.`;
}

export function orderInquiry(orderNumber: string): string {
  return `Hello ${BRAND.shortName}, I'd like to ask about my order ${orderNumber}.`;
}

export const GENERAL_INQUIRY = `Hello ${BRAND.shortName}, I'd like to make an enquiry.`;

/** Floating WhatsApp CTA — rendered on every page when the number is configured. */
export function WhatsAppFloat({ whatsappNumber }: { whatsappNumber?: string | null }) {
  const href = whatsappLink(GENERAL_INQUIRY, whatsappNumber);
  const hydrated = useCartHydrated((s) => s.hydrated);
  const count = useCart((s) => (hydrated ? s.count() : 0));

  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${BRAND.shortName} on WhatsApp`}
      className={`fixed z-[60] right-5 transition-all duration-300 ${
        count > 0 ? "bottom-24 sm:bottom-6" : "bottom-6"
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-ivory shadow-lg hover:scale-105 transition-transform">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.03c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
        </svg>
      </span>
    </a>
  );
}

/**
 * A labelled call CTA (tel: scheme) — used wherever customers need to place a
 * real telephone call rather than a WhatsApp message.
 */
export function CallCTAButton({
  label = `Call ${BRAND.shortName}`,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <a href={CONTACT.phoneHref} className={`btn-lux btn-lux-outline ${className}`}>
      {label}
    </a>
  );
}

export function WhatsAppCTAButton({
  message,
  whatsappNumber,
  label = `Chat with ${BRAND.shortName}`,
  className = "",
}: {
  message: string;
  whatsappNumber?: string | null;
  label?: string;
  className?: string;
}) {
  const href = whatsappLink(message, whatsappNumber);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        try {
          void fetch("/api/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "whatsapp_click", data: { label } }),
            keepalive: true,
          });
        } catch {
          /* analytics must never break the CTA */
        }
      }}
      className={`btn-lux btn-lux-outline ${className}`}
    >
      {label}
    </a>
  );
}

export function ProductWhatsAppCTA({
  product,
  whatsappNumber,
  customizable = false,
}: {
  product: Pick<ProductWithMedia, "name">;
  whatsappNumber?: string | null;
  customizable?: boolean;
}) {
  return (
    <WhatsAppCTAButton
      message={customizable ? customInquiry(product) : productInquiry(product)}
      whatsappNumber={whatsappNumber}
    />
  );
}