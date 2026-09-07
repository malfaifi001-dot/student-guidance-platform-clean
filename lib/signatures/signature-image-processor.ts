import "server-only";

import sharp from "sharp";

const DATA_URL_PATTERN = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const MIN_SIGNATURE_BYTES = 200;
const MAX_SIGNATURE_BYTES = 2_000_000;
const MAX_UPLOADED_SIGNATURE_PIXELS = 16_000_000;
const ALLOWED_UPLOADED_SIGNATURE_FORMATS = new Map([
  ["png", "image/png"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
]);
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

/** Decodes an uploaded raster image, removes near-white pixels, and returns PNG. */
export async function processUploadedSignature(
  buffer: Buffer,
  declaredMimeType?: string,
) {
  if (buffer.length < MIN_SIGNATURE_BYTES || buffer.length > MAX_SIGNATURE_BYTES) {
    return null;
  }

  try {
    const decoded = sharp(buffer, { limitInputPixels: MAX_UPLOADED_SIGNATURE_PIXELS }).ensureAlpha();
    const metadata = await decoded.metadata();
    const outputMimeType = metadata.format ? ALLOWED_UPLOADED_SIGNATURE_FORMATS.get(metadata.format) : undefined;
    if (!metadata.width || !metadata.height || !outputMimeType) return null;
    if (declaredMimeType && declaredMimeType !== outputMimeType) return null;

    const raw = await decoded.raw().toBuffer({ resolveWithObject: true });
    for (let index = 0; index < raw.data.length; index += 4) {
      const whiteness = Math.min(raw.data[index], raw.data[index + 1], raw.data[index + 2]);
      if (whiteness >= 245) {
        raw.data[index + 3] = 0;
      } else if (whiteness > 225) {
        raw.data[index + 3] = Math.round(raw.data[index + 3] * (245 - whiteness) / 20);
      }
    }

    const padding = Math.max(4, Math.round(Math.min(raw.info.width, raw.info.height) * 0.025));
    const output = await sharp(raw.data, {
      raw: { width: raw.info.width, height: raw.info.height, channels: 4 },
    })
      .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 10 })
      .extend({ top: padding, bottom: padding, left: padding, right: padding, background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    return output.length >= MIN_SIGNATURE_BYTES && output.length <= MAX_SIGNATURE_BYTES ? output : null;
  } catch {
    return null;
  }
}
