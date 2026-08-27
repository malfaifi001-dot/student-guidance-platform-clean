function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Updates the renderer-owned principal slot in persisted legacy markup.
 * This is deliberately non-append-only: a missing slot is left untouched so
 * the stored document cannot grow an out-of-band signature block.
 */
export function applyPrincipalSignatureToHtml(html: string | null | undefined, signatureUrl: string) {
  const source = String(html || "");
  const url = escapeHtmlAttribute(signatureUrl);
  const placeholderPattern = /\{\{(?:identity\.)?principalSignatureUrl\}\}/g;
  let result = source.replace(placeholderPattern, url);
  let replaced = false;

  // Current Report2 output marks the renderer-owned card explicitly. Update
  // only its existing image; never create an out-of-band signature block.
  result = result.replace(
    /(<[^>]*data-report-signature-role=["']principal["'][^>]*>[\s\S]*?<img\b[^>]*?)(\bsrc=["'])[^"']*(["'])/i,
    (_match, prefix: string, quote: string, closingQuote: string) => {
      replaced = true;
      return `${prefix}${quote}${url}${closingQuote}`;
    },
  );
  if (replaced || result !== source) return result;

  result = result.replace(/<img\b[^>]*(?:data-signature-key=["']principal["']|alt=["'][^"']*(?:مدير المدرسة|principal)[^"']*["'])[^>]*>/gi, (tag) => {
    replaced = true;
    return /\bsrc=["'][^"']*["']/i.test(tag)
      ? tag.replace(/\bsrc=["'][^"']*["']/i, `src="${url}"`)
      : tag.replace(/>$/, ` src="${url}">`);
  });
  if (replaced || result !== source) return result;

  // Older renderer output has the principal card but no semantic marker.
  // Put the image inside its existing frame, never at the document bottom.
  const cardPattern = /(<[^>]+>[\s\S]{0,2400}?(?:مدير المدرسة|school.?leader|principal)[\s\S]{0,1600}?)(<div[^>]*class=["'][^"']*report-design-signature-image-frame[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i;
  const match = result.match(cardPattern);
  if (!match) return result;

  const frame = `${match[2]}<img src="${url}" alt="توقيع مدير المدرسة" style="display:block;max-width:42mm;max-height:10mm;object-fit:contain;object-position:center;margin:0 auto" />${match[4]}`;
  return result.replace(cardPattern, `${match[1]}${frame}`);
}

/** Clears only the renderer-owned principal image in persisted markup. */
export function clearPrincipalSignatureFromHtml(html: string | null | undefined) {
  const source = String(html || "");
  return source.replace(
    /(<[^>]*data-report-signature-role=["']principal["'][^>]*>[\s\S]*?<img\b[^>]*?)\s+src=["'][^"']*["']/i,
    "$1",
  );
}
