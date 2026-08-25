import { isSchoolBroadcastServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

export function shouldIncludeReportNarrative(serviceSlug?: string | null) {
  return !isSchoolBroadcastServiceSlug(serviceSlug);
}

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function isReportNarrativeBlock(block: unknown) {
  if (!block || typeof block !== "object") return false;

  const record = block as Record<string, unknown>;
  const id = normalize(record.id);
  const kind = normalize(record.kind || record.type || record.settings && (record.settings as Record<string, unknown>).smartBlockKind);
  const title = String(record.title || record.customTitle || "").trim();
  const source = record.source && typeof record.source === "object"
    ? record.source as Record<string, unknown>
    : {};
  const fieldKey = normalize(
    record.boundFieldKey ||
      record.sourceFieldKey ||
      source.fieldKey,
  );

  return (
    id === "narrative" ||
    id === "system_narrative" ||
    id === "execution_description" ||
    kind === "narrative" ||
    kind === "execution_description" ||
    fieldKey === "narrative" ||
    fieldKey === "execution_description" ||
    title === "وصف التنفيذ" ||
    title === "الوصف التنفيذي"
  );
}

export function filterReportNarrativeBlocks<T>(
  pages: T[],
  serviceSlug: string | null | undefined,
) {
  if (shouldIncludeReportNarrative(serviceSlug)) return pages;

  return pages.map((page) => {
    if (!page || typeof page !== "object") return page;

    const record = page as T & { blocks?: unknown };
    if (!Array.isArray(record.blocks)) return page;

    return {
      ...record,
      blocks: record.blocks.filter((block) => !isReportNarrativeBlock(block)),
    } as T;
  });
}

