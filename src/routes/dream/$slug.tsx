import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getPublicDesign,
  recordDesignOrderIntent,
  recordDesignShare,
  recordDesignView,
  toggleDesignLike,
} from "@/server/designer.functions";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { useAuth } from "@/lib/auth-client";
import { BRAND, SITE_URL } from "@/lib/config";
import { CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/dream/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicDesign({ data: params.slug });
    if (!result) throw new Error("Dream design not found");
    return result;
  },
  head: ({ loaderData, params }) => {
    const payload = (loaderData?.design.payload || {}) as Record<string, unknown>;
    const answers =
      payload.answers && typeof payload.answers === "object"
        ? (payload.answers as Record<string, unknown>)
        : {};
    const landing =
      payload.landingPage && typeof payload.landingPage === "object"
        ? (payload.landingPage as Record<string, unknown>)
        : {};
    const dreamGoal = typeof answers.dreamGoal === "string" ? answers.dreamGoal : "";
    const headline =
      (typeof landing.headline === "string" && landing.headline) ||
      loaderData?.design.title ||
      "Dream Design";
    const description =
      (typeof landing.story === "string" && landing.story) ||
      (dreamGoal
        ? `A DREAMZ leather product designed around the dream to ${dreamGoal}.`
        : `A community-created leather concept by ${loaderData?.designer.displayName || "a DREAMZ Dreamer"}.`);
    const generatedImageUrl =
      typeof payload.generatedImageUrl === "string" && payload.generatedImageUrl
        ? SITE_URL + payload.generatedImageUrl
        : null;
    const canonical = SITE_URL + "/dream/" + params.slug;
    return {
      meta: [
        { title: `${headline} — DREAMZ` },
        { name: "description", content: description.slice(0, 160) },
        { property: "og:title", content: headline },
        { property: "og:description", content: description.slice(0, 220) },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        ...(generatedImageUrl ? [{ property: "og:image", content: generatedImageUrl }] : []),
        { name: "twitter:card", content: generatedImageUrl ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: headline },
        { name: "twitter:description", content: description.slice(0, 220) },
        ...(generatedImageUrl ? [{ name: "twitter:image", content: generatedImageUrl }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: DreamDesignPage,
});

function DreamDesignPage() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const { user } = useAuth();
  const [liked, setLiked] = useState(data.design.likedByMe);
  const [likes, setLikes] = useState(data.design.likeCount);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const key = "dfk-viewed-dream-" + params.slug;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      void recordDesignView({ data: params.slug });
    } catch {
      void recordDesignView({ data: params.slug });
    }
  }, [params.slug]);

  const payload = data.design.payload as Record<string, unknown>;
  const preview =
    payload.visualPreview && typeof payload.visualPreview === "object"
      ? (payload.visualPreview as Record<string, unknown>)
      : {};
  const answers =
    payload.answers && typeof payload.answers === "object"
      ? (payload.answers as Record<string, unknown>)
      : {};
  const landing =
    payload.landingPage && typeof payload.landingPage === "object"
      ? (payload.landingPage as Record<string, unknown>)
      : {};

  const generatedImageUrl =
    typeof payload.generatedImageUrl === "string" ? payload.generatedImageUrl : "";
  const landingHeadline =
    typeof landing.headline === "string" && landing.headline.trim()
      ? landing.headline.trim()
      : data.design.title;
  const landingStory =
    typeof landing.story === "string" && landing.story.trim()
      ? landing.story.trim()
      : "";
  const dreamGoal =
    typeof answers.dreamGoal === "string" ? answers.dreamGoal : "";
  const designAudience =
    typeof answers.designAudience === "string" ? answers.designAudience : "";
  const paintingChoice = answers.paintingChoice === "yes";
  const paintingNotes =
    typeof answers.paintingNotes === "string" ? answers.paintingNotes : "";
  const designCode = params.slug.toUpperCase();

  const directPath = "/dream/" + params.slug;
  const attributedPath = data.designer.earnCode
    ? "/r/" + encodeURIComponent(data.designer.earnCode) + "?to=" + encodeURIComponent(directPath)
    : directPath;
  const shareUrl = typeof window !== "undefined" ? window.location.origin + attributedPath : SITE_URL + attributedPath;
  const shareText = useMemo(
    () =>
      dreamGoal
        ? `This is ${data.design.title}, designed around the dream to ${dreamGoal}. Would you wear it?`
        : `Would you wear this? ${data.design.title}, designed with DREAMZ.`,
    [data.design.title, dreamGoal],
  );

  const trackShare = () => {
    void recordDesignShare({ data: params.slug }).catch(() => {});
  };

  const like = async () => {
    setNotice(null);
    try {
      const response = await toggleDesignLike({ data: params.slug });
      if (!response.ok) {
        if (response.reason === "signin") setNotice("Sign in to like this design.");
        else if (response.reason === "own_design") setNotice("This is your own design — share it and invite other people to react.");
        else setNotice("This design could not be liked just now.");
        return;
      }
      setLiked(response.liked);
      setLikes(response.likeCount);
    } catch {
      setNotice("This design could not be liked just now.");
    }
  };

  const nativeShare = async (platformLabel?: string) => {
    trackShare();
    if (navigator.share) {
      try {
        if (generatedImageUrl && navigator.canShare) {
          const response = await fetch(generatedImageUrl);
          if (response.ok) {
            const blob = await response.blob();
            const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
            const file = new File([blob], `${params.slug}.${extension}`, { type: blob.type || "image/jpeg" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ title: data.design.title, text: shareText + " " + shareUrl, files: [file] });
              return;
            }
          }
        }
        await navigator.share({ title: data.design.title, text: shareText, url: shareUrl });
        return;
      } catch {
        // Fall back to copying the trackable landing-page link.
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setNotice(platformLabel ? `Link copied. Paste it into ${platformLabel}.` : "Design link copied.");
  };

  const directShare = (platform: "whatsapp" | "telegram" | "facebook") => {
    trackShare();
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);
    const target =
      platform === "whatsapp"
        ? `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        : platform === "telegram"
          ? `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
          : `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const orderThisDesign = async () => {
    let sessionKey = "";
    try {
      sessionKey = sessionStorage.getItem("dfk-design-order-session") || "";
      if (!sessionKey) {
        sessionKey = "doi_" + crypto.randomUUID().replace(/-/g, "");
        sessionStorage.setItem("dfk-design-order-session", sessionKey);
      }
      await recordDesignOrderIntent({ data: { slug: params.slug, sessionKey } });
    } catch {
      // The sales handoff still works if analytics cannot be recorded.
    }
    const message = `Hello DREAMZ, I want to order or get a quote for this community design: ${data.design.title}. Dream code: ${designCode}. Design link: ${shareUrl}${data.designer.earnCode ? ` | Dreamer code: ${data.designer.earnCode}` : ""}`;
    window.location.href =
      "https://wa.me/" +
      CONTACT.whatsappNumber.replace(/\D/g, "") +
      "?text=" +
      encodeURIComponent(message);
  };

  return (
    <div className="pt-28 pb-20">
      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)] lg:items-start">
          <div>
            {generatedImageUrl ? (
              <figure className="overflow-hidden border border-ink/10 bg-white">
                <img
                  src={generatedImageUrl}
                  alt={data.design.title + " — generated Dream product"}
                  className="aspect-square w-full object-cover"
                  fetchPriority="high"
                />
                <figcaption className="border-t border-ink/10 px-4 py-3 text-xs text-stone">
                  AI visual supplied by the Dreamer after using the DREAMZ Studio prompt. Final production is confirmed by the atelier.
                </figcaption>
              </figure>
            ) : (
              <DesignConceptPreview
                preview={{
                  piece: typeof preview.piece === "string" ? preview.piece : data.design.piece,
                  material: typeof preview.material === "string" ? preview.material : null,
                  texture: typeof preview.texture === "string" ? preview.texture : null,
                  primaryColour: typeof preview.primaryColour === "string" ? preview.primaryColour : null,
                  secondaryColour: typeof preview.secondaryColour === "string" ? preview.secondaryColour : null,
                  image: typeof preview.image === "string" ? preview.image : null,
                  construction:
                    preview.construction && typeof preview.construction === "object"
                      ? (preview.construction as Record<string, string>)
                      : null,
                }}
              />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-[0.58rem] uppercase tracking-btn text-stone">
              <span>Community Dream</span>
              <span>·</span>
              <span>Version {data.design.designVersion}</span>
              <span>·</span>
              <span>Dream Code {designCode}</span>
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl mt-3">{landingHeadline}</h1>
            <p className="mt-3 text-xl font-editorial">{data.design.title}</p>
            <p className="mt-4 text-sm text-stone">
              Designed by{" "}
              <Link to="/dreamer/$slug" params={{ slug: data.designer.slug }} className="underline text-ink">
                {data.designer.displayName}
              </Link>
              {data.designer.foundingNumber ? ` · Founding Dreamer #${String(data.designer.foundingNumber).padStart(3, "0")}` : ""}
            </p>

            {dreamGoal && (
              <div className="mt-6 border-l-2 border-gold pl-4">
                <p className="text-[0.58rem] uppercase tracking-btn text-gold">The Dream</p>
                <p className="font-editorial text-2xl mt-1">{dreamGoal}</p>
              </div>
            )}

            {landingStory && <p className="mt-6 text-sm sm:text-base text-stone leading-relaxed">{landingStory}</p>}

            <dl className="mt-6 grid grid-cols-2 gap-px border border-ink/10 bg-ink/10 text-sm">
              <div className="bg-ivory p-4">
                <dt className="text-[0.55rem] uppercase tracking-btn text-stone">Designed for</dt>
                <dd className="mt-1">{designAudience || "Not specified"}</dd>
              </div>
              <div className="bg-ivory p-4">
                <dt className="text-[0.55rem] uppercase tracking-btn text-stone">Painting / artwork</dt>
                <dd className="mt-1">{paintingChoice ? paintingNotes || "Yes" : "No"}</dd>
              </div>
            </dl>

            <div className="mt-6 grid grid-cols-4 gap-2 border-y border-ink/10 py-4 text-center">
              <div><p className="font-editorial text-xl">{likes}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Likes</p></div>
              <div><p className="font-editorial text-xl">{data.design.verifiedOrders}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Orders</p></div>
              <div><p className="font-editorial text-xl">{data.design.shareCount}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Shares</p></div>
              <div><p className="font-editorial text-xl">{data.design.viewCount}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Views</p></div>
            </div>

            {notice && <p className="mt-5 border border-gold/40 bg-gold/5 px-4 py-3 text-xs">{notice}</p>}

            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => void like()} className={liked ? "btn-lux btn-lux-primary" : "btn-lux btn-lux-outline"}>
                {liked ? "Liked ♥" : "Like This Dream"} · {likes}
              </button>
              <button type="button" onClick={() => void nativeShare()} className="btn-lux btn-lux-outline">Share</button>
            </div>

            {!user && (
              <Link to="/account/login" search={{ reset: undefined, returnTo: "/dream/" + params.slug }} className="nav-link inline-block mt-4 text-xs">
                Sign in to like →
              </Link>
            )}

            <div className="mt-8 border-t border-ink/10 pt-6">
              <button type="button" onClick={() => void orderThisDesign()} className="btn-lux btn-lux-primary inline-block mb-5">
                I Want This Design
              </button>
              <p className="text-xs text-stone leading-relaxed">
                This is a design concept, not a ready-made stock promise. DREAMZ confirms leather availability, measurements, construction feasibility and final price before production.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 mt-14">
        <div className="border-y border-ink/10 py-8">
          <p className="overline-label mb-3">Share This Dream</p>
          <h2 className="font-editorial text-3xl">Help this dream travel.</h2>
          <p className="mt-3 text-sm text-stone max-w-2xl">
            Share the image and landing page. Likes, views, shares and verified orders remain attached to Dream Code <strong>{designCode}</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => void nativeShare("Instagram")} className="btn-lux btn-lux-outline !py-2.5">Instagram</button>
            <button type="button" onClick={() => void nativeShare("TikTok")} className="btn-lux btn-lux-outline !py-2.5">TikTok</button>
            <button type="button" onClick={() => void nativeShare("YouTube")} className="btn-lux btn-lux-outline !py-2.5">YouTube</button>
            <button type="button" onClick={() => directShare("facebook")} className="btn-lux btn-lux-outline !py-2.5">Facebook</button>
            <button type="button" onClick={() => directShare("whatsapp")} className="btn-lux btn-lux-outline !py-2.5">WhatsApp</button>
            <button type="button" onClick={() => directShare("telegram")} className="btn-lux btn-lux-outline !py-2.5">Telegram</button>
            <button type="button" onClick={() => void nativeShare("your preferred app")} className="btn-lux btn-lux-primary !py-2.5">More Apps</button>
          </div>
          <p className="mt-3 text-[0.62rem] text-stone">
            Instagram, TikTok and YouTube do not provide a universal browser endpoint for pre-filled posts, so those buttons use the phone's native share sheet when available and fall back to copying the Dream link.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 mt-12 grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <div className="border border-ink/10 p-6">
          <p className="overline-label mb-2">Design Details</p>
          <DesignConceptPreview
            compact
            preview={{
              piece: typeof preview.piece === "string" ? preview.piece : data.design.piece,
              material: typeof preview.material === "string" ? preview.material : null,
              texture: typeof preview.texture === "string" ? preview.texture : null,
              primaryColour: typeof preview.primaryColour === "string" ? preview.primaryColour : null,
              secondaryColour: typeof preview.secondaryColour === "string" ? preview.secondaryColour : null,
              image: typeof preview.image === "string" ? preview.image : null,
              construction:
                preview.construction && typeof preview.construction === "object"
                  ? (preview.construction as Record<string, string>)
                  : null,
            }}
          />
        </div>
        <div className="border border-ink/10 p-6 self-start">
          <p className="overline-label mb-2">Create Yours</p>
          <h2 className="font-editorial text-3xl">Your dream can become a product too.</h2>
          <p className="text-sm text-stone mt-3 leading-relaxed">
            Design visually, copy the AI prompt, generate your image, upload it, name the product and publish your own trackable Dream page.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary">
              Design Your Own Dream
            </Link>
            <Link to="/shop" className="btn-lux btn-lux-outline">Shop DREAMZ Ready-Made</Link>
            <Link to="/earn" className="btn-lux btn-lux-outline">Earn with DREAMZ</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
