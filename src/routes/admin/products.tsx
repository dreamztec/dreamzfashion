import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  adminListProducts,
  adminSaveProduct,
  adminSetProductStatus,
  adminDeleteProduct,
} from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";
import { formatNaira } from "@/lib/format";
import { isDisplayableImageUrl } from "@/lib/img";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type AdminProduct = Awaited<ReturnType<typeof adminListProducts>>[number];

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

// Tier ↔ legacy brand line mapping (the line column is kept for data
// compatibility only; the tier is what customers see).
const TIERS = [
  { value: "essentials", label: "DREAMZ Essentials — accessible everyday pieces", line: "essentials" },
  { value: "signature", label: "DREAMZ Signature — distinctive, premium finishes", line: "originals" },
  { value: "bespoke", label: "DREAMZ Bespoke — commissioned, priced after review", line: "royale" },
] as const;

const EMPTY = {
  id: undefined as number | undefined,
  sku: "",
  name: "",
  slug: "",
  categorySlug: "footwear",
  subcategory: "",
  price: 0,
  completePackagePrice: null as number | null,
  packageContents: "",
  compareAtPrice: null as number | null,
  shortDescription: "",
  fullDescription: "",
  materials: "",
  colors: "",
  sizes: "",
  stockQuantity: 0,
  availability: "available" as "available" | "made_to_order" | "on_request" | "out_of_stock" | "sold_out",
  imageFit: "cover" as "cover" | "contain",
  featured: false,
  newArrival: false,
  bestseller: false,
  customizable: false,
  tier: "essentials" as (typeof TIERS)[number]["value"],
  internalCostKobo: null as number | null,
  depositEligible: false,
  depositPercent: null as number | null,
  personalizationLabel: "",
  personalizationChargeKobo: null as number | null,
  sizeGuide: "",
  returnsTerms: "",
  checkoutReady: true,
  status: "draft" as "draft" | "published" | "archived",
  imageUrl: "",
  careInformation: "",
  deliveryInformation: "",
};

function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [priceNaira, setPriceNaira] = useState("");
  const [packagePriceNaira, setPackagePriceNaira] = useState("");
  const [compareNaira, setCompareNaira] = useState("");
  const [costNaira, setCostNaira] = useState("");

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
    setPriceNaira("");
    setPackagePriceNaira("");
    setCompareNaira("");
    setCostNaira("");
    setShowForm(true);
    setMessage(null);
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
      imageFit: (p.imageFit as typeof EMPTY.imageFit) || "cover",
      featured: p.featured,
      newArrival: p.newArrival,
      bestseller: p.bestseller,
      customizable: p.customizable,
      tier: (TIERS.find((t) => t.value === p.tier)?.value ?? "essentials") as typeof EMPTY.tier,
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
    setPriceNaira(p.price ? String(p.price / 100) : "");
    setPackagePriceNaira(p.completePackagePrice ? String(p.completePackagePrice / 100) : "");
    setCompareNaira(p.compareAtPrice ? String(p.compareAtPrice / 100) : "");
    setCostNaira(p.internalCostKobo ? String(p.internalCostKobo / 100) : "");
    setShowForm(true);
    setMessage(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await adminCall(adminSaveProduct, {
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
        customizable: editing.customizable,
        productLine: TIERS.find((t) => t.value === editing.tier)?.line ?? "essentials",
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
        imageUrl: editing.imageUrl,
        careInformation: editing.careInformation,
        deliveryInformation: editing.deliveryInformation,
      });
      setShowForm(false);
      setMessage("Product saved.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: number, status: "draft" | "published" | "archived") => {
    await adminCall(adminSetProductStatus, { id, status });
    await load();
  };

  const remove = async (id: number, name: string) => {
    if (!window.confirm(`Delete “${name}” permanently? This cannot be undone.`)) return;
    await adminCall(adminDeleteProduct, { id });
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-editorial text-3xl">Products</h1>
        <button onClick={startNew} className="btn-lux btn-lux-primary !py-3 !px-6">
          + Add Product
        </button>
      </div>

      {message && <p className="mb-6 text-sm border border-ink/15 px-4 py-3">{message}</p>}

      {showForm && (
        <form onSubmit={handleSave} className="border border-ink/15 p-6 sm:p-8 mb-10 grid gap-4 sm:grid-cols-2 bg-white/40">
          <h2 className="sm:col-span-2 font-editorial text-xl">
            {editing.id ? "Edit Product" : "New Product"}
          </h2>

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
              onChange={(e) => setEditing((v) => ({ ...v, categorySlug: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
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
              placeholder="40, 41, 42, 43"
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
            <label className="input-lux-label">Subcategory</label>
            <input
              className="input-lux"
              value={editing.subcategory}
              onChange={(e) => setEditing((v) => ({ ...v, subcategory: e.target.value }))}
              placeholder="Sandals"
            />
          </div>
          <div>
            <label className="input-lux-label">Tier</label>
            <select
              className="input-lux"
              value={editing.tier}
              onChange={(e) =>
                setEditing((v) => ({ ...v, tier: e.target.value as typeof v.tier }))
              }
            >
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone">
              What customers see. Bespoke pieces are quote-only until a price is
              approved. Packaging ("Complete Package") stays a separate choice.
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
            <p className="mt-1 text-xs text-stone">
              Never shown to customers. Leave empty if unknown — contribution
              figures will be labelled incomplete.
            </p>
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
            <p className="mt-1 text-xs text-stone">
              Non-available states replace Add to Cart with Notify Me / Ask on WhatsApp.
            </p>
          </div>
          <div>
            <label className="input-lux-label">Image Fit</label>
            <select
              className="input-lux"
              value={editing.imageFit}
              onChange={(e) =>
                setEditing((v) => ({ ...v, imageFit: e.target.value as typeof v.imageFit }))
              }
            >
              <option value="cover">Cover (fill the frame)</option>
              <option value="contain">Contain (show full artwork)</option>
            </select>
            <p className="mt-1 text-xs text-stone">
              Use Contain for poster-style artwork with printed names/prices so nothing is cropped.
            </p>
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
          <div className="sm:col-span-2">
            <label className="input-lux-label">Cover image URL</label>
            <input
              className="input-lux"
              value={editing.imageUrl}
              onChange={(e) => setEditing((v) => ({ ...v, imageUrl: e.target.value }))}
              placeholder="/api/media/media/… (uploaded in the Media page) or https://…"
            />
            <p className="mt-1 text-xs text-stone">
              Upload the approved photography in the <strong>Media</strong> page
              (bulk upload supported), then paste its /api/media/… URL here — or
              paste an external CDN URL. Until then customers see an elegant
              "Image coming soon" placeholder.
            </p>
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
              Checkout approved
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
                ["featured", "Featured"],
                ["newArrival", "New Arrival"],
                ["bestseller", "Bestseller"],
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
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={saving} className="btn-lux btn-lux-primary">
              {saving ? "Saving…" : "Save Product"}
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
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {isDisplayableImageUrl(p.image) ? (
                      <img
                        src={`/.netlify/images?url=${encodeURIComponent(p.image)}&w=80`}
                        alt=""
                        className="w-10 h-12 object-cover"
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
                    {p.tier ?? "essentials"}
                    {!p.checkoutReady && " · checkout off"}
                    {p.depositEligible && " · deposit"}
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
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="text-center text-stone text-sm py-10">No products yet.</p>
        )}
      </div>
    </div>
  );
}