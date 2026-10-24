import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { getProduct, getRelated, getSiteSettings } from "@/server/catalog.functions";
import type { ProductWithMedia } from "@/server/catalog.server";
import { ProductGrid } from "@/components/ProductCard";
import { ImageComingSoon } from "@/components/brand";
import { ProductWhatsAppCTA, WhatsAppCTAButton } from "@/components/whatsapp";
import { useCart } from "@/store/cart";
import { formatNaira, normalizeTier, TIER_LABELS } from "@/lib/format";
import { availabilityOf } from "@/lib/availability";
import { BRAND, SITE_URL } from "@/lib/config";
import { CONTACT } from "@/lib/contact";
import { img } from "@/lib/img";

function logEvent(name: string, data: Record<string, unknown>) {
  try {
    void fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, data }),
      keepalive: true,
    });
  } catch {
    /* analytics must never break the page */
  }
}

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await getProduct({ data: params.slug });
    if (!product) throw notFound();
    const [related, settings] = await Promise.all([
      getRelated({ data: { slug: params.slug, limit: 4 } }),
      getSiteSettings(),
    ]);
    return { product, related, settings };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const { product } = loaderData;
    const title = product.seoTitle || `${product.name} — ${BRAND.name}`;
    const description =
      product.seoDescription || product.shortDescription || BRAND.description;
    const image = product.images[0]?.url;
    const canonical = `${SITE_URL}/product/${product.slug}`;
    const quoteOnly = product.price <= 0 || !product.checkoutReady;
    const structured = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      sku: product.sku,
      description: product.shortDescription,
      brand: { "@type": "Brand", name: BRAND.name },
      ...(image ? { image: `${SITE_URL}${image}` } : {}),
      ...(quoteOnly
        ? {}
        : {
            offers: {
              "@type": "Offer",
              priceCurrency: product.currency,
              price: (product.price / 100).toFixed(2),
              availability: availabilityOf(product, {
                hasStock: product.variants.length > 0
                  ? product.variants.reduce((s, v) => s + v.stockQuantity, 0) > 0
                  : undefined,
              }).purchasable
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: canonical,
            },
          }),
    };
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { link: canonical, rel: "canonical" } as never,
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonical },
        ...(image ? [{ property: "og:image", content: `${SITE_URL}${image}` }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structured),
        },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related, settings } = Route.useLoaderData() as {
    product: ProductWithMedia;
    related: ProductWithMedia[];
    settings: Record<string, unknown>;
  };
  const add = useCart((s) => s.add);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.variants.some((v) => v.color) ? (product.variants.find((v) => v.color)?.color ?? null) : null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [purchaseOption, setPurchaseOption] = useState<"product_only" | "complete_package">(
    "product_only",
  );
  const [added, setAdded] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    logEvent("view_product", { slug: product.slug, sku: product.sku });
  }, [product.slug, product.sku]);

  const colors = [...new Set(product.variants.filter((v) => v.color).map((v) => v.color!))];
  const sizes = [...new Set(product.variants.filter((v) => v.size).map((v) => v.size!))];

  const matchingVariants = product.variants.filter(
    (v) =>
      (!colors.length || v.color === selectedColor) &&
      (!sizes.length || v.size === selectedSize),
  );
  const totalVariantStock = product.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
  const variantStock = matchingVariants.reduce((sum, v) => sum + v.stockQuantity, 0);
  const hasVariants = product.variants.length > 0;
  // Availability reflects the piece as a whole; per-option selection gates the
  // actual Add/Buy actions below.
  const info = availabilityOf(product, { hasStock: hasVariants ? totalVariantStock > 0 : undefined });
  // A product that HAS sizes requires a size before any purchase action.
  const sizeRequired = sizes.length > 0;
  const selectionComplete =
    (!hasVariants || variantStock > 0) && (!sizeRequired || !!selectedSize);
  const variantPrice = matchingVariants.find((v) => v.price)?.price;
  const productOnlyPrice = variantPrice ?? product.price;
  const packagePrice = product.completePackagePrice ?? null;
  const price =
    purchaseOption === "complete_package" && packagePrice ? packagePrice : productOnlyPrice;

  const variantFor = (size: string) =>
    product.variants.find((v) => v.color === selectedColor && v.size === size);

  const guardSelection = (): boolean => {
    if (sizeRequired && !selectedSize) {
      setSizeError(true);
      return false;
    }
    return true;
  };

  const handleAdd = () => {
    if (!guardSelection()) return;
    const variantLabel =
      [selectedColor, selectedSize].filter(Boolean).join(" · ") || null;
    add({
      productId: product.id,
      sku: product.sku,
      slug: product.slug,
      name: product.name,
      variantLabel,
      purchaseOption,
      customization: null,
      imageUrl: product.images[0]?.url ?? null,
      unitPrice: price,
      quantity: 1,
      maxStock: hasVariants ? variantStock : 99,
    });
    logEvent("add_to_cart", {
      slug: product.slug,
      sku: product.sku,
      purchaseOption,
      size: selectedSize,
      valueKobo: price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const handleBuyNow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (selectionComplete) {
      handleAdd();
      logEvent("begin_checkout", {
        slug: product.slug,
        sku: product.sku,
        purchaseOption,
        size: selectedSize,
        valueKobo: price,
      });
      return;
    }
    e.preventDefault();
    guardSelection();
  };

  const image = product.images[selectedImage]?.url ?? null;
  const tier = normalizeTier(product.tier);
  // Quote-only: unpriced pieces or pieces the admin has not yet approved for
  // checkout never show Add to Cart / Buy Now.
  const quoteOnly = product.price <= 0 || !product.checkoutReady;
  const shareLink = `${SITE_URL}/product/${product.slug}`;
  const [linkCopied, setLinkCopied] = useState(false);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the link remains visible in the address bar */
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-28 pb-8">
      <nav aria-label="Breadcrumb" className="mb-8 text-[0.68rem] uppercase tracking-btn text-stone">
        <Link to="/shop" search={{ q: undefined, tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined }} className="hover:text-ink">Shop</Link>
        <span className="mx-2">/</span>
        <Link to="/shop/$category" params={{ category: product.categorySlug }} search={{ tier: undefined, min: undefined, max: undefined, size: undefined, colour: undefined, availability: undefined, sort: undefined, sub: undefined }} className="hover:text-ink">
          {product.categorySlug}
        </Link>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <div>
          {image ? (
            <button
              type="button"
              className="img-frame aspect-[4/5] w-full relative cursor-zoom-in"
              onClick={() => setZoomed(true)}
              aria-label="View image fullscreen"
            >
              <img
                src={img(image, { w: 1000, fit: product.imageFit === "contain" ? "contain" : undefined })}
                alt={product.images[selectedImage]?.altText ?? product.name}
                fetchPriority={selectedImage === 0 ? "high" : undefined}
              />
            </button>
          ) : (
            <ImageComingSoon aspect="aspect-[4/5]" label={`${product.name} — image coming soon`} />
          )}
          {product.images.length > 1 && (
            <div className="flex gap-3 mt-3">
              {product.images.map((im, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  aria-label={`View image ${i + 1} of ${product.name}`}
                  aria-pressed={selectedImage === i}
                  className={`w-20 aspect-[4/5] img-frame border ${
                    selectedImage === i ? "border-gold" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img(im.url, { w: 160, fit: product.imageFit === "contain" ? "contain" : undefined })} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="tier-badge mb-3">{TIER_LABELS[tier]}</p>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl leading-tight">
            {product.name}
          </h1>

          {quoteOnly ? (
            /* Quote-only: an honest price conversation, never a fake checkout. */
            <div className="mt-6 border border-ink/15 px-5 py-5">
              <p className="font-editorial text-2xl">Request a quote</p>
              <p className="text-sm text-stone mt-2 leading-relaxed">
                This piece is priced after a short review of your requirements —
                materials, sizing and delivery are confirmed before anything is
                made. Checkout is disabled until a quote is agreed.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link to="/custom" className="btn-lux btn-lux-primary flex-1">
                  Start a Design Brief
                </Link>
                <WhatsAppCTAButton
                  message={`Hello ${BRAND.shortName}, I'd like a quote for ${product.name} (${product.sku}).`}
                  whatsappNumber={
                    (settings.whatsappNumber as string) || CONTACT.whatsappNumber
                  }
                  label="Ask on WhatsApp"
                  className="flex-1"
                />
              </div>
            </div>
          ) : packagePrice ? (
            <div className="mt-6 space-y-2">
              {(
                [
                  {
                    key: "product_only" as const,
                    label: "Product Only",
                    amount: productOnlyPrice,
                    note: "The piece on its own.",
                  },
                  {
                    key: "complete_package" as const,
                    label: "Complete Package",
                    amount: packagePrice,
                    note: "The piece with the full DREAMZ finishing — gift box, dust bag, care guide and more.",
                  },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPurchaseOption(opt.key)}
                  aria-pressed={purchaseOption === opt.key}
                  className={`w-full text-left border px-4 py-3.5 flex items-center justify-between gap-4 transition-colors ${
                    purchaseOption === opt.key
                      ? "border-ink bg-ink/[0.03]"
                      : "border-ink/20 hover:border-ink/50"
                  }`}
                >
                  <span>
                    <span className="block text-[0.68rem] uppercase tracking-btn">
                      {opt.label}
                    </span>
                    <span className="block text-xs text-stone mt-0.5">{opt.note}</span>
                  </span>
                  <span className="font-editorial text-xl whitespace-nowrap">
                    {formatNaira(opt.amount)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 font-editorial text-2xl">
              {formatNaira(productOnlyPrice)}
            </p>
          )}

          {/* Personalization, when the house offers it at a stated charge */}
          {product.personalizationLabel && product.personalizationChargeKobo ? (
            <p className="mt-3 text-sm text-stone">
              Personalization available — {product.personalizationLabel} (+
              {formatNaira(product.personalizationChargeKobo)}), arranged after
              your order is placed.
            </p>
          ) : null}

          {/* Deposit plan hint — terms are confirmed at checkout */}
          {product.depositEligible && !quoteOnly && (
            <p className="mt-3 text-sm text-stone">
              Deposit option available for this made-to-order piece — pay a
              deposit now and the balance before dispatch. Full terms shown at
              checkout.
            </p>
          )}

          <p className="mt-6 text-stone leading-relaxed">{product.shortDescription}</p>

          {/* Color selection */}
          {colors.length > 0 && (
            <div className="mt-8">
              <p className="input-lux-label">Colour — {selectedColor}</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedColor(c);
                      // Same design, different colourway: the gallery holds
                      // one image per colourway in the product's colour
                      // order, so selecting a colour brings up its image.
                      const idx = (product.colors ?? []).indexOf(c);
                      if (idx >= 0 && idx < product.images.length) setSelectedImage(idx);
                    }}
                    aria-pressed={selectedColor === c}
                    className={`px-4 py-2.5 text-xs uppercase tracking-btn border transition-colors ${
                      selectedColor === c
                        ? "border-ink bg-ink text-ivory"
                        : "border-ink/25 hover:border-ink"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size selection */}
          {sizes.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-baseline">
                <p className="input-lux-label" id="size-label">
                  Size {selectedSize ? `— ${selectedSize}` : ""}
                </p>
                <span className="text-xs text-stone">EU sizes</span>
              </div>
              <div
                className="flex flex-wrap gap-2 mt-2"
                role="group"
                aria-labelledby="size-label"
              >
                {sizes.map((s) => {
                  const v = variantFor(s);
                  const out = !v || v.stockQuantity === 0;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={out}
                      aria-pressed={selectedSize === s}
                      aria-label={
                        out
                          ? `Size ${s} unavailable`
                          : `Select size ${s}`
                      }
                      onClick={() => {
                        setSelectedSize(s);
                        setSizeError(false);
                      }}
                      className={`min-w-12 py-2.5 text-xs tracking-wide border transition-colors ${
                        selectedSize === s
                          ? "border-ink bg-ink text-ivory"
                          : out
                            ? "border-ink/15 text-ink/30 line-through cursor-not-allowed"
                            : "border-ink/25 hover:border-ink"
                      }`}
                    >
                      {out ? `${s} — Unavailable` : s}
                    </button>
                  );
                })}
              </div>
              {sizeError && (
                <p role="alert" className="mt-2 text-xs text-oxblood">
                  Please choose your size first — it travels with your order all
                  the way to delivery.
                </p>
              )}
            </div>
          )}

          {/* Availability */}
          <p className="mt-5 text-xs uppercase tracking-btn" aria-live="polite">
            {info.state === "available" ? (
              <span className="text-forest">{info.label}</span>
            ) : (
              <span className={info.purchasable ? "text-forest" : "text-oxblood"}>{info.label}</span>
            )}
          </p>

          {/* CTAs — availability state and purchase actions never contradict */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {!quoteOnly && info.purchasable ? (
              <>
                <button
                  onClick={handleAdd}
                  disabled={!selectionComplete}
                  aria-disabled={!selectionComplete}
                  className="btn-lux btn-lux-outline flex-1"
                >
                  {added
                    ? "Added ✓"
                    : purchaseOption === "complete_package"
                      ? "Add Complete Package"
                      : "Add to Cart"}
                </button>
                <Link
                  to="/checkout"
                  className="btn-lux btn-lux-primary flex-1"
                  onClick={handleBuyNow}
                >
                  Buy Now
                </Link>
              </>
            ) : !quoteOnly ? (
              <>
                <WhatsAppCTAButton
                  message={`Hello ${BRAND.shortName}, please notify me when ${product.name} (${product.sku}) is available again.`}
                  whatsappNumber={
                    (settings.whatsappNumber as string) || CONTACT.whatsappNumber
                  }
                  label={info.altCta?.label ?? "Notify Me"}
                  className="flex-1"
                />
                <WhatsAppCTAButton
                  message={`Hello ${BRAND.shortName}, I'd like to ask about ${product.name} (${product.sku}).`}
                  whatsappNumber={
                    (settings.whatsappNumber as string) || CONTACT.whatsappNumber
                  }
                  label="Ask on WhatsApp"
                  className="flex-1"
                />
              </>
            ) : null}
          </div>
          {!quoteOnly && product.customizable && (
            <Link
              to="/custom"
              className="btn-lux btn-lux-gold w-full mt-3"
            >
              Design Something Similar
            </Link>
          )}
          {tier === "bespoke" && !quoteOnly && (
            <Link
              to="/royale/request"
              className="btn-lux text-ink border border-ink/30 hover:border-ink w-full mt-3"
            >
              Commission This Piece
            </Link>
          )}
          {!quoteOnly && (
            <div className="mt-3">
              <ProductWhatsAppCTA
                product={product}
                whatsappNumber={(settings.whatsappNumber as string) || CONTACT.whatsappNumber}
                customizable={product.customizable}
              />
            </div>
          )}
          <button
            type="button"
            onClick={copyShareLink}
            className="mt-4 text-xs uppercase tracking-btn text-stone hover:text-ink transition-colors"
          >
            {linkCopied ? "Link copied ✓" : "Share this piece"}
          </button>

          {/* Accordions */}
          <div className="mt-10 border-t border-ink/10 divide-y divide-ink/10">
            <Accordion title="Description" defaultOpen>
              <p className="leading-relaxed whitespace-pre-line">{product.fullDescription}</p>
            </Accordion>
            {packagePrice && product.packageContents.length > 0 && (
              <Accordion title="Complete Package Includes">
                <ul className="space-y-1.5">
                  {product.packageContents.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span aria-hidden="true" className="text-gold">✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Accordion>
            )}
            {product.materials && (
              <Accordion title="Materials">
                <p>{product.materials}</p>
              </Accordion>
            )}
            {product.sizeGuide && (
              <Accordion title="Size Guide">
                <p className="whitespace-pre-line">{product.sizeGuide}</p>
              </Accordion>
            )}
            {product.careInformation && (
              <Accordion title="Care">
                <p>{product.careInformation}</p>
              </Accordion>
            )}
            <Accordion title="Delivery & Returns">
              <p>{product.deliveryInformation || "Delivered nationwide in 2–5 working days."}</p>
              <p>{product.returnsTerms || "Exchange available within 48 hours of delivery for unworn pieces in original packaging."}</p>
              <p>
                Questions on sizing or delivery?{" "}
                <a href={CONTACT.phoneHref} className="underline hover:text-ink">
                  Call {CONTACT.phoneDisplay}
                </a>{" "}
                or email{" "}
                <a href={`mailto:${CONTACT.email}`} className="underline hover:text-ink break-all">
                  {CONTACT.email}
                </a>
                .
              </p>
            </Accordion>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="pt-24">
          <div className="text-center mb-10">
            <p className="overline-label mb-3">Continue Browsing</p>
            <h2 className="font-editorial text-3xl">You May Also Like</h2>
            <div className="rule-gold mx-auto mt-6" />
          </div>
          <ProductGrid products={related} />
        </section>
      )}

      {/* Fullscreen zoom overlay */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[90] bg-ink/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} image viewer`}
        >
          <button
            onClick={() => setZoomed(false)}
            aria-label="Close image viewer"
            className="absolute top-5 right-5 text-ivory p-2"
          >
            <svg width="22" height="22" viewBox="0 0 18 18" stroke="currentColor" strokeWidth="1.4" fill="none">
              <path d="M2 2l14 14M16 2L2 16" />
            </svg>
          </button>
          {image && (
            <img
              src={img(image, { w: 1600 })}
              alt={product.images[selectedImage]?.altText ?? product.name}
              className="max-h-[90vh] max-w-full object-contain"
            />
          )}
        </div>
      )}
    </div>
  );
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex justify-between items-center py-4 text-[0.7rem] uppercase tracking-btn text-left"
      >
        {title}
        <span aria-hidden="true" className="text-base leading-none">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div className="pb-5 text-sm text-stone space-y-3">{children}</div>}
    </div>
  );
}
