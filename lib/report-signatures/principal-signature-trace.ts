import type { SmartReportPayload, SmartReportSignature } from "@/lib/report-engine/smart-report-types";

/** Temporary development diagnostics. Keep disabled in production builds. */
export const ENABLE_PRINCIPAL_SIGNATURE_TRACE = process.env.NODE_ENV !== "production";

function fingerprint(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;

  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function describePrincipalSignature(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  const kind = text.startsWith("data:")
    ? "data"
    : text.startsWith("blob:")
      ? "blob"
      : /^https?:\/\//i.test(text)
        ? "url"
        : text.startsWith("/")
          ? "path"
          : text
            ? "unknown"
            : null;

  return {
    present: Boolean(text),
    kind,
    length: text.length,
    fingerprint: fingerprint(text),
  };
}

export function principalSignatureFromPayload(payload: SmartReportPayload | null | undefined) {
  const identity = payload?.identity;
  const principalCards = (payload?.signatures || []).filter((card) => card.key === "principal");
  const card = principalCards[0] || null;
  return {
    identitySignature: describePrincipalSignature(identity?.principalSignatureUrl),
    schoolLeaderSignature: describePrincipalSignature(identity?.schoolLeaderSignatureUrl),
    principalCardFound: Boolean(card),
    principalCardsCount: principalCards.length,
    principalCardSignature: describePrincipalSignature(card?.imageUrl),
    principalCard: card
      ? { signerName: card.signerName || null, signerTitle: card.signerTitle || null }
      : null,
  };
}

export function tracePrincipalSignature(input: {
  stage: string;
  location: string;
  details?: Record<string, unknown>;
  payload?: SmartReportPayload | null;
  signature?: unknown;
}) {
  if (!ENABLE_PRINCIPAL_SIGNATURE_TRACE || typeof console === "undefined") return;

  const payloadState = input.payload ? principalSignatureFromPayload(input.payload) : null;
  console.log(`[Teachix:PrincipalSignatureTrace] ${input.stage}`, {
    location: input.location,
    ...(input.details || {}),
    ...(input.signature === undefined ? {} : { signature: describePrincipalSignature(input.signature) }),
    ...(payloadState || {}),
  });
}

export function tracePrincipalCards(
  stage: string,
  location: string,
  cards: SmartReportSignature[],
  details?: Record<string, unknown>,
) {
  if (!ENABLE_PRINCIPAL_SIGNATURE_TRACE || typeof console === "undefined") return;
  const principalCards = cards.filter((card) => card.key === "principal");
  console.log(`[Teachix:PrincipalSignatureTrace] ${stage}`, {
    location,
    ...(details || {}),
    cards: cards.map((card) => ({
      key: card.key,
      label: card.label,
      signerName: card.signerName,
      signerTitle: card.signerTitle,
      required: card.required,
      image: describePrincipalSignature(card.imageUrl),
    })),
    principalCardFound: principalCards.length > 0,
    principalCardsCount: principalCards.length,
    principalImage: describePrincipalSignature(principalCards[0]?.imageUrl),
  });
}
