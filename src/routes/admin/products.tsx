import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  adminListProducts,
  adminSaveProduct,
  adminSetProductStatus,
  adminSetProductCollection,
  adminDeleteProduct,
} from "@/server/admin.functions";
import { adminUploadMedia, adminListMedia } from "@/server/media.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";
import { isDisplayableImageUrl } from "@/lib/img";
import { PRODUCT_TYPES } from "@/lib/taxonomy";
import {
  needsCategoryConfirmation,
  COLLECTION_LABELS,
  COLLECTIONS,
  type Collection,
} from "@/lib/collection";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type AdminProduct = Awaited<ReturnType<typeof adminListProducts>>[number];
type MediaAsset = Awaited<ReturnType<typeof adminListMedia>>[number];
type GalleryImage = { url: string; altText: string; kind: "product" | "lifestyle" | "catalogue" };

const CATEGORIES = [
  { slug: "footwear", label: "Footwear" },
  { slug: "bags", label: "Bags" },
  { slug: "accessories", label: "Accessories" },
];

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "made_to_order", label: "Made to Order" },
  { value: "on_request", label: "Available on Request" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "sold_out", label: "Sold Out" },
];

// The three customer-facing collections. The admin's choice here always
// overrides the automatic suggestion rules.
const COLLECTION_OPTIONS: Array<{ value: Collection; label: string }> = [
  { value: "essentials", label: "Essentials — ready-to-wear, accessible" },
  { value: "originals", label: "Originals — distinctive DREAMZ house designs" },
  { value: "royale", label: "Royale — premium design & customization service" },
];

const EMPTY: {
  id: number | undefined;
  sku: string;
  name: string;
  slug: string;
  categorySlug: string;
  subcategory: string;
  price: number;
  completePackagePrice: number | null;
  packageContents: string;
  compareAtPrice: number | null;
  shortDescription: string;
  fullDescription: string;
  materials: string;
  colors: string;
  sizes: string;
  stockQuantity: number;
  availability: "available" | "made_to_order" | "on_request" | "out_of_stock" | "sold_out";
  imageFit: "cover" | "contain";
  featured: boolean;
  newArrival: boolean;
  bestseller: boolean;
  homepageHero: boolean;
  customizable: boolean;
  tier: Collection;
  internalCostKobo: number | null;
  depositEligible: boolean;
  depositPercent: number | null;
  personalizationLabel: string;
  personalizationChargeKobo: number | null;
  sizeGuide: string;
  returnsTerms: string;
  checkoutReady: boolean;
  status: "draft" | "published" | "archived";
  imageUrl: string;
  careInformation: string;
  deliveryInformation: string;
} = {
  id: undefined,
  sku: "",
  name: "",
  slug: "",
  categorySlug: "footwear",
  subcategory: "",
  price: 0,
  completePackagePrice: null,
  packageContents: "",
  compareAtPrice: null,
  shortDescription: "",
  fullDescription: "",
  materials: "",
  colors: "",
  sizes: "",
  stockQuantity: 0,
  availability: "available",
  imageFit: "contain",
  featured: false,
  newArrival: false,
  bestseller: false,
  homepageHero: false,
  customizable: false,
  tier: "essentials",
  internalCostKobo: null,
  depositEligible: false,
  depositPercent: null,
  personalizationLabel: "",
  personalizationChargeKobo: null,
  sizeGuide: "",
  returnsTerms: "",
  checkoutReady: true,
  status: "draft",
  imageUrl: "",
  careInformation: "",
  deliveryInformation: "",
};

/** Product photography should be at least this many pixels on its short side. */
const MIN_IMAGE_SIDE_PX = 900;

/** Load a file client-side and report its pixel dimensions (or null). */
function measureImage(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      resolve({ w: im.naturalWidth, h: im.naturalHeight });
      URL.revokeObjectURL(url);
    };
    im.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    im.src = url;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY>(EMPTY);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [priceNaira, setPriceNaira] = useState("");
  const [packagePriceNaira, setPackagePriceNaira] = useState("");
  const [compareNaira, setCompareNaira] = useState("");
  const [costNaira, setCostNaira] = useState("");
  const [uploading, setUploading] = useState(false);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [showLibrary, setShowLibrary] = useState(false);
  const [library, setLibrary] = useState<MediaAsset[] | null>(null);
  const [previewMode, setPreviewMode] = useState<"none" | "mobile" | "desktop">("none");

  const load = useCallback(async () => {
    try {
      setProducts(await adminCall(adminListProducts));
    } catch {
      setMessage("Could not load products. Is ADMIN_SECRET configured?");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setEditing({ ...EMPTY });
    setGallery([]);
    setWarnings({});
    setPriceNaira("");
    setPackagePriceNaira("");
    setCompareNaira("");
    setCostNaira("");
    setShowForm(true);
    setMessage(null);
    setPreviewMode("none");
  };

  const startEdit = (p: AdminProduct) => {
    setEditing({
      id: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      categorySlug: p.categorySlug,
      subcategory: p.subcategory ?? "",
      price: p.price,
      completePackagePrice: p.completePackagePrice ?? null,
      packageContents: (p.packageContents ?? []).join("\n"),
      compareAtPrice: p.compareAtPrice ?? null,
      shortDescription: p.shortDescription,
      fullDescription: p.fullDescription,
      materials: p.materials ?? "",
      colors: (p.colors ?? []).join(", "),
      sizes: (p.sizes ?? []).join(", "),
      stockQuantity: p.stockQuantity,
      availability: (p.availability as typeof EMPTY.availability) || "available",
      imageFit: (p.imageFit as typeof EMPTY.imageFit) || "contain",
      featured: p.featured,
      newArrival: p.newArrival,
      bestseller: p.bestseller,
      homepageHero: Boolean((p as Record<string, unknown>).homepageHero),
      customizable: p.customizable,
      tier: (COLLECTIONS.includes(p.tier as Collection) ? p.tier : "essentials") as Collection,
      internalCostKobo: p.internalCostKobo ?? null,
      depositEligible: p.depositEligible,
      depositPercent: p.depositPercent ?? null,
      personalizationLabel: p.personalizationLabel ?? "",
      personalizationChargeKobo: p.personalizationChargeKobo ?? null,
      sizeGuide: p.sizeGuide ?? "",
      returnsTerms: p.returnsTerms ?? "",
      checkoutReady: p.checkoutReady,
      status: p.status as "draft" | "published" | "archived",
      imageUrl: p.image ?? "",
      careInformation: p.careInformation ?? "",
      deliveryInformation: p.deliveryInformation ?? "",
    });
    setGallery(
      (p.gallery ?? [])
        .filter((i) => isDisplayableImageUrl(i.url))
        .map((i) => ({
          url: i.url,
          altText: i.altText ?? "",
          kind: (i.kind as GalleryImage["kind"]) || "product",
        })),
    );
    setWarnings({});
    setPriceNaira(p.price ? String(p.price / 100) : "");
    setPackagePriceNaira(p.completePackagePrice ? String(p.completePackagePrice / 100) : "");
    setCompareNaira(p.compareAtPrice ? String(p.compareAtPrice / 100) : "");
    setCostNaira(p.internalCostKobo ? String(p.internalCostKobo / 100) : "");
    setShowForm(true);
    setMessage(null);
    setPreviewMode("none");
  };

  const moveImage = (index: number, delta: number) => {
    setGallery((imgs) => {
      const next = [...imgs];
      const target = index + delta;
      if (target < 0 || target >= next.length) return imgs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const makeCover = (index: number) => {
    setGallery((imgs) => {
      if (index <= 0) return imgs;
      const next = [...imgs];
      const [img] = next.splice(index, 1);
      next.unshift(img);
      return next;
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    const added: GalleryImage[] = [];
    const nextWarnings: Record<string, string> = {};
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          nextWarnings[file.name] = "Not an image file — skipped.";
          continue;
        }
        const dims = await measureImage(file);
        if (!dims) {
          nextWarnings[file.name] = "File could not be rendered — skipped. The source was not deleted.";
          continue;
        }
        const shortSide = Math.min(dims.w, dims.h);
        if (shortSide < MIN_IMAGE_SIDE_PX) {
          nextWarnings[file.name] = `Low resolution (${dims.w}×${dims.h}) — below the ${MIN_IMAGE_SIDE_PX}px guidance. Uploaded anyway; review the preview before publishing.`;
        }
        const dataUrl = await fileToDataUrl(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "upload.jpg";
        const result = await adminCall(adminUploadMedia, {
          filename: safeName,
          dataUrl,
          title: editing.name || file.name.replace(/\.[a-z0-9]+$/i, ""),
          altText: editing.name ? `${editing.name} — ${file.name.replace(/\.[a-z0-9]+$/i, "")}` : "",
          category: "PRODUCT",
          isLifestyle: false,
        });
        if (result?.asset?.url) {
          added.push({ url: result.asset.url, altText: editing.name || "", kind: "product" });
        }
      }
      setGallery((imgs) => [...imgs, ...added]);
      setWarnings((w) => ({ ...w, ...nextWarnings }));
      if (added.length > 0) setMessage(`${added.length} image${added.length === 1 ? "" : "s"} uploaded.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const openLibrary = async () => {
    setShowLibrary(true);
    if (!library) {
      try {
        setLibrary(await adminCall(adminListMedia));
      } catch {
        setMessage("Could not load the media library.");
      }
    }
  };

  const addFromLibrary = (asset: MediaAsset) => {
    if (!isDisplayableImageUrl(asset.url) || gallery.some((g) => g.url === asset.url)) return;
    setGallery((imgs) => [
      ...imgs,
      { url: asset.url, altText: asset.altText || asset.title || "", kind: "product" },
    ]);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await adminCall(adminSaveProduct, {
        id: editing.id,
        sku: editing.sku,
        name: editing.name,
        slug: editing.slug,
        categorySlug: editing.categorySlug,
        subcategory: editing.subcategory,
        price: Math.round(Number(priceNaira || "0") * 100),
        completePackagePrice: packagePriceNaira
          ? Math.round(Number(packagePriceNaira) * 100)
          : null,
        packageContents: editing.packageContents
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        compareAtPrice: compareNaira ? Math.round(Number(compareNaira) * 100) : null,
        shortDescription: editing.shortDescription,
        fullDescription: editing.fullDescription,
        materials: editing.materials,
        colors: editing.colors.split(",").map((c) => c.trim()).filter(Boolean),
        sizes: editing.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        stockQuantity: editing.stockQuantity,
        availability: editing.availability,
        imageFit: editing.imageFit,
        featured: editing.featured,
        newArrival: editing.newArrival,
        bestseller: editing.bestseller,
        homepageHero: editing.homepageHero,
        customizable: editing.customizable,
        productLine: editing.tier,
        tier: editing.tier,
        internalCostKobo: costNaira ? Math.round(Number(costNaira) * 100) : null,
        depositEligible: editing.depositEligible,
        depositPercent: editing.depositPercent,
        personalizationLabel: editing.personalizationLabel,
        personalizationChargeKobo: editing.personalizationChargeKobo,
        sizeGuide: editing.sizeGuide,
        returnsTerms: editing.returnsTerms,
        checkoutReady: editing.checkoutReady,
        status: editing.status,
        imageUrl: gallery[0]?.url ?? editing.imageUrl,
        careInformation: editing.careInformation,
        deliveryInformation: editing.deliveryInformation,
        images: gallery.map((g) => ({ url: g.url, altText: g.altText, kind: g.kind })),
      });
      setShowForm(false);
      setMessage(
        editing.homepageHero
          ? "Product saved. It is set as the Homepage Hero."
          : "Product saved.",
      );
      void result;
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: number, status: "draft" | "published" | "archived") => {
    // Publishing safety review: a piece goes live only after the admin sees
    // (and explicitly accepts) any gaps in the record. Nothing is invented
    // and no gap is silently published.
    if (status === "published") {
      const p = products.find((x) => x.id === id);
      if (p) {
        const gaps: string[] = [];
        const hasImage = (p.gallery ?? []).some((g) => isDisplayableImageUrl(g.url));
        if (!hasImage) gaps.push("no approved product image (customers will see “Image coming soon”)");
        if ((p.colors ?? []).length === 0) gaps.push("no colour data");
        if (p.price <= 0 && p.checkoutReady) gaps.push("no price while checkout is approved — customers will see “Request a Quote”");
        if (p.stockQuantity <= 0 && p.availability === "available") gaps.push("zero stock while marked Available");
        if (!p.checkoutReady) gaps.push("not approved for checkout (quote-only presentation)");
        const review = (p as { collectionLocked?: boolean }).collectionLocked
          ? { needs: false, reason: null }
          : needsCategoryConfirmation({
              storedTier: p.tier,
              colorsCount: (p.colors ?? []).length || null,
              priceKobo: p.price,
            });
        if (review.needs) gaps.push(`collection not confirmed (${review.reason ?? "ambiguous"})`);
        if (
          gaps.length > 0 &&
          !window.confirm(
            `Publishing “${p.name}” with open items:\n\n• ${gaps.join("\n• ")}\n\nPublish anyway? Nothing is invented — you can fix these after publishing.`,
          )
        ) {
          return;
        }
      }
    }
    await adminCall(adminSetProductStatus, { id, status });
    await load();
  };

  const setCollection = async (id: number, tier: Collection) => {
    await adminCall(adminSetProductCollection, { id, tier });
    await load();
  };

  const remove = async (id: number, name: string) => {
    if (!window.confirm(`Delete “${name}” permanently? This cannot be undone.`)) return;
    await adminCall(adminDeleteProduct, { id });
    await load();
  };

  // ── Review queue: products the classification rules cannot confirm ──
  const reviewQueue = products
    .filter((p) => p.status !== "archived")
    .map((p) => ({
      product: p,
      review: (p as { collectionLocked?: boolean }).collectionLocked
        ? { needs: false, reason: null }
        : needsCategoryConfirmation({
            storedTier: p.tier,
            colorsCount: (p.colors ?? []).length || null,
            priceKobo: p.price,
          }),
    }))
    .filter((x) => x.review.needs);

  const typeOptions = PRODUCT_TYPES[editing.categorySlug] ?? [];
  const knownType = typeOptions.includes(editing.subcategory);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-editorial text-3xl">Products</h1>
        <button onClick={startNew} className="btn-lux btn-lux-primary !py-3 !px-6">
          + Add Product
        </button>
      </div>

      {message && <p className="mb-6 text-sm border border-ink/15 px-4 py-3">{message}</p>}

      {reviewQueue.length > 0 && (
        <div className="mb-10 border border-gold/50 bg-gold/5 px-5 py-5">
          <h2 className="font-editorial text-xl mb-1">Needs Category Confirmation</h2>
          <p className="text-xs text-stone mb-4">
            The automatic Essentials / Originals / Royale rules could not clearly
            classify these pieces. Nothing has been guessed — confirm each one
            manually. Your stored choice always overrides the suggestion.
          </p>
          <ul className="divide-y divide-ink/10">
            {reviewQueue.map(({ product: p, review }) => (
              <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {p.name} <span className="text-stone text-xs">({p.sku})</span>
                  </p>
                  <p className="text-xs text-stone mt-0.5">{review.reason}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {COLLECTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCollection(p.id, c)}
                      className="text-[0.65rem] uppercase tracking-btn border border-ink/25 px-3 py-1.5 hover:border-ink"
                    >
                      {COLLECTION_LABELS[c].replace("DREAMZ ", "")}
                    </button>
                  ))}
                  <button
                    onClick={() => startEdit(p)}
                    className="text-[0.65rem] uppercase tracking-btn text-gold hover:underline"
                  >
                    Review
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSave} className="border border-ink/15 p-6 sm:p-8 mb-10 grid gap-4 sm:grid-cols-2 bg-white/40">
          <h2 className="sm:col-span-2 font-editorial text-xl">
            {editing.id ? "Edit Product" : "Upload Product"}
          </h2>
          <p className="sm:col-span-2 text-xs text-stone -mt-2">
            Workflow: upload images → name the product → choose collection →
            choose product type → set price or quote-only → preview → publish.
          </p>

          <div>
            <label className="input-lux-label">Name *</label>
            <input
              required
              className="input-lux"
              value={editing.name}
              onChange={(e) => {
                const name = e.target.value;
                setEditing((v) => ({
                  ...v,
                  name,
                  slug: v.id ? v.slug : name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
                }));
              }}
            />
          </div>
          <div>
            <label className="input-lux-label">SKU *</label>
            <input
              required
              className="input-lux"
              value={editing.sku}
              onChange={(e) => setEditing((v) => ({ ...v, sku: e.target.value.toUpperCase() }))}
              placeholder="DFK-FTW-XXX-000"
            />
          </div>
          <div>
            <label className="input-lux-label">Slug *</label>
            <input
              required
              className="input-lux"
              value={editing.slug}
              onChange={(e) => setEditing((v) => ({ ...v, slug: e.target.value }))}
              placeholder="dreamz-piece-name"
            />
          </div>
          <div>
            <label className="input-lux-label">Category *</label>
            <select
              className="input-lux"
              value={editing.categorySlug}
              onChange={(e) =>
                setEditing((v) => ({ ...v, categorySlug: e.target.value, subcategory: "" }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-lux-label">Product Type</label>
            <select
              className="input-lux"
              value={editing.subcategory}
              onChange={(e) => setEditing((v) => ({ ...v, subcategory: e.target.value }))}
            >
              <option value="">— choose a type —</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              {!knownType && editing.subcategory && (
                <option value={editing.subcategory}>{editing.subcategory} (existing)</option>
              )}
            </select>
            <p className="mt-1 text-xs text-stone">
              Product type is separate from collection. Accessory types never
              receive shoe-size fields.
            </p>
          </div>
          <div>
            <label className="input-lux-label">Collection *</label>
            <select
              className="input-lux"
              value={editing.tier}
              onChange={(e) =>
                setEditing((v) => ({ ...v, tier: e.target.value as Collection }))
              }
            >
              {COLLECTION_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone">
              Your manual choice always overrides the automatic suggestion
              (Essentials: ≤2 colours below ₦50,000 · Originals: more than 3
              colours above ₦50,000 · Royale: quote-first design service).
            </p>
          </div>
          <div>
            <label className="input-lux-label">Product Only Price (₦) *</label>
            <input
              required
              type="number"
              min="0"
              step="100"
              className="input-lux"
              value={priceNaira}
              onChange={(e) => setPriceNaira(e.target.value)}
            />
            <p className="mt-1 text-xs text-stone">
              Enter 0 for quote-only pieces — customers see "Request a quote"
              and checkout is disabled.
            </p>
          </div>
          <div>
            <label className="input-lux-label">Complete Package Price (₦)</label>
            <input
              type="number"
              min="0"
              step="100"
              className="input-lux"
              value={packagePriceNaira}
              onChange={(e) => setPackagePriceNaira(e.target.value)}
              placeholder="Leave empty if not offered"
            />
          </div>
          <div>
            <label className="input-lux-label">Compare-at Price (₦)</label>
            <input
              type="number"
              min="0"
              step="100"
              className="input-lux"
              value={compareNaira}
              onChange={(e) => setCompareNaira(e.target.value)}
            />
          </div>
          <div>
            <label className="input-lux-label">Colours (comma separated)</label>
            <input
              className="input-lux"
              value={editing.colors}
              onChange={(e) => setEditing((v) => ({ ...v, colors: e.target.value }))}
              placeholder="Black, Brown"
            />
          </div>
          <div>
            <label className="input-lux-label">Sizes (comma separated)</label>
            <input
              className="input-lux"
              value={editing.sizes}
              onChange={(e) => setEditing((v) => ({ ...v, sizes: e.target.value }))}
              placeholder="40, 41, 42, 43 — leave empty for accessories"
            />
          </div>
          <div>
            <label className="input-lux-label">Total Stock Quantity</label>
            <input
              type="number"
              min="0"
              className="input-lux"
              value={editing.stockQuantity}
              onChange={(e) => setEditing((v) => ({ ...v, stockQuantity: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="input-lux-label">Availability</label>
            <select
              className="input-lux"
              value={editing.availability}
              onChange={(e) =>
                setEditing((v) => ({ ...v, availability: e.target.value as typeof v.availability }))
              }
            >
              {AVAILABILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-lux-label">Product Fit</label>
            <select
              className="input-lux"
              value={editing.imageFit}
              onChange={(e) =>
                setEditing((v) => ({ ...v, imageFit: e.target.value as typeof v.imageFit }))
              }
            >
              <option value="contain">Contain — show the whole product (recommended)</option>
              <option value="cover">Cover — fill the frame (lifestyle photography)</option>
            </select>
            <p className="mt-1 text-xs text-stone">
              Clean product photography should use Contain: the full toe, heel,
              sole, handles, straps and buckles stay visible on every device.
            </p>
          </div>
          <div>
            <label className="input-lux-label">Internal Cost (₦) — private</label>
            <input
              type="number"
              min="0"
              step="100"
              className="input-lux"
              value={costNaira}
              onChange={(e) => setCostNaira(e.target.value)}
              placeholder="Recorded for margin reporting only"
            />
          </div>

          {/* ── Images: upload, reorder, alt text, role ─────────── */}
          <div className="sm:col-span-2 border border-ink/15 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <label className="input-lux-label !mb-0">Product Images</label>
              <div className="flex flex-wrap gap-2">
                <label className="btn-lux btn-lux-outline !py-2 !px-4 cursor-pointer">
                  {uploading ? "Uploading…" : "+ Upload Images"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleUpload(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button type="button" onClick={openLibrary} className="btn-lux btn-lux-outline !py-2 !px-4">
                  Add from Media Library
                </button>
              </div>
            </div>
            <p className="text-xs text-stone mb-4">
              Multiple images can be uploaded at once. The first image is the
              product cover — reorder below or use "Make cover". The first
              image loads eagerly on the product page.
            </p>

            {showLibrary && (
              <div className="mb-4 border border-ink/15 p-4 max-h-72 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-btn text-stone">Media Library</p>
                  <button type="button" onClick={() => setShowLibrary(false)} className="text-xs underline">
                    Close
                  </button>
                </div>
                {!library ? (
                  <p className="text-xs text-stone">Loading…</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {library
                      .filter((a) => isDisplayableImageUrl(a.url))
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => addFromLibrary(a)}
                          className={`img-frame aspect-square ${gallery.some((g) => g.url === a.url) ? "opacity-40" : "hover:opacity-80"}`}
                          title={gallery.some((g) => g.url === a.url) ? "Already added" : "Add to gallery"}
                        >
                          <img src={`/.netlify/images?url=${encodeURIComponent(a.url)}&w=200&fit=contain`} alt="" loading="lazy" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {gallery.length === 0 ? (
              <p className="text-xs text-stone">
                No images yet. Upload product photography or add approved media
                from the library. Products without images show the neutral
                "Image coming soon" placeholder.
              </p>
            ) : (
              <ul className="space-y-3">
                {gallery.map((g, i) => (
                  <li key={`${g.url}-${i}`} className="flex flex-col sm:flex-row gap-3 items-start border border-ink/10 p-3">
                    <img
                      src={`/.netlify/images?url=${encodeURIComponent(g.url)}&w=140&fit=contain`}
                      alt=""
                      className="w-16 h-16 bg-linen object-contain shrink-0"
                    />
                    <div className="flex-1 w-full grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        className="input-lux !py-1.5"
                        value={g.altText}
                        placeholder="Alt text (describes the image for customers and search)"
                        onChange={(e) =>
                          setGallery((imgs) => imgs.map((im, j) => (j === i ? { ...im, altText: e.target.value } : im)))
                        }
                      />
                      <select
                        className="input-lux !py-1.5"
                        value={g.kind}
                        onChange={(e) =>
                          setGallery((imgs) =>
                            imgs.map((im, j) => (j === i ? { ...im, kind: e.target.value as GalleryImage["kind"] } : im)),
                          )
                        }
                      >
                        <option value="product">Product photography</option>
                        <option value="lifestyle">Lifestyle</option>
                        <option value="catalogue">Catalogue artwork</option>
                      </select>
                      {warnings[g.url] || warnings[Object.keys(warnings).find((k) => g.url.includes(k)) ?? ""] ? (
                        <p className="text-xs text-gold-soft sm:col-span-2">
                          ⚠ {warnings[g.url] ?? warnings[Object.keys(warnings).find((k) => g.url.includes(k)) ?? ""]}
                        </p>
                      ) : null}
                      <div className="flex gap-2 text-[0.65rem] uppercase tracking-btn sm:col-span-2">
                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="disabled:opacity-30 hover:text-gold">↑ Up</button>
                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i === gallery.length - 1} className="disabled:opacity-30 hover:text-gold">↓ Down</button>
                        <button type="button" onClick={() => makeCover(i)} disabled={i === 0} className="disabled:opacity-30 hover:text-gold">Make Cover</button>
                        <button
                          type="button"
                          onClick={() => setGallery((imgs) => imgs.filter((_, j) => j !== i))}
                          className="text-oxblood hover:underline"
                        >
                          Remove
                        </button>
                        {i === 0 && <span className="text-stone">— Cover image</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Preview: exactly how the imagery appears before publishing */}
            {gallery.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs uppercase tracking-btn text-stone">Preview:</span>
                  {(["mobile", "desktop"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewMode(previewMode === mode ? "none" : mode)}
                      className={`text-[0.65rem] uppercase tracking-btn border px-3 py-1 ${
                        previewMode === mode ? "border-ink" : "border-ink/25"
                      }`}
                    >
                      {mode === "mobile" ? "Phone" : "Desktop"}
                    </button>
                  ))}
                </div>
                {previewMode !== "none" && (
                  <div className={`img-frame aspect-[4/5] bg-linen ${previewMode === "mobile" ? "max-w-[240px]" : "max-w-md"}`}>
                    <img
                      src={`/.netlify/images?url=${encodeURIComponent(gallery[0].url)}&w=800&fit=${editing.imageFit === "contain" ? "contain" : "cover"}`}
                      alt={gallery[0].altText || editing.name}
                      className="w-full h-full"
                      style={{ objectFit: editing.imageFit === "contain" ? "contain" : "cover" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="input-lux-label">
              Complete Package Includes (one item per line)
            </label>
            <textarea
              rows={4}
              className="input-lux"
              value={editing.packageContents}
              onChange={(e) => setEditing((v) => ({ ...v, packageContents: e.target.value }))}
              placeholder={"Product\nPremium Gift Box\nDust Bag\nCare Guide\nShoe Care Kit\nDoorstep Delivery Anywhere in Nigeria\nFast-track Production & Delivery Within 7 Days"}
            />
            <p className="mt-1 text-xs text-stone">
              Only shown when a Complete Package price is set. Use exactly what the brand creative states for this product.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label">Short Description</label>
            <input
              className="input-lux"
              value={editing.shortDescription}
              onChange={(e) => setEditing((v) => ({ ...v, shortDescription: e.target.value }))}
              maxLength={300}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label">Full Description</label>
            <textarea
              rows={4}
              className="input-lux"
              value={editing.fullDescription}
              onChange={(e) => setEditing((v) => ({ ...v, fullDescription: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="input-lux-label">Materials</label>
            <input
              className="input-lux"
              value={editing.materials}
              onChange={(e) => setEditing((v) => ({ ...v, materials: e.target.value }))}
              placeholder="Full-grain leather upper, leather sole"
            />
          </div>
          <div>
            <label className="input-lux-label">Size Guide</label>
            <textarea
              rows={2}
              className="input-lux"
              value={editing.sizeGuide}
              onChange={(e) => setEditing((v) => ({ ...v, sizeGuide: e.target.value }))}
              placeholder="e.g. EU 40 = 25.5cm foot length…"
            />
          </div>
          <div>
            <label className="input-lux-label">Returns Terms</label>
            <textarea
              rows={2}
              className="input-lux"
              value={editing.returnsTerms}
              onChange={(e) => setEditing((v) => ({ ...v, returnsTerms: e.target.value }))}
              placeholder="Leave empty to use the house default"
            />
          </div>
          <div>
            <label className="input-lux-label">Personalization Label</label>
            <input
              className="input-lux"
              value={editing.personalizationLabel}
              onChange={(e) => setEditing((v) => ({ ...v, personalizationLabel: e.target.value }))}
              placeholder="e.g. Hand-painted monogram"
            />
          </div>
          <div>
            <label className="input-lux-label">Personalization Charge (₦)</label>
            <input
              type="number"
              min="0"
              step="100"
              className="input-lux"
              value={editing.personalizationChargeKobo ?? ""}
              onChange={(e) =>
                setEditing((v) => ({
                  ...v,
                  personalizationChargeKobo: e.target.value ? Number(e.target.value) * 100 : null,
                }))
              }
            />
          </div>
          <div>
            <label className="input-lux-label flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.depositEligible}
                onChange={(e) => setEditing((v) => ({ ...v, depositEligible: e.target.checked }))}
              />
              Deposit-eligible (made to order)
            </label>
            <p className="mt-1 text-xs text-stone">
              Lets customers pay a deposit + balance on this piece. The percent
              comes from Settings → Deposits unless overridden below.
            </p>
            <input
              type="number"
              min="1"
              max="90"
              className="input-lux mt-2"
              value={editing.depositPercent ?? ""}
              onChange={(e) =>
                setEditing((v) => ({
                  ...v,
                  depositPercent: e.target.value ? Number(e.target.value) : null,
                }))
              }
              placeholder="Custom deposit % (optional)"
            />
          </div>
          <div>
            <label className="input-lux-label flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editing.checkoutReady}
                onChange={(e) => setEditing((v) => ({ ...v, checkoutReady: e.target.checked }))}
              />
              Checkout Approved
            </label>
            <p className="mt-1 text-xs text-stone">
              Tick only when imagery, sizes, stock and pricing are complete.
              Unchecked = customers see "Request a quote" instead of Buy.
            </p>
          </div>
          <div>
            <label className="input-lux-label">Care Information</label>
            <textarea
              rows={2}
              className="input-lux"
              value={editing.careInformation}
              onChange={(e) => setEditing((v) => ({ ...v, careInformation: e.target.value }))}
            />
          </div>
          <div>
            <label className="input-lux-label">Delivery Information</label>
            <textarea
              rows={2}
              className="input-lux"
              value={editing.deliveryInformation}
              onChange={(e) => setEditing((v) => ({ ...v, deliveryInformation: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(
              [
                ["homepageHero", "Homepage Hero"],
                ["bestseller", "Bestseller"],
                ["featured", "Featured"],
                ["newArrival", "New Arrival"],
                ["customizable", "Customizable"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing[key]}
                  onChange={(e) => setEditing((v) => ({ ...v, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>

          <div>
            <label className="input-lux-label">Status</label>
            <select
              className="input-lux"
              value={editing.status}
              onChange={(e) =>
                setEditing((v) => ({ ...v, status: e.target.value as typeof v.status }))
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Publish</option>
              <option value="archived">Archived</option>
            </select>
            <p className="mt-1 text-xs text-stone">
              Publish only after the previews above look right on phone and
              desktop. Publishing does not bypass the image quality warnings.
            </p>
          </div>

          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="btn-lux btn-lux-primary">
              {saving ? "Saving…" : editing.id ? "Save Product" : "Create Product"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-lux btn-lux-outline">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border border-ink/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink/[0.03] text-left text-[0.65rem] uppercase tracking-btn text-stone">
              <th className="px-4 py-3">Piece</th>
              <th className="px-4 py-3">Collection</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {products.map((p) => {
              const review = (p as { collectionLocked?: boolean }).collectionLocked
                ? { needs: false, reason: null }
                : needsCategoryConfirmation({
                    storedTier: p.tier,
                    colorsCount: (p.colors ?? []).length || null,
                    priceKobo: p.price,
                  });
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {isDisplayableImageUrl(p.image) ? (
                        <img
                          src={`/.netlify/images?url=${encodeURIComponent(p.image)}&w=80&fit=contain`}
                          alt=""
                          className="w-10 h-12 object-contain bg-linen"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-10 h-12 bg-linen" aria-hidden="true" />
                      )}
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-stone">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {p.tier ? COLLECTION_LABELS[(p.tier as Collection)] ?? p.tier : "—"}
                    {review.needs && (
                      <span className="block text-[0.65rem] text-gold-soft mt-0.5">Needs confirmation</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.price > 0 ? (
                      formatNaira(p.price)
                    ) : (
                      <span className="text-xs uppercase tracking-btn text-stone">Quote only</span>
                    )}
                    {p.completePackagePrice ? (
                      <span className="block text-xs text-stone">
                        Pkg {formatNaira(p.completePackagePrice)}
                      </span>
                    ) : null}
                    {p.internalCostKobo ? (
                      <span className="block text-[0.65rem] text-stone">
                        cost {formatNaira(p.internalCostKobo)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{p.stockQuantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs uppercase tracking-btn ${
                        p.status === "published" ? "text-forest" : "text-stone"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="block text-[0.65rem] text-stone mt-0.5">
                      {!p.checkoutReady && "checkout off · "}
                      {p.depositEligible && "deposit · "}
                      {Boolean((p as Record<string, unknown>).homepageHero) && "hero · "}
                      {p.bestseller && "bestseller"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs">
                      <button onClick={() => startEdit(p)} className="uppercase tracking-btn hover:text-gold">
                        Edit
                      </button>
                      {p.status !== "published" ? (
                        <button
                          onClick={() => setStatus(p.id, "published")}
                          className="uppercase tracking-btn text-forest hover:underline"
                        >
                          Publish
                        </button>
                      ) : (
                        <button
                          onClick={() => setStatus(p.id, "draft")}
                          className="uppercase tracking-btn text-stone hover:underline"
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        onClick={() => remove(p.id, p.name)}
                        className="uppercase tracking-btn text-oxblood hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="text-center text-stone text-sm py-10">No products yet.</p>
        )}
      </div>
    </div>
  );
}
