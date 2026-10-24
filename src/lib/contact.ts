/**
 * Official DREAMZ contact channels.
 *
 * These are the company-approved public contact details (from the official
 * WhatsApp number, phone line and email supplied by the administrator). They
 * are the fallback everywhere; admin-managed `site` settings take precedence
 * at render time when set. The physical address is deliberately NOT published
 * anywhere on the site.
 */

export const CONTACT = {
  /** International format, digits only — used for wa.me deep links. */
  whatsappNumber: "2349038560517",
  /** Human-readable display for call links. */
  phoneDisplay: "+234 903 856 0517",
  /** tel: scheme target for real telephone calls. */
  phoneHref: "tel:+2349038560517",
  email: "contact.dreamzgroup@gmail.com",
} as const;

/** Registered business information (CAC public data — nothing private). */
export const COMPANY = {
  legalName: "DREAMZ FASHION KONCEPTZ AND SERVICES LTD",
  rcNumber: "8172107",
  incorporated: "13 January 2025",
  country: "Nigeria",
  entityType: "Private company limited by shares",
} as const;

export const REGISTERED_BUSINESS_LINE = `${COMPANY.legalName} · RC ${COMPANY.rcNumber} · Incorporated in Nigeria · ${COMPANY.incorporated}`;

/** Build a wa.me deep link; empty string when no number is available. */
export function waLink(message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${CONTACT.whatsappNumber}${text}`;
}
