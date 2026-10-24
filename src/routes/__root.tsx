import { type ReactNode } from "react";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppFloat } from "@/components/whatsapp";
import { AuthProvider } from "@/lib/auth-client";
import { getSiteSettings } from "@/server/catalog.functions";
import { useSiteSettings } from "@/store/settings";
import { BRAND, SITE_URL } from "@/lib/config";
import { COMPANY } from "@/lib/contact";
import { useEffect } from "react";
import "../styles.css";

const siteDescription = BRAND.description;

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: COMPANY.legalName,
  alternateName: BRAND.name,
  url: SITE_URL,
  foundingDate: "2025-01-13",
  address: {
    "@type": "PostalAddress",
    addressCountry: "NG",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+2349038560517",
      contactType: "customer service",
      availableLanguage: ["en"],
    },
  ],
  sameAs: [
    "https://www.instagram.com/dreamzfashion_ng/",
    "https://www.tiktok.com/@official_dreamzfashion",
  ],
};

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${BRAND.name} — ${BRAND.tagline}` },
      { name: "description", content: siteDescription },
      { property: "og:title", content: `${BRAND.name} — ${BRAND.tagline}` },
      { property: "og:description", content: siteDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: BRAND.name },
      { property: "og:url", content: SITE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd),
      },
    ],
  }),
  loader: async () => {
    const settings = await getSiteSettings();
    return { settings };
  },
  shellComponent: RootDocument,
  component: AppShell,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AppShell() {
  const settings = (Route.useLoaderData() as { settings: Record<string, unknown> }).settings;
  const whatsappNumber =
    (settings.whatsappNumber as string) || process.env.DFK_WHATSAPP_NUMBER || "";
  const announcement = (settings.announcementBar as string) || "";

  useEffect(() => {
    useSiteSettings.getState().set({ whatsappNumber });
  }, [whatsappNumber]);

  return (
    <AuthProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-ink focus:text-ivory focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Header announcement={announcement} />
      <main id="main">
        <Outlet />
      </main>
      <Footer
        whatsappNumber={whatsappNumber}
        instagram={(settings.instagram as string) || undefined}
        tiktok={(settings.tiktok as string) || undefined}
        facebook={(settings.facebook as string) || undefined}
        contactEmail={(settings.contactEmail as string) || undefined}
        contactPhone={(settings.contactPhone as string) || undefined}
      />
      <CartDrawer />
      <WhatsAppFloat whatsappNumber={whatsappNumber} />
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-5">
      <p className="overline-label mb-4">Error 404</p>
      <h1 className="font-editorial text-4xl mb-4">This page has stepped out</h1>
      <p className="text-stone mb-8 max-w-[40ch]">
        The page you are looking for cannot be found. It may have moved, or it
        may never have existed.
      </p>
      <a href="/" className="btn-lux btn-lux-primary">
        Return Home
      </a>
    </div>
  );
}