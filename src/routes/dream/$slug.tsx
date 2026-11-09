import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPublicDesign, recordDesignOrderIntent, recordDesignShare, recordDesignView, toggleDesignLike } from "@/server/designer.functions";
import { DesignConceptPreview } from "@/components/DesignConceptPreview";
import { useAuth } from "@/lib/auth-client";
import { BRAND } from "@/lib/config";
import { CONTACT } from "@/lib/contact";

export const Route = createFileRoute("/dream/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicDesign({ data: params.slug });
    if (!result) throw new Error("Dream design not found");
    return result;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.design.title || "Dream Design"} — DREAMZ` },
      {
        name: "description",
        content: `A community-created leather concept by ${loaderData?.designer.displayName || "a DREAMZ Dreamer"}.`,
      },
    ],
  }),
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
  const preview = payload.visualPreview && typeof payload.visualPreview === "object"
    ? (payload.visualPreview as Record<string, unknown>)
    : {};
  const summary = typeof payload.designSummary === "string" ? payload.designSummary : "";

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

  const share = async () => {
    void recordDesignShare({ data: params.slug }).catch(() => {});
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
      // WhatsApp ordering must still work even if analytics cannot be recorded.
    }
    const directPath = "/dream/" + params.slug;
    const attributedPath = data.designer.earnCode
      ? "/r/" + encodeURIComponent(data.designer.earnCode) + "?to=" + encodeURIComponent(directPath)
      : directPath;
    const designUrl = window.location.origin + attributedPath;
    const message = `Hello DREAMZ, I want to order or get a quote for this community design: ${data.design.title}. Design link: ${designUrl}${data.designer.earnCode ? ` | Dreamer code: ${data.designer.earnCode}` : ""}`;
    window.location.href =
      "https://wa.me/" +
      CONTACT.whatsappNumber.replace(/\D/g, "") +
      "?text=" +
      encodeURIComponent(message);
  };

  const directPath = "/dream/" + params.slug;
    const sharePath = data.designer.earnCode
      ? "/r/" + encodeURIComponent(data.designer.earnCode) + "?to=" + encodeURIComponent(directPath)
      : directPath;
    const url = window.location.origin + sharePath;
    const text = `Would you wear this? ${data.design.title}, designed with DREAMZ.`;
    if (navigator.share) {
      await navigator.share({ title: data.design.title, text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setNotice("Design link copied.");
  };

  const directPath = "/dream/" + params.slug;
  const attributedPath = data.designer.earnCode
    ? "/r/" + encodeURIComponent(data.designer.earnCode) + "?to=" + encodeURIComponent(directPath)
    : directPath;
  const attributedUrl = typeof window !== "undefined" ? window.location.origin + attributedPath : directPath;
  const whatsapp = typeof window !== "undefined"
    ? "https://wa.me/?text=" + encodeURIComponent(`Would you wear this? ${data.design.title}, designed with DREAMZ. ${attributedUrl}`)
    : "#";

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-28 pb-20">
      <div className="grid gap-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
        <DesignConceptPreview
          preview={{
            piece: typeof preview.piece === "string" ? preview.piece : data.design.piece,
            material: typeof preview.material === "string" ? preview.material : null,
            primaryColour: typeof preview.primaryColour === "string" ? preview.primaryColour : null,
            secondaryColour: typeof preview.secondaryColour === "string" ? preview.secondaryColour : null,
            image: typeof preview.image === "string" ? preview.image : null,
            construction:
              preview.construction && typeof preview.construction === "object"
                ? (preview.construction as Record<string, string>)
                : null,
          }}
        />
        <div className="self-center">
          <p className="overline-label">Community Dream · Version {data.design.designVersion}</p>
          <h1 className="font-editorial text-4xl sm:text-5xl mt-3">{data.design.title}</h1>
          <p className="mt-4 text-sm text-stone">
            Designed by{" "}
            <Link to="/dreamer/$slug" params={{ slug: data.designer.slug }} className="underline text-ink">
              {data.designer.displayName}
            </Link>
            {data.designer.foundingNumber ? ` · Founding Dreamer #${String(data.designer.foundingNumber).padStart(3, "0")}` : ""}
          </p>
          {data.designer.dreamStatement && <p className="mt-3 font-editorial text-xl">{data.designer.dreamStatement}</p>}

          <div className="mt-5 grid grid-cols-4 gap-2 border-y border-ink/10 py-4 text-center">
            <div><p className="font-editorial text-xl">{likes}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Likes</p></div>
            <div><p className="font-editorial text-xl">{data.design.verifiedOrders}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Orders</p></div>
            <div><p className="font-editorial text-xl">{data.design.shareCount}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Shares</p></div>
            <div><p className="font-editorial text-xl">{data.design.viewCount}</p><p className="text-[0.55rem] uppercase tracking-btn text-stone">Views</p></div>
          </div>

          {summary && <pre className="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-stone">{summary}</pre>}

          {notice && <p className="mt-5 border border-gold/40 bg-gold/5 px-4 py-3 text-xs">{notice}</p>}

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => void like()} className={liked ? "btn-lux btn-lux-primary" : "btn-lux btn-lux-outline"}>
              {liked ? "Liked ♥" : "Like This Dream"} · {likes}
            </button>
            <button type="button" onClick={() => void share()} className="btn-lux btn-lux-outline">Share</button>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-lux btn-lux-outline">WhatsApp</a>
          </div>

          {!user && (
            <Link to="/account/login" search={{ reset: undefined, returnTo: "/dream/" + params.slug }} className="nav-link inline-block mt-4 text-xs">
              Sign in to like →
            </Link>
          )}

          <div className="mt-8 border-t border-ink/10 pt-6">
            <button
              type="button"
              onClick={() => void orderThisDesign()}
              className="btn-lux btn-lux-primary inline-block mb-5"
            >
              I Want This Design
            </button>
            <p className="text-xs text-stone leading-relaxed">
              This is a design concept, not a ready-made stock promise. DREAMZ confirms leather availability, measurements, construction feasibility and final price before production.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link to="/custom" search={{ design: undefined, t: undefined, start: "1", brief: undefined }} className="btn-lux btn-lux-primary">
                Design Your Own Dream
              </Link>
              <Link to="/shop" className="btn-lux btn-lux-outline">
                Shop DREAMZ Ready-Made
              </Link>
              <Link to="/earn" className="btn-lux btn-lux-outline">
                Earn with DREAMZ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-16 border-t border-ink/10 pt-10 text-center">
        <p className="overline-label mb-2">Designed by people. Crafted by DREAMZ.</p>
        <h2 className="font-editorial text-3xl">Your idea can be next.</h2>
        <p className="text-sm text-stone mt-3 max-w-xl mx-auto">
          Create visually, save privately, publish only when you are ready, and share a safe public design page without exposing your private reference images.
        </p>
      </section>
    </div>
  );
}
