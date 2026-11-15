import { useEffect, useRef, useState } from "react";

/**
 * The Dream DP is intentionally rendered on the customer's device.
 * Their portrait is never uploaded to DREAMZ or a third-party image service.
 * The product image comes from the existing Studio upload / published Dream page.
 */
type Format = "square" | "story";

type DreamDPGeneratorProps = {
  productImageUrl: string;
  productName: string;
  dreamUrl?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be opened."));
    image.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const imageWidth = width / scale;
  const imageHeight = height / scale;
  const left = (image.naturalWidth - imageWidth) / 2;
  const top = (image.naturalHeight - imageHeight) / 2;
  ctx.drawImage(image, left, top, imageWidth, imageHeight, x, y, width, height);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontFamily: string,
  maxWidth: number,
  minSize = 24,
) {
  let size = fontSize;
  do {
    ctx.font = "600 " + size + "px " + fontFamily;
    if (ctx.measureText(text).width <= maxWidth || size <= minSize) break;
    size -= 2;
  } while (size > minSize);
  return size;
}

async function paintDP(
  canvas: HTMLCanvasElement,
  photo: string,
  product: string,
  format: Format,
  displayName: string,
  productName: string,
  dreamUrl: string,
) {
  const personImagePromise = loadImage(photo);
  const productImagePromise = loadImage(product);
  const [personImage, productImage] = await Promise.all([personImagePromise, productImagePromise]);
  const width = 1080;
  const height = format === "story" ? 1920 : 1080;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image creation is unavailable on this device.");

  const ink = "#231e1a";
  const cream = "#f5f1e9";
  const gold = "#b38b53";
  const isStory = format === "story";
  const top = isStory ? 346 : 250;
  const panelHeight = isStory ? 1190 : 572;
  const panelWidth = 464;
  const footerY = isStory ? 1596 : 852;
  const footerHeight = height - footerY;

  ctx.fillStyle = cream;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.font = "700 68px Georgia, serif";
  ctx.fillText("DREAMZ", 56, isStory ? 115 : 98);
  ctx.fillStyle = gold;
  ctx.fillRect(56, isStory ? 142 : 122, 154, 5);
  ctx.fillStyle = ink;
  ctx.font = "600 58px Georgia, serif";
  ctx.fillText("I DESIGNED MY DREAM", 56, isStory ? 254 : 202);

  // The two photographs remain distinct: no AI face edits and no alterations
  // to the customer's actual generated product design.
  ctx.fillStyle = "#e8e0d5";
  ctx.fillRect(56, top, panelWidth, panelHeight);
  drawCover(ctx, personImage, 56, top, panelWidth, panelHeight);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(560, top, panelWidth, panelHeight);
  drawContain(ctx, productImage, 584, top + 38, panelWidth - 48, panelHeight - 90);

  ctx.fillStyle = "rgba(35,30,26,0.9)";
  ctx.fillRect(56, top + panelHeight - 64, panelWidth, 64);
  ctx.fillRect(560, top + panelHeight - 64, panelWidth, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 24px Arial, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("THE DREAMER", 76, top + panelHeight - 23);
  ctx.fillText("MY DESIGN", 580, top + panelHeight - 23);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = ink;
  ctx.fillRect(0, footerY, width, footerHeight);
  ctx.fillStyle = "#f7f1e8";
  const safeName = (displayName.trim() || "A DREAMZ DREAMER").slice(0, 42);
  const nameFont = fitText(ctx, safeName, isStory ? 70 : 52, "Georgia, serif", 948, 30);
  ctx.font = "600 " + nameFont + "px Georgia, serif";
  ctx.fillText(safeName, 56, footerY + (isStory ? 104 : 68));

  const safeProduct = (productName.trim() || "My Dream Design").slice(0, 85);
  const productFont = fitText(ctx, safeProduct, isStory ? 41 : 30, "Arial, sans-serif", 948, 21);
  ctx.font = "500 " + productFont + "px Arial, sans-serif";
  ctx.fillText(safeProduct, 56, footerY + (isStory ? 169 : 115));

  ctx.fillStyle = "#d3b682";
  ctx.font = "500 " + (isStory ? 29 : 22) + "px Arial, sans-serif";
  ctx.fillText("CREATED BY ME. CRAFTED BY DREAMZ.", 56, footerY + (isStory ? 237 : 163));

  if (dreamUrl) {
    ctx.fillStyle = "#eee8df";
    ctx.font = "400 23px Arial, sans-serif";
    ctx.fillText(dreamUrl.slice(0, 73), 56, footerY + (isStory ? 293 : 201));
  }
}

export function DreamDPGenerator({ productImageUrl, productName, dreamUrl = "" }: DreamDPGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [format, setFormat] = useState<Format>("square");
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cloudinaryReady, setCloudinaryReady] = useState(false);
  const [publicConsent, setPublicConsent] = useState(false);
  const [publicLink, setPublicLink] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoObjectUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (photoObjectUrl.current) URL.revokeObjectURL(photoObjectUrl.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetch("/api/dream-dp", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ available?: boolean }> : { available: false })
      .then((result) => { if (active) setCloudinaryReady(Boolean(result.available)); })
      .catch(() => { if (active) setCloudinaryReady(false); });
    return () => { active = false; };
  }, [open]);

  // Any new photograph, design or image format invalidates the previous public link.
  useEffect(() => {
    setPublicLink("");
    setPublicConsent(false);
  }, [photoUrl, format, displayName, productImageUrl, productName]);

  useEffect(() => {
    if (!open || !photoUrl || !productImageUrl || !canvasRef.current) {
      setReady(false);
      return;
    }
    let cancelled = false;
    setReady(false);
    const absoluteDreamUrl = dreamUrl
      ? (dreamUrl.startsWith("/") ? "dreamzfashion.dreamz-gc.com" + dreamUrl : dreamUrl)
      : "";
    paintDP(canvasRef.current, photoUrl, productImageUrl, format, displayName, productName, absoluteDreamUrl)
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setNotice("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
          setNotice("We couldn't create the DP from these images. Try another JPG, PNG, or WebP photograph.");
        }
      });
    return () => { cancelled = true; };
  }, [open, photoUrl, productImageUrl, format, displayName, productName, dreamUrl]);

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
      setNotice("Choose a JPG, PNG or WebP photo smaller than 8 MB.");
      return;
    }
    if (photoObjectUrl.current) URL.revokeObjectURL(photoObjectUrl.current);
    const url = URL.createObjectURL(file);
    photoObjectUrl.current = url;
    setPhotoUrl(url);
    setNotice("");
  };

  const makeBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject(new Error("DP not ready."));
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image export failed.")), "image/png");
    });

  const exportDP = async (share: boolean) => {
    if (!ready || !consent || busy) {
      setNotice("Choose a photo and confirm you have permission to share it.");
      return;
    }
    setBusy(true);
    try {
      const blob = await makeBlob();
      const name = "dreamz-my-dream-" + format + ".png";
      const file = new File([blob], name, { type: "image/png" });
      const url = dreamUrl
        ? new URL(dreamUrl, window.location.origin).href
        : undefined;
      if (share && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        try {
          await navigator.share({
            title: "My DREAMZ Design",
            text: "I designed my dream with DREAMZ." + (url ? " " + url : ""),
            files: [file],
          });
          setNotice("Your DP is ready to share.");
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          // Fall through to download if the app cannot accept image files.
        }
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      setNotice(share
        ? "DP downloaded. Open WhatsApp, Instagram or Facebook and upload the image from your gallery."
        : "DP downloaded to your device.");
    } catch {
      setNotice("The DP could not be exported. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const publishPublicDP = async () => {
    if (!ready || !consent || !publicConsent || busy || !cloudinaryReady) {
      setNotice("Confirm the public-photo consent before publishing your DP.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const blob = await makeBlob();
      const body = new FormData();
      body.set("file", new File([blob], "dream-dp.png", { type: "image/png" }));
      body.set("consent", "publish-public");
      const response = await fetch("/api/dream-dp", { method: "POST", body });
      const result = await response.json() as { ok?: boolean; shareUrl?: string; error?: string };
      if (!response.ok || !result.ok || !result.shareUrl) {
        throw new Error(result.error || "Your DP could not be published.");
      }
      setPublicLink(result.shareUrl);
      setNotice("Your public Dream DP link is ready. Anyone with the link can view and share this image.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The DP could not be published.");
    } finally {
      setBusy(false);
    }
  };

  const sharePublicDP = async () => {
    if (!publicLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "I Designed My Dream — DREAMZ",
          text: "I designed my dream with DREAMZ.",
          url: publicLink,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(publicLink);
      setNotice("Public DP link copied. Paste it into WhatsApp, Facebook or any social app.");
    } catch {
      setNotice("Open your published DP page and copy the URL from the browser.");
    }
  };

  const copyLink = async () => {
    if (!dreamUrl) return;
    try {
      await navigator.clipboard.writeText(new URL(dreamUrl, window.location.origin).href);
      setNotice("Dream page link copied.");
    } catch {
      setNotice("Your browser blocked copying. Open the Dream page and copy its address instead.");
    }
  };

  return (
    <section className="mt-6 border border-gold/30 bg-ivory p-5 sm:p-7">
      <p className="overline-label !text-gold">DREAMZ Dream DP</p>
      <h3 className="mt-2 font-editorial text-2xl sm:text-3xl">Put yourself beside your dream.</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone">
        Add your photo beside your actual product design. Download a display picture or
        share a Story with your own Dream page link. Your photo stays on this device unless you choose to share it.
      </p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-lux btn-lux-primary mt-5">
          Create My Dream DP
        </button>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.86fr)] lg:items-start">
          <div>
            <div className="overflow-hidden border border-ink/10 bg-white">
              {photoUrl ? (
                <canvas
                  ref={canvasRef}
                  width={1080}
                  height={format === "story" ? 1920 : 1080}
                  className="block h-auto w-full"
                  aria-label="Preview of your personalised DREAMZ display picture"
                  role="img"
                />
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center p-6 text-center text-stone">
                  <p className="font-editorial text-3xl">Your dream. Your face.</p>
                  <p className="mt-3 text-sm">Choose a photograph to see your DP preview here.</p>
                </div>
              )}
            </div>
            {photoUrl && !ready && (
              <p className="mt-2 text-xs text-stone" role="status">Preparing your DP preview…</p>
            )}
          </div>
          <div className="space-y-5">
            <label className="block text-sm">
              <span className="mb-2 block font-medium">Your photograph</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => choosePhoto(event.currentTarget.files?.[0])}
                className="block w-full text-xs file:mr-3 file:border file:border-ink/30 file:bg-white file:px-3 file:py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-medium">Name on the DP (optional)</span>
              <input
                type="text"
                maxLength={42}
                value={displayName}
                onChange={(event) => setDisplayName(event.currentTarget.value)}
                placeholder="Your name"
                className="w-full border border-ink/20 bg-white px-3 py-3 text-sm"
              />
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Choose your format</legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={format === "square"}
                  onClick={() => setFormat("square")}
                  className={format === "square" ? "btn-lux btn-lux-primary !py-2" : "btn-lux btn-lux-outline !py-2"}
                >
                  DP / Square
                </button>
                <button
                  type="button"
                  aria-pressed={format === "story"}
                  onClick={() => setFormat("story")}
                  className={format === "story" ? "btn-lux btn-lux-primary !py-2" : "btn-lux btn-lux-outline !py-2"}
                >
                  Story / Status
                </button>
              </div>
            </fieldset>
            <label className="flex items-start gap-3 text-xs leading-relaxed">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.currentTarget.checked)}
                className="mt-1"
              />
              <span>I own this photograph or have permission to use it, and I choose to create a shareable DP with it.</span>
            </label>
            {notice && <p role="status" className="border border-gold/30 bg-gold/5 p-3 text-xs">{notice}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!ready || !consent || busy} onClick={() => void exportDP(false)} className="btn-lux btn-lux-primary !py-2.5 disabled:opacity-40">
                {busy ? "Preparing…" : "Download My DP"}
              </button>
              <button type="button" disabled={!ready || !consent || busy} onClick={() => void exportDP(true)} className="btn-lux btn-lux-outline !py-2.5 disabled:opacity-40">
                Share My DP
              </button>
              {dreamUrl && (
                <button type="button" onClick={() => void copyLink()} className="btn-lux btn-lux-outline !py-2.5">
                  Copy Dream Link
                </button>
              )}
            </div>
            {cloudinaryReady && (
              <div className="border-t border-ink/15 pt-5 space-y-4">
                <p className="text-sm font-medium">Publish a shareable link with your photo and design</p>
                <p className="text-xs leading-relaxed text-stone">
                  This optional step sends your completed DP to Cloudinary as a public image.
                  It can appear in WhatsApp and other link previews, and anyone with the URL may keep a copy.
                  You must sign in to publish. Downloading does not require an account.
                </p>
                {!publicLink ? (
                  <>
                    <label className="flex items-start gap-3 text-xs leading-relaxed">
                      <input
                        type="checkbox"
                        checked={publicConsent}
                        onChange={(event) => setPublicConsent(event.currentTarget.checked)}
                        className="mt-1"
                      />
                      <span>I explicitly agree to publish this DP containing my photograph, name and product design publicly.</span>
                    </label>
                    <button
                      type="button"
                      disabled={!ready || !consent || !publicConsent || busy}
                      onClick={() => void publishPublicDP()}
                      className="btn-lux btn-lux-primary !py-2.5 disabled:opacity-40"
                    >
                      {busy ? "Publishing…" : "Publish My DP Link"}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <a href={publicLink} target="_blank" rel="noopener noreferrer" className="text-xs underline break-all">
                      {publicLink}
                    </a>
                    <button type="button" onClick={() => void sharePublicDP()} className="btn-lux btn-lux-primary !py-2.5">
                      Share Public DP Link
                    </button>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs leading-relaxed text-stone">
              Your photograph is combined in your browser and is not automatically uploaded to DREAMZ or Cloudinary.
              Social apps that do not accept images from the browser will use your saved image instead.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
