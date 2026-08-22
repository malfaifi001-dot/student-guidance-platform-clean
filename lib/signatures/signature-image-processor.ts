import "server-only";

import sharp from "sharp";

const DATA_URL_PATTERN = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const MIN_SIGNATURE_BYTES = 200;
const MAX_SIGNATURE_BYTES = 2_000_000;
export const DEFAULT_SIGNATURE_STROKE_BOOST = 2;

export type SignatureProcessingOptions = {
  strokeBoost?: number;
};

export function normalizeSignatureStrokeBoost(
  value: number | undefined,
  fallback = DEFAULT_SIGNATURE_STROKE_BOOST,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(3, Math.max(1, Number(value)));
}

export function parsePngSignatureDataUrl(dataUrl: string) {
  const match = DATA_URL_PATTERN.exec(String(dataUrl || "").trim());
  if (!match) return null;

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length < MIN_SIGNATURE_BYTES || buffer.length > MAX_SIGNATURE_BYTES) {
    return null;
  }

  return buffer;
}

/**
 * Non-destructively normalizes a newly submitted signature.
 *
 * The trim operation only removes empty transparent/white margins. It does
 * not threshold, sharpen, recolor, or enlarge the handwriting. A small
 * transparent border is restored so the renderer never touches the strokes.
 */
export async function processSignaturePng(
  buffer: Buffer,
  options: SignatureProcessingOptions = {},
) {
  if (buffer.length < MIN_SIGNATURE_BYTES || buffer.length > MAX_SIGNATURE_BYTES) {
    return null;
  }

  try {
    const image = sharp(buffer, { limitInputPixels: 16_000_000 }).ensureAlpha();
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) return null;

    const strokeBoost = normalizeSignatureStrokeBoost(options.strokeBoost);
    const padding = Math.max(
      4,
      Math.round(Math.min(metadata.width, metadata.height) * 0.025 * strokeBoost),
    );
    const output = await image
      .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 10 })
      .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    return output.length >= MIN_SIGNATURE_BYTES && output.length <= MAX_SIGNATURE_BYTES
      ? output
      : buffer;
  } catch {
    // Keep the original valid PNG usable if an unusual legacy/browser PNG
    // cannot be normalized by the optional image processor.
    return buffer;
  }
}

export async function processSignatureDataUrl(dataUrl: string) {
  const input = parsePngSignatureDataUrl(dataUrl);
  if (!input) return null;

  return processSignaturePng(input);
}
