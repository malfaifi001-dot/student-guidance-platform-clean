export const EVIDENCE_PRESENTATION_MODES = [
  "IMAGE",
  "QR",
  "CLICKABLE_LINK",
] as const;

export type EvidencePresentationMode =
  (typeof EVIDENCE_PRESENTATION_MODES)[number];

export type EvidenceSourceType = "IMAGE" | "FILE" | "LINK";

const PRESENTATION_NOTE_PREFIX = "__teachix_evidence_presentation__:";

export function isEvidencePresentationMode(
  value: unknown,
): value is EvidencePresentationMode {
  return EVIDENCE_PRESENTATION_MODES.includes(
    String(value || "").trim().toUpperCase() as EvidencePresentationMode,
  );
}

export function isSafeEvidenceUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return false;

  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getEvidenceSourceType(item: {
  type?: unknown;
  sourceType?: unknown;
  mimeType?: unknown;
  fileUrl?: unknown;
  url?: unknown;
}): EvidenceSourceType {
  const type = String(item.sourceType || item.type || "").trim().toUpperCase();
  const mimeType = String(item.mimeType || "").trim().toLowerCase();
  const url = String(item.fileUrl || item.url || "").trim();

  if (type === "IMAGE" || mimeType.startsWith("image/")) return "IMAGE";
  if (type === "LINK" || (!mimeType && /^https?:\/\//i.test(url))) return "LINK";
  return "FILE";
}

export function getEvidencePresentationMode(item: {
  type?: unknown;
  sourceType?: unknown;
  mimeType?: unknown;
  fileUrl?: unknown;
  url?: unknown;
  presentationMode?: unknown;
  note?: unknown;
}): EvidencePresentationMode {
  const explicit = String(item.presentationMode || "").trim().toUpperCase();
  if (isEvidencePresentationMode(explicit)) return explicit;

  const encoded = String(item.note || "")
    .split("\n")
    .find((line) => line.startsWith(PRESENTATION_NOTE_PREFIX))
    ?.slice(PRESENTATION_NOTE_PREFIX.length)
    .trim()
    .toUpperCase();
  if (isEvidencePresentationMode(encoded)) return encoded;

  const sourceType = getEvidenceSourceType(item);
  return sourceType === "IMAGE"
    ? "IMAGE"
    : sourceType === "LINK"
      ? "CLICKABLE_LINK"
      : "QR";
}

export function encodeEvidenceNote(
  note: unknown,
  presentationMode: EvidencePresentationMode,
) {
  const cleanNote = String(note || "")
    .replace(new RegExp(`^${PRESENTATION_NOTE_PREFIX}[^\\n]*\\n?`, "i"), "")
    .trim();
  return `${PRESENTATION_NOTE_PREFIX}${presentationMode}${cleanNote ? `\n${cleanNote}` : ""}`;
}

export function getVisibleEvidenceNote(note: unknown) {
  return String(note || "")
    .replace(new RegExp(`^${PRESENTATION_NOTE_PREFIX}[^\\n]*\\n?`, "i"), "")
    .trim();
}
