const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const MOJIBAKE_MARKER_REGEX = /[\u00D8\u00D9\u00C3\u00C2]/;
const SAFE_OPTION_VALUE_REGEX = /^(?:__OTHER__|other|[a-z0-9_:-]+)$/i;

function countMojibakeMarkers(value: string) {
  return (value.match(MOJIBAKE_MARKER_REGEX) || []).length;
}

function decodeLatin1AsUtf8(value: string) {
  return Buffer.from(value, "latin1").toString("utf8");
}

function shouldUseRepairedValue(original: string, repaired: string) {
  if (!repaired || repaired === original) {
    return false;
  }

  if (!ARABIC_CHAR_REGEX.test(repaired)) {
    return false;
  }

  return countMojibakeMarkers(repaired) < countMojibakeMarkers(original);
}

export function repairPotentialUtf8Mojibake<T>(value: T): T;
export function repairPotentialUtf8Mojibake(
  value: string | null | undefined,
): string | null | undefined;
export function repairPotentialUtf8Mojibake(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  if (!value || !MOJIBAKE_MARKER_REGEX.test(value)) {
    return value;
  }

  try {
    const repaired = decodeLatin1AsUtf8(value);
    return shouldUseRepairedValue(value, repaired) ? repaired : value;
  } catch {
    return value;
  }
}

export function repairPotentialWorkflowOptionValue(
  value: string | null | undefined,
) {
  if (!value || SAFE_OPTION_VALUE_REGEX.test(value)) {
    return value;
  }

  const repaired = repairPotentialUtf8Mojibake(value);
  return typeof repaired === "string" ? repaired : value;
}
