import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminListMedia,
  adminUpdateMedia,
  adminDeleteMedia,
  adminUploadMedia,
  adminAssignMediaToProduct,
  adminApplyColourway,
  adminSuggestImageMatch,
} from "@/server/media.functions";
import { adminListProducts } from "@/server/admin.functions";
import { adminCall } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/media")({
  component: AdminMedia,
});

const CATEGORIES = [
  "PRODUCT",
  "CAMPAIGN",
  "LOOKBOOK",
  "HOMEPAGE",
  "PARTNERSHIPS",
  "SOCIAL",
  "BRAND",
  "OTHER",
] as const;

type MediaAsset = Awaited<ReturnType<typeof adminListMedia>>[number];
type AdminProduct = Awaited<ReturnType<typeof adminListProducts>>[number];

type SuggestionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; configured: boolean; productId: number | null; productName: string | null; note: string };

function AdminMedia() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadCat, setUploadCat] = useState<string>("PRODUCT");
  const [uploadLifestyle, setUploadLifestyle] = useState(false);
  const [matchPanelId, setMatchPanelId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Record<number, SuggestionState>>({});
  const [colourwayInputs, setColourwayInputs] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setAssets(await adminCall(adminListMedia));
      setProducts(await adminCall(adminListProducts));
    } catch {
      setMessage("Could not load media. Is ADMIN_SECRET configured?");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = assets.filter((a) => {
    if (filter !== "ALL" && a.category !== filter) return false;
    if (search && !`${a.title} ${a.altText}`.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setMessage(null);
    const qualityNotes: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      try {
        // Quality control: measure resolution before upload. Source files are
        // never deleted or rejected outright — the admin decides.
        const dims = await measureImage(file);
        if (dims && Math.min(dims.w, dims.h) < MIN_IMAGE_SIDE_PX) {
          qualityNotes.push(`${file.name} (${dims.w}×${dims.h}) — below the ${MIN_IMAGE_SIDE_PX}px guidance`);
        }
        const dataUrl = await readAsDataUrl(file);
        await adminCall(adminUploadMedia, {
          filename: file.name.replace(/[^a-zA-Z0-9._-]/g, "-"),
          dataUrl,
          title: file.name.replace(/\.[^.]+$/, ""),
          altText: "",
          category: uploadCat as (typeof CATEGORIES)[number],
          isLifestyle: uploadLifestyle,
        });
      } catch (err) {
        setMessage(err instanceof Error ? err.message : `Could not upload ${file.name}`);
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    await load();
    if (!message) {
      setMessage(
        qualityNotes.length > 0
          ? `Upload complete. ⚠ Low resolution: ${qualityNotes.join("; ")}. Assign these to a product and preview before publishing.`
          : "Upload complete.",
      );
    }
  };

  const update = async (id: number, patch: Record<string, unknown>) => {
    const cast = patch as {
      title?: string;
      altText?: string;
      category?: (typeof CATEGORIES)[number];
      isLifestyle?: boolean;
    };
    await adminCall(adminUpdateMedia, { id, ...cast });
    await load();
  };

  const remove = async (a: MediaAsset) => {
    if (!window.confirm(`Delete “${a.title || a.url}” from the media library?`)) return;
    await adminCall(adminDeleteMedia, { id: a.id, url: a.url });
    await load();
  };

  const assign = async (mediaId: number, productId: number, asPrimary: boolean) => {
    await adminCall(adminAssignMediaToProduct, { mediaId, productId, asPrimary });
    setMessage(
      asPrimary
        ? "Assigned as the product's cover image."
        : "Added to the product's gallery.",
    );
    await load();
  };

  const applyColourway = async (mediaId: number, productId: number, color: string) => {
    if (!color.trim()) {
      setMessage("Enter the colour label for the new colourway.");
      return;
    }
    try {
      await adminCall(adminApplyColourway, { mediaId, productId, color: color.trim() });
      setMessage(`Saved as a new colourway. Price/stock stay as they are — review in Products.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save the colourway.");
    }
  };

  const suggest = async (a: MediaAsset) => {
    setSuggestions((s) => ({ ...s, [a.id]: { status: "loading" } }));
    try {
      // Repo-path assets are read straight from the repo; blob uploads need
      // the browser to supply the bytes.
      const dataUrl = a.url.startsWith("/img/") ? await readAsDataUrlFromUrl(a.url) : undefined;
      const res = await adminCall(adminSuggestImageMatch, { mediaId: a.id, dataUrl });
      setSuggestions((s) => ({
        ...s,
        [a.id]: {
          status: "done",
          configured: res.configured,
          productId: res.suggestion?.productId ?? null,
          productName: res.suggestion?.productName ?? null,
          note: res.note,
        },
      }));
    } catch (err) {
      setSuggestions((s) => ({
        ...s,
        [a.id]: {
          status: "done",
          configured: true,
          productId: null,
          productName: null,
          note: err instanceof Error ? err.message : "Matching failed.",
        },
      }));
    }
  };

  const readAsDataUrlFromUrl = async (url: string): Promise<string | undefined> => {
    try {
      const res = await fetch(`/.netlify/images?url=${encodeURIComponent(url)}&w=800&fm=jpg`);
      if (!res.ok) return undefined;
      const blob = await res.blob();
      return await blobToDataUrl(blob);
    } catch {
      return undefined;
    }
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.readAsDataURL(blob);
    });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="font-editorial text-3xl mb-2">Media Library</h1>
      <p className="text-sm text-stone mb-8 max-w-2xl">
        Manage every image on the site — product artwork, campaigns, lookbook,
        homepage, partnerships and brand media. Product imagery is kept separate
        from lifestyle/editorial imagery; a lifestyle image never becomes a
        product's primary photo unless you assign it deliberately.
      </p>

      {message && <p className="mb-6 text-sm border border-ink/15 px-4 py-3">{message}</p>}

      {/* Upload */}
      <div className="border border-ink/15 p-6 mb-8 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end bg-white/40">
        <div>
          <label className="input-lux-label" htmlFor="media-file">Upload images</label>
          <input
            id="media-file"
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="input-lux !py-2"
            disabled={busy}
          />
        </div>
        <div>
          <label className="input-lux-label" htmlFor="media-cat">Category</label>
          <select
            id="media-cat"
            className="input-lux !py-2"
            value={uploadCat}
            onChange={(e) => setUploadCat(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm pb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={uploadLifestyle}
            onChange={(e) => setUploadLifestyle(e.target.checked)}
          />
          Lifestyle / editorial
        </label>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setFilter("ALL")}
          className={`text-[0.68rem] uppercase tracking-btn px-3 py-1.5 border ${
            filter === "ALL" ? "border-ink bg-ink text-ivory" : "border-ink/20"
          }`}
        >
          All ({assets.length})
        </button>
        {CATEGORIES.map((c) => {
          const n = assets.filter((a) => a.category === c).length;
          if (n === 0 && filter !== c) return null;
          return (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-[0.68rem] uppercase tracking-btn px-3 py-1.5 border ${
                filter === c ? "border-ink bg-ink text-ivory" : "border-ink/20"
              }`}
            >
              {c} ({n})
            </button>
          );
        })}
        <input
          className="input-lux !py-1.5 max-w-56 ml-auto"
          placeholder="Search media…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <p className="text-center text-stone py-16">No media in this view yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {visible.map((a) => (
            <div key={a.id} className="border border-ink/10 bg-white/40">
              <div className="img-frame aspect-[4/5] bg-linen flex items-center justify-center">
                {a.url.startsWith("/img/") ? (
                  <span className="text-[0.6rem] uppercase tracking-luxe text-stone px-3 text-center">
                    Removed — upload again
                  </span>
                ) : (
                  <img
                    src={a.url}
                    alt={a.altText || a.title}
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-3 space-y-2">
                <input
                  className="w-full text-sm border-b border-transparent hover:border-ink/20 focus:border-ink outline-none bg-transparent"
                  defaultValue={a.title}
                  onBlur={(e) => {
                    if (e.target.value !== a.title) update(a.id, { title: e.target.value });
                  }}
                  aria-label="Media title"
                />
                <div className="flex gap-2">
                  <select
                    className="flex-1 text-xs border border-ink/15 px-1.5 py-1 bg-transparent"
                    value={a.category}
                    onChange={(e) => update(a.id, { category: e.target.value })}
                    aria-label="Media category"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[0.65rem] uppercase tracking-btn cursor-pointer" title="Lifestyle / editorial">
                    <input
                      type="checkbox"
                      checked={a.isLifestyle}
                      onChange={(e) => update(a.id, { isLifestyle: e.target.checked })}
                    />
                    Life
                  </label>
                </div>
                <select
                  className="w-full text-xs border border-ink/15 px-1.5 py-1 bg-transparent"
                  value=""
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) return;
                    if (value.startsWith("gallery:")) {
                      assign(a.id, Number(value.slice(8)), false);
                    } else {
                      assign(a.id, Number(value), true);
                    }
                  }}
                  aria-label="Assign to product"
                >
                  <option value="">Assign to product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — as cover</option>
                  ))}
                  {products.map((p) => (
                    <option key={`g-${p.id}`} value={`gallery:${p.id}`}>{p.name} — add to gallery</option>
                  ))}
                </select>

                {/* Same Design / New Colourway — approval control. AI may
                    suggest a match, but the house combines products only by
                    explicit choice here. */}
                <div className="border border-ink/10 bg-white/60">
                  <button
                    type="button"
                    onClick={() => {
                      setMatchPanelId((cur) => (cur === a.id ? null : a.id));
                      if (!suggestions[a.id]) suggest(a);
                    }}
                    aria-expanded={matchPanelId === a.id}
                    className="w-full text-[0.65rem] uppercase tracking-btn px-2 py-1.5 hover:bg-ink/5 text-left"
                  >
                    Same design / new colourway {matchPanelId === a.id ? "−" : "+"}
                  </button>
                  {matchPanelId === a.id && (
                    <div className="px-2 pb-2 space-y-2">
                      <p className="text-[0.65rem] text-stone">
                        {(() => {
                          const s = suggestions[a.id];
                          if (!s || s.status === "idle") return "AI suggestion will appear here.";
                          if (s.status === "loading") return "AI is studying the photograph…";
                          if (!s.configured) return s.note;
                          if (s.productName) return `AI suggests: ${s.productName} — ${s.note}`;
                          return s.note;
                        })()}
                      </p>
                      <select
                        className="w-full text-xs border border-ink/15 px-1.5 py-1 bg-transparent"
                        value={(() => {
                          const s = suggestions[a.id];
                          const pid = s?.status === "done" ? s.productId : null;
                          if (pid == null) return "";
                          return String(pid);
                        })()}
                        onChange={(e) =>
                          setSuggestions((s) => {
                            const cur = s[a.id];
                            if (!cur || cur.status !== "done") return s;
                            const p = products.find((x) => String(x.id) === e.target.value);
                            return { ...s, [a.id]: { ...cur, productId: p?.id ?? null, productName: p?.name ?? null } };
                          })
                        }
                        aria-label="Same design as product"
                      >
                        <option value="">Not a colourway of a listed product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        className="w-full text-xs border border-ink/15 px-1.5 py-1 bg-transparent"
                        placeholder='Colour label, e.g. "Cognac + Royal Blue"'
                        value={colourwayInputs[a.id] ?? ""}
                        onChange={(e) => setColourwayInputs((c) => ({ ...c, [a.id]: e.target.value }))}
                        aria-label="New colourway label"
                      />
                      <button
                        type="button"
                        disabled={(() => {
                          const s = suggestions[a.id];
                          return !(s?.status === "done" && s.productId);
                        })()}
                        onClick={() => {
                          const s = suggestions[a.id];
                          if (s?.status === "done" && s.productId) {
                            void applyColourway(a.id, s.productId, colourwayInputs[a.id] ?? "");
                          }
                        }}
                        className="w-full text-[0.65rem] uppercase tracking-btn border border-ink px-2 py-1.5 bg-ink text-ivory disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Approve as colourway
                      </button>
                      <p className="text-[0.6rem] text-stone">
                        Combining happens only when you approve. Suggestion is advisory.
                      </p>
                    </div>
                  )}
                </div>

                {a.productId && (
                  <p className="text-[0.65rem] text-forest uppercase tracking-btn">
                    Assigned to product #{a.productId}
                  </p>
                )}
                <button
                  onClick={() => remove(a)}
                  className="text-[0.65rem] uppercase tracking-btn text-oxblood hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/** Minimum recommended short-side for product photography. */
const MIN_IMAGE_SIDE_PX = 900;

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
