import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/config";

// Public Cloudinary account name; API credentials exist server-side only.
const CLOUDINARY_PUBLIC_CLOUD = "ngcdoefz";
const SLUG_PATTERN = /^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})_v([1-9][0-9]{0,15})$/i;

function imageForId(id: string) {
  const parts = SLUG_PATTERN.exec(id);
  if (!parts) return null;
  return "https://res.cloudinary.com/" + CLOUDINARY_PUBLIC_CLOUD + "/image/upload/v" + parts[2] + "/dreamz/dp/" + parts[1].toLowerCase() + ".png";
}

export const Route = createFileRoute("/dp/$id")({
  head: ({ params }) => {
    const image = imageForId(params.id);
    const url = SITE_URL + "/dp/" + encodeURIComponent(params.id);
    return {
      meta: [
        { title: "I Designed My Dream — DREAMZ Fashion" },
        { name: "description", content: "See my dream and the leather design I created with DREAMZ Fashion." },
        { property: "og:type", content: "website" },
        { property: "og:title", content: "I Designed My Dream — DREAMZ Fashion" },
        { property: "og:description", content: "Designed by me. Crafted by DREAMZ. Create your own dream design." },
        { property: "og:url", content: url },
        ...(image ? [
          { property: "og:image", content: image },
          { property: "og:image:secure_url", content: image },
          { property: "og:image:type", content: "image/png" },
          { name: "twitter:image", content: image },
        ] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: DreamDPPage,
});

function DreamDPPage() {
  const { id } = Route.useParams();
  const image = imageForId(id);
  return (
    <main className="mx-auto max-w-3xl px-5 pt-32 pb-20 text-center">
      <p className="overline-label !text-gold">DREAMZ Fashion — Dream DP</p>
      <h1 className="font-editorial text-4xl sm:text-5xl mt-4">I Designed My Dream</h1>
      {image ? (
        <>
          <div className="mt-8 border border-ink/15 bg-white p-2">
            <img
              src={image}
              alt="Customer's public Dream DP showing their photograph beside their leather product design"
              className="mx-auto h-auto w-full max-w-xl"
            />
          </div>
          <p className="mt-5 text-sm text-stone">
            Designed by me. Crafted by DREAMZ.
          </p>
          <p className="mt-2 text-xs text-stone">
            This image was published publicly by a DREAMZ member who chose to share it.
          </p>
        </>
      ) : (
        <p className="mt-8 text-sm text-stone">This Dream DP link is not valid.</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="/custom?start=1" className="btn-lux btn-lux-primary">
          Design Your Own Dream
        </a>
        <a href="/shop" className="btn-lux btn-lux-outline">
          Shop DREAMZ
        </a>
      </div>
    </main>
  );
}
