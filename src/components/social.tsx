/**
 * Social profile links. The URLs below are the brand-supplied official
 * profiles — the same values live in the admin `site` settings, which take
 * precedence at render time. Icons are official-platform glyphs (inline SVG,
 * currentColor) so no icon package is needed.
 */

export type SocialLinks = {
  instagram?: string | null;
  tiktok?: string | null;
  facebook?: string | null;
};

export const OFFICIAL_SOCIAL: Required<Pick<SocialLinks, "instagram" | "tiktok" | "facebook">> = {
  instagram: "https://www.instagram.com/dreamzfashion_ng/",
  tiktok: "https://www.tiktok.com/@official_dreamzfashion",
  facebook: "https://www.facebook.com/share/19TGM3Vkue/",
};

function IconA({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={() => {
        try {
          void fetch("/api/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "social_click", data: { network: label } }),
            keepalive: true,
          });
        } catch {
          /* analytics must never break the CTA */
        }
      }}
      className="inline-flex h-10 w-10 items-center justify-center border border-current/30 transition-colors hover:border-current"
    >
      {children}
    </a>
  );
}

export function SocialIcons({ links, className = "" }: { links: SocialLinks; className?: string }) {
  const instagram = links.instagram || OFFICIAL_SOCIAL.instagram;
  const tiktok = links.tiktok || OFFICIAL_SOCIAL.tiktok;
  const facebook = links.facebook || OFFICIAL_SOCIAL.facebook;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IconA href={instagram ?? ""} label="Instagram">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.73.07-1.08.05-1.67.23-2.06.38-.52.2-.89.44-1.28.83-.39.39-.63.76-.83 1.28-.15.39-.33.98-.38 2.06-.06 1.23-.07 1.58-.07 4.73s.01 3.5.07 4.73c.05 1.08.23 1.67.38 2.06.2.52.44.89.83 1.28.39.39.76.63 1.28.83.39.15.98.33 2.06.38 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c1.08-.05 1.67-.23 2.06-.38.52-.2.89-.44 1.28-.83.39-.39.63-.76.83-1.28.15-.39.33-.98.38-2.06.06-1.23.07-1.58.07-4.73s-.01-3.5-.07-4.73c-.05-1.08-.23-1.67-.38-2.06-.2-.52-.44-.89-.83-1.28a3.44 3.44 0 0 0-1.28-.83c-.39-.15-.98-.33-2.06-.38-1.23-.06-1.58-.07-4.73-.07zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88zm0 8.14a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm6.3-8.35a1.15 1.15 0 1 1-2.3 0 1.15 1.15 0 0 1 2.3 0z" />
        </svg>
      </IconA>
      <IconA href={tiktok ?? ""} label="TikTok">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.84 6.84 0 0 0-1.05-.08A6.34 6.34 0 0 0 5 20.57a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.57z" />
        </svg>
  </IconA>
      <IconA href={facebook ?? ""} label="Facebook">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.5-3.9 3.77-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z" />
        </svg>
      </IconA>
    </div>
  );
}
