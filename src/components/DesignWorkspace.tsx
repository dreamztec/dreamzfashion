import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { saveCustomDesign, getCustomDesign } from "@/server/designs.functions";
import {
  LEATHER_PALETTE,
  defaultSelection,
  selectionSummary,
  validateSelection,
  type DesignSelection,
  type DesignTemplate,
} from "@/lib/design-templates";
import { REFERENCE_LIMITS, precheckFile } from "@/lib/reference-upload";
import { ProductMedia } from "@/components/brand";
import { useCart } from "@/store/cart";
import { formatNaira } from "@/lib/format";
import { whatsappLink } from "@/components/whatsapp";
import { BRAND } from "@/lib/config";

type BaseProduct = {
  id: number;
  sku: string;
  slug: string;
  name: string;
  price: number;
  checkoutReady: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
};

type RefItem = {
  key: string;
  name: string;
  previewUrl: string | null;
  refId: string | null;
  progress: number;
  error: string | null;
};

const hexOf = (name: string) => LEATHER_PALETTE.find((c) => c.name === name)?.hex ?? "#ccc";

/**
 * Design Your Dream Outfit — written-specification workspace.
 * No authored 3D model exists for this design yet, so nothing here pretends
 * to be a 3D render: choices are recorded part by part, saved as a versioned
 * design and carried into the cart and order for the artisan.
 */
export function DesignWorkspace({
  template,
  product,
  initialDesign,
}: {
  template: DesignTemplate;
  product: BaseProduct;
  initialDesign: { designId: string; editToken: string } | null;
}) {
  const [selection, setSelection] = useState<DesignSelection>(() => defaultSelection(template));
  const [activePart, setActivePart] = useState(template.parts[0].key);
  const [notes, setNotes] = useState("");
  const [refs, setRefs] = useState<RefItem[]>([]);
  const [saved, setSaved] = useState<{ designId: string; editToken: string } | null>(initialDesign);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "busy" | "ok" | "error"; message?: string }>({ kind: "idle" });
  const [loading, setLoading] = useState(Boolean(initialDesign));
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceKey = useRef<string | null>(null);
  const addToCart = useCart((s) => s.add);

  // Reopen a saved design exactly as it was saved.
  useEffect(() => {
    if (!initialDesign) return;
    getCustomDesign({ data: initialDesign })
      .then((res) => {
        if (!res.found) {
          setStatus({ kind: "error", message: "That design link isn't valid any more. You can start a new design below." });
          setSaved(null);
          return;
        }
        setSelection(res.design.selection);
        setNotes(res.design.notes);
        setRefs(
          res.design.references.map((r) => ({
            key: r.refId,
            name: r.originalName ?? "Reference image",
            previewUrl: `/api/design-references/${r.refId}`,
            refId: r.refId,
            progress: 100,
            error: null,
          })),
        );
        setStatus({ kind: "ok", message: `Design ${res.design.designId} reopened (version ${res.design.configVersion}).` });
      })
      .catch(() => setStatus({ kind: "error", message: "We couldn't reopen that design just now. Please refresh to try again." }))
      .finally(() => setLoading(false));
  }, [initialDesign]);

  const part = template.parts.find((p) => p.key === activePart)!;
  const errors = useMemo(() => validateSelection(template, selection), [template, selection]);
  const uploading = refs.some((r) => !r.refId && !r.error);

  const change = (fn: (s: DesignSelection) => DesignSelection) => {
    setSelection((s) => fn(s));
    setDirty(true);
  };

  const setPartColour = (colour: string) =>
    // Only the selected part changes — every other panel keeps its value.
    change((s) => ({ ...s, parts: { ...s.parts, [activePart]: colour } }));

  function startUpload(file: File, replacing: string | null) {
    const problem = precheckFile(file);
    const key = replacing ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let previewUrl: string | null = null;
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {
      previewUrl = null;
    }
    const item: RefItem = { key, name: file.name, previewUrl, refId: null, progress: 0, error: problem };
    setRefs((list) => (replacing ? list.map((r) => (r.key === replacing ? item : r)) : [...list, item]));
    setDirty(true);
    if (problem) return;

    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/design-references/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 95);
        setRefs((list) => list.map((r) => (r.key === key ? { ...r, progress: pct } : r)));
      }
    };
    const fail = (message: string) => setRefs((list) => list.map((r) => (r.key === key ? { ...r, error: message } : r)));
    xhr.onerror = () => fail("Upload failed — check your connection and try again.");
    xhr.onload = () => {
      let body: { refId?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* handled below */
      }
      if (xhr.status === 200 && body.refId) {
        setRefs((list) => list.map((r) => (r.key === key ? { ...r, refId: body.refId!, progress: 100 } : r)));
      } else {
        fail(body.error ?? (xhr.status === 413 ? `The image is too large — keep it under ${REFERENCE_LIMITS.maxLabel}.` : "Upload failed — please try again."));
      }
    };
    xhr.send(form);
  }

  function onFiles(list: FileList | null) {
    if (!list) return;
    const replacing = replaceKey.current;
    replaceKey.current = null;
    const files = Array.from(list);
    if (replacing) {
      if (files[0]) startUpload(files[0], replacing);
      return;
    }
    const room = REFERENCE_LIMITS.maxFiles - refs.length;
    if (room <= 0) {
      setStatus({ kind: "error", message: `You can attach up to ${REFERENCE_LIMITS.maxFiles} images.` });
      return;
    }
    files.slice(0, room).forEach((f) => startUpload(f, null));
    if (files.length > room) setStatus({ kind: "error", message: `Only the first ${room} image(s) were added — the limit is ${REFERENCE_LIMITS.maxFiles}.` });
  }

  async function save(): Promise<{ designId: string; editToken: string } | null> {
    if (errors.length) {
      setStatus({ kind: "error", message: errors[0] });
      return null;
    }
    if (uploading) {
      setStatus({ kind: "error", message: "Wait for your images to finish uploading." });
      return null;
    }
    if (refs.some((r) => r.error)) {
      setStatus({ kind: "error", message: "Remove or replace the images that failed to upload first." });
      return null;
    }
    setStatus({ kind: "busy", message: "Saving your design…" });
    try {
      const res = await saveCustomDesign({
        data: {
          designId: saved?.designId ?? null,
          editToken: saved?.editToken ?? null,
          productId: product.id,
          selection,
          referenceIds: refs.map((r) => r.refId!).filter(Boolean),
          notes,
        },
      });
      const next = { designId: res.designId, editToken: res.editToken };
      setSaved(next);
      setDirty(false);
      const url = new URL(window.location.href);
      url.searchParams.set("design", res.designId);
      url.searchParams.set("t", res.editToken);
      window.history.replaceState(null, "", url.toString());
      setStatus({ kind: "ok", message: `Saved as design ${res.designId}. Bookmark this page to reopen it.` });
      return next;
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "We couldn't save your design. Please try again." });
      return null;
    }
  }

  async function saveAndAddToCart() {
    if (!selection.size) {
      setStatus({ kind: "error", message: "Choose your size before adding the design to your cart." });
      return;
    }
    const result = dirty || !saved ? await save() : saved;
    if (!result) return;
    addToCart({
      productId: product.id,
      sku: product.sku,
      slug: product.slug,
      name: `${product.name} — custom design`,
      variantLabel: `Size ${selection.size}`,
      purchaseOption: "product_only",
      customization: { "Design ID": result.designId },
      designId: result.designId,
      quoteRequired: true,
      imageUrl: product.imageUrl,
      unitPrice: 0,
      quantity: 1,
      maxStock: 10,
    });
  }

  const reopenUrl = saved
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/custom?design=${saved.designId}&t=${saved.editToken}`
    : null;
  const summary = selectionSummary(template, selection);
  const waHref = whatsappLink(
    `Hello ${BRAND.shortName}, I've designed a ${product.name}${saved ? ` (design ${saved.designId})` : ""}. Can you confirm the quote?`,
    null,
  );

  if (loading) return <p className="text-center text-stone py-16">Reopening your design…</p>;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      {/* Base design + honest 3D status */}
      <div>
        <ProductMedia
          url={product.imageUrl}
          alt={product.imageAlt ?? product.name}
          aspect="aspect-square"
          width={900}
          eager
        />
        <p className="mt-3 text-xs text-stone leading-relaxed">
          Base design, as photographed. Your colour choices are recorded as a
          written specification — they are not painted onto this photo.
        </p>
        <div className="mt-5 border border-gold/50 bg-gold/5 px-4 py-3 text-xs leading-relaxed" role="note">
          <strong>3D preview not available yet.</strong> A faithful 3D model of
          this boot (with each panel as a separate part) is being prepared.
          Until then, the workshop builds from the specification you save here
          and confirms every detail with you before production.
        </div>

        {/* Live specification swatches */}
        <h3 className="input-lux-label mt-8">Your specification</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {template.parts.map((p) => (
            <li key={p.key} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full border border-ink/20" style={{ background: hexOf(selection.parts[p.key]) }} />
              <span className="text-stone">{p.label}:</span> {selection.parts[p.key]}
            </li>
          ))}
        </ul>
      </div>

      {/* Controls */}
      <div>
        <p className="overline-label mb-2">{product.name}</p>
        <h2 className="font-editorial text-3xl mb-6">Choose each part</h2>

        <fieldset>
          <legend className="input-lux-label">Part</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Part to edit">
            {template.parts.map((p) => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={activePart === p.key}
                onClick={() => setActivePart(p.key)}
                className={`flex items-center gap-2 border px-3 py-2 text-xs min-h-11 ${
                  activePart === p.key ? "border-ink bg-ink text-ivory" : "border-ink/20 hover:border-ink/60"
                }`}
              >
                <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border border-white/40" style={{ background: hexOf(selection.parts[p.key]) }} />
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="input-lux-label">
            {part.label} colour: <span className="normal-case tracking-normal text-ink">{selection.parts[activePart]}</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${part.label} colour`}>
            {LEATHER_PALETTE.map((c) => (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={selection.parts[activePart] === c.name}
                aria-label={c.name}
                title={c.name}
                onClick={() => setPartColour(c.name)}
                className={`h-11 w-11 rounded-full border-2 ${
                  selection.parts[activePart] === c.name ? "border-ink ring-2 ring-offset-2 ring-ink" : "border-ink/15"
                }`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <label htmlFor="part-material" className="input-lux-label">{part.label} material</label>
          <select
            id="part-material"
            className="input-lux"
            value={selection.materials[activePart]}
            onChange={(e) => change((s) => ({ ...s, materials: { ...s.materials, [activePart]: e.target.value } }))}
          >
            {part.materials.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {template.components.map((c) => (
            <div key={c.key}>
              <label htmlFor={`comp-${c.key}`} className="input-lux-label">{c.label}</label>
              <select
                id={`comp-${c.key}`}
                className="input-lux"
                value={selection.components[c.key]}
                onChange={(e) => change((s) => ({ ...s, components: { ...s.components, [c.key]: e.target.value } }))}
              >
                {c.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone">
          Shaft and heel height are fixed for this design — changing them needs
          an authored model, so they aren't offered as options.
        </p>

        <div className="mt-6">
          <label htmlFor="design-size" className="input-lux-label">Size (EU)</label>
          <select
            id="design-size"
            className="input-lux"
            value={selection.size ?? ""}
            onChange={(e) => change((s) => ({ ...s, size: e.target.value || null }))}
          >
            <option value="">Select size</option>
            {template.sizes.map((sz) => (
              <option key={sz}>{sz}</option>
            ))}
          </select>
        </div>

        {/* Reference images */}
        <div className="mt-8">
          <p className="input-lux-label">Inspiration images (optional)</p>
          <p className="text-xs text-stone mb-3">
            {REFERENCE_LIMITS.formatsLabel}, up to {REFERENCE_LIMITS.maxLabel} each, {REFERENCE_LIMITS.maxFiles} images max.
            References guide the artisan — uploading a photo does not create a 3D model or change the design automatically.
          </p>
          <input
            ref={fileInput}
            type="file"
            accept={REFERENCE_LIMITS.accept}
            multiple
            className="sr-only"
            id="ref-input"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {refs.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {refs.map((r) => (
                <li key={r.key} className="border border-ink/10 p-2 text-xs">
                  <div className="aspect-square bg-ivory-deep flex items-center justify-center overflow-hidden">
                    {r.previewUrl ? (
                      <img
                        src={r.previewUrl}
                        alt={`Reference: ${r.name}`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // HEIC previews only render in some browsers.
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate" title={r.name}>{r.name}</p>
                  {r.error ? (
                    <p className="text-brand-red" role="alert">{r.error}</p>
                  ) : r.refId ? (
                    <p className="text-forest">Uploaded ✓</p>
                  ) : (
                    <div className="h-1.5 bg-ink/10 mt-1" role="progressbar" aria-valuenow={r.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${r.name}`}>
                      <div className="h-full bg-ink transition-all" style={{ width: `${r.progress}%` }} />
                    </div>
                  )}
                  <div className="flex gap-3 mt-1">
                    <button
                      type="button"
                      className="underline py-1"
                      onClick={() => {
                        replaceKey.current = r.key;
                        fileInput.current?.click();
                      }}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="underline py-1"
                      onClick={() => {
                        setRefs((list) => list.filter((x) => x.key !== r.key));
                        setDirty(true);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {refs.length < REFERENCE_LIMITS.maxFiles && (
            <label htmlFor="ref-input" className="btn-lux btn-lux-outline cursor-pointer !py-2.5">
              Add photos (gallery or camera)
            </label>
          )}
        </div>

        <div className="mt-6">
          <label htmlFor="design-notes" className="input-lux-label">Notes for the artisan (optional)</label>
          <textarea
            id="design-notes"
            rows={3}
            maxLength={1000}
            className="input-lux"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            placeholder="Occasion, deadline, anything we should know…"
          />
        </div>

        {/* Price status */}
        <div className="mt-8 border border-ink/15 px-5 py-4 text-sm">
          <p>
            <span className="text-stone">Sample as photographed: </span>
            {product.price > 0 && product.checkoutReady ? formatNaira(product.price) : "Request a quote"}
          </p>
          <p className="mt-1">
            <span className="text-stone">Your custom design: </span>
            <strong>Quote required</strong> — the house prices it after review. Nothing is charged until you approve the quote.
          </p>
        </div>

        {status.kind !== "idle" && (
          <p
            role={status.kind === "error" ? "alert" : "status"}
            className={`mt-5 text-sm px-4 py-3 border ${
              status.kind === "error" ? "border-oxblood/40 bg-oxblood/5 text-oxblood" : "border-forest/30 bg-forest/5"
            }`}
          >
            {status.message}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={() => void save()} disabled={status.kind === "busy" || uploading} className="btn-lux btn-lux-outline flex-1">
            {saved && !dirty ? "Saved ✓" : "Save design"}
          </button>
          <button type="button" onClick={() => void saveAndAddToCart()} disabled={status.kind === "busy" || uploading} className="btn-lux btn-lux-primary flex-1">
            Add design to cart
          </button>
        </div>
        <button
          type="button"
          className="mt-3 text-xs underline text-stone py-2"
          onClick={() => {
            setSelection(defaultSelection(template));
            setDirty(true);
          }}
        >
          Reset to the original colours
        </button>

        {reopenUrl && (
          <div className="mt-6 text-xs text-stone break-all">
            Reopen this design any time: <a className="underline" href={reopenUrl}>{reopenUrl}</a>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-4 text-xs">
          {waHref && (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="underline">
              Ask about this design on WhatsApp
            </a>
          )}
          <Link to="/product/$slug" params={{ slug: product.slug }} className="underline">
            Buy the sample as photographed
          </Link>
        </div>

        <details className="mt-8 text-xs text-stone">
          <summary className="cursor-pointer">What the artisan receives</summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k} className="contents">
                <dt>{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </div>
  );
}
