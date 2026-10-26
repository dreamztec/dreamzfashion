import { Link } from "@tanstack/react-router";
import { BRAND } from "@/lib/config";
import { Wordmark } from "@/components/brand";
import { SocialIcons } from "@/components/social";
import { CONTACT, REGISTERED_BUSINESS_LINE } from "@/lib/contact";

const YEAR = new Date().getFullYear();

const COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; to: string; shop?: boolean }>;
}> = [
  {
    title: "Shop",
    links: [
      { label: "All Pieces", to: "/shop", shop: true },
      { label: "Essentials", to: "/shop/essentials", shop: true },
      { label: "Originals", to: "/shop/originals", shop: true },
      { label: "Royale", to: "/shop/royale", shop: true },
      { label: "Footwear", to: "/shop/footwear", shop: true },
      { label: "Bags", to: "/shop/bags", shop: true },
      { label: "Accessories", to: "/shop/accessories", shop: true },
      { label: "Design Yours", to: "/custom", shop: true },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "About DREAMZ", to: "/about" },
      { label: "Creators — apply free", to: "/creators" },
      { label: "Sell DREAMZ — retail partners", to: "/partnerships" },
      { label: "Earn with DREAMZ", to: "/earn" },
      { label: "Corporate Orders", to: "/corporate" },
      { label: "Anniversary Collection", to: "/dreamz-5" },
      { label: "Track Order", to: "/track-order" },
      { label: "Send Feedback", to: "/feedback" },
    ],
  },
];

export function Footer({
  whatsappNumber,
  instagram,
  tiktok,
  facebook,
  contactEmail,
  contactPhone,
}: {
  whatsappNumber?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  // Admin-managed settings take precedence; official constants are the fallback.
  const email = contactEmail || CONTACT.email;
  const phone = contactPhone || CONTACT.phoneDisplay;
  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`
    : `https://wa.me/${CONTACT.whatsappNumber}`;

  return (
    <footer className="bg-ink text-ivory mt-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 lg:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Wordmark size="md" tone="light" tagline />
            <p className="mt-5 text-sm text-ivory/70 max-w-[34ch] leading-relaxed">
              {BRAND.description}
            </p>
            <SocialIcons
              className="mt-7 text-ivory/80"
              links={{ instagram, tiktok, facebook }}
            />
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[0.65rem] uppercase tracking-luxe text-gold-soft mb-5">
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to as "/shop"}
                      search={
                        link.to === "/shop"
                          ? { q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }
                          : undefined
                      }
                      className="text-sm text-ivory/80 hover:text-ivory transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="text-[0.65rem] uppercase tracking-luxe text-gold-soft mb-5">
              Client Care
            </h3>
            <ul className="space-y-3 text-sm text-ivory/80">
              <li>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ivory"
                >
                  Message DREAMZ on WhatsApp
                </a>
              </li>
              <li>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-ivory">
                  Call {phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="hover:text-ivory break-all">
                  Email {email}
                </a>
              </li>
              <li>
                <Link to="/track-order" search={{ order: undefined }} className="hover:text-ivory">
                  Track an Order
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-ivory">
                  Contact &amp; Client Care
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-ivory/10 space-y-3">
          <p className="text-[0.65rem] uppercase tracking-btn text-ivory/50">
            {REGISTERED_BUSINESS_LINE}
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-[0.65rem] uppercase tracking-btn text-ivory/50">
              © {YEAR} {BRAND.name} — {BRAND.tagline}
            </p>
            <p className="text-[0.65rem] uppercase tracking-btn text-ivory/50">
              Made in Nigeria
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
