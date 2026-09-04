import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import type { PortfolioPhysicalPage } from "@/lib/portfolio/layout/portfolio-physical-types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object"
    ? value as UnknownRecord
    : undefined;
}

function getEvidenceFromPagePayload(
  payload: unknown,
): PortfolioReportContent["evidenceItems"] {
  const record = asRecord(payload);
  const content = asRecord(record?.content);

  if (Array.isArray(content?.evidenceItems)) {
    return content.evidenceItems as PortfolioReportContent["evidenceItems"];
  }

  const page = asRecord(record?.page);
  const sections = Array.isArray(page?.sections)
    ? page.sections
    : [];

  return sections.flatMap((section) => {
    const sectionRecord = asRecord(section);
    return sectionRecord?.kind === "evidence" &&
      Array.isArray(sectionRecord.items)
      ? sectionRecord.items as PortfolioReportContent["evidenceItems"]
      : [];
  });
}

/**
 * Returns the report's source evidence in source order.
 *
 * The report block payload is authoritative. Physical report pages can carry
 * already-sliced evidence for measurement/continuation rendering, so
 * flattening every page would count those slices more than once.
 */
export function getPortfolioSourceEvidenceItems(
  sourcePages: readonly PortfolioPhysicalPage[],
): PortfolioReportContent["evidenceItems"] {
  const primaryEvidence = sourcePages[0]
    ? getEvidenceFromPagePayload(sourcePages[0].payload)
    : [];

  const primaryPayload = asRecord(sourcePages[0]?.payload);
  if (Array.isArray(asRecord(primaryPayload?.content)?.evidenceItems)) {
    return primaryEvidence;
  }

  return sourcePages.flatMap((sourcePage) =>
    getEvidenceFromPagePayload(sourcePage.payload),
  );
}
