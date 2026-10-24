/**
 * Inspiration-image upload rules, shared by the browser (early feedback) and
 * the server (the actual gate). Netlify Functions accept request bodies up to
 * 6 MB, so each file is capped at 5 MB.
 */
export const REFERENCE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  maxLabel: "5 MB",
  maxFiles: 4,
  accept: "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif",
  formatsLabel: "JPG, PNG, WebP or HEIC (iPhone)",
} as const;

/** Identify the image type from its first bytes. Null = not accepted. */
export function detectImageType(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  // ISO-BMFF "ftyp" box with a HEIF/HEIC brand (iPhone photos).
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "image/heic";
  }
  return null;
}

/** Browser-side pre-check; the server re-validates the bytes. */
export function precheckFile(file: { size: number; type: string; name: string }): string | null {
  if (file.size === 0) return "This file is empty.";
  if (file.size > REFERENCE_LIMITS.maxBytes) {
    return `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB — please choose an image of ${REFERENCE_LIMITS.maxLabel} or less.`;
  }
  const okType = /^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!okType) return `${file.name} isn't a supported image. Use ${REFERENCE_LIMITS.formatsLabel}.`;
  return null;
}
