import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import { paginateSmartReportTable } from "@/lib/report-engine/report-structured-table-extractor";
import type { PortfolioReportPageModel } from "@/components/portfolio/print/portfolio-print-types";
import type { PortfolioEvidenceLayout, PortfolioSmartLayoutCandidate, PortfolioSmartPageMetadata } from "@/lib/portfolio/layout/portfolio-smart-a4-types";

/**
 * Converts normalized report blocks into the initial physical page plan.
 * Fit is intentionally not estimated here: the browser runtime measures the
 * rendered A4 content region and exposes the result on the physical page.
 * Evidence continuation pages are deterministic and never drop an item.
 */
export function composePortfolioReportPages(report: PortfolioReportContent): PortfolioReportPageModel[] {
  const regular: PortfolioReportPageModel["sections"] = [
    { kind: "details" as const, fields: report.normalizedFields },
    ...(report.narrative?.body?.trim() ? [{ kind: "narrative" as const, body: report.narrative.body.trim() }] : []),
  ];
  const evidence = report.evidenceItems;
  const metadata = (count: 0 | 1 | 2, remaining: number, candidate: PortfolioSmartLayoutCandidate = "comfortable"): PortfolioSmartPageMetadata => ({
    layoutCandidate: candidate,
    evidenceLayout: count === 1 ? "evidence-1-column" : "evidence-2-column" satisfies PortfolioEvidenceLayout,
    primaryEvidenceCount: count,
    overflowEvidenceCount: remaining,
  });

  const pages: PortfolioReportPageModel[] = [];
  if (regular.some((section) => section.kind === "narrative" ? Boolean(section.body.trim()) : section.kind === "details" && section.fields.length > 0) || (!report.tables.length && !evidence.length)) {
    pages.push({
      key: "report-page-1",
      sections: regular,
      ...metadata(0, evidence.length),
    });
  }
  report.tables.forEach((table) => {
    const chunks = paginateSmartReportTable(table, { maxPageUnits: 112 });
    chunks.forEach((chunk, index) => {
      pages.push({
        key: `report-table-${table.id}-${index + 1}`,
        sections: [{ kind: "table", table: chunk }],
        ...metadata(0, evidence.length, "comfortable"),
      });
    });
  });
  for (let index = 0; index < evidence.length; index += 2) {
    const items = evidence.slice(index, index + 2);
    pages.push({
      key: `report-evidence-page-${pages.length + 1}`,
      sections: [{ kind: "evidence", items }],
      ...metadata(0, Math.max(0, evidence.length - index - items.length), "comfortable"),
    });
  }
  return pages;
}
