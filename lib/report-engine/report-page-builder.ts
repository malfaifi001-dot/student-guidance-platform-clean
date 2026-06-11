import { buildReportBlocks } from "@/lib/report-engine/report-block-builder";
import { paginateReportBlocks } from "@/lib/report-engine/report-block-paginator";
import type { ReportPage } from "@/lib/report-engine/report-block-types";
import type {
  ReportEvidenceConfig,
  SmartReportPayload,
} from "@/lib/report-engine/smart-report-types";

export type { ReportPage };

export function buildReportPages(
  payload: SmartReportPayload,
  evidenceConfig?: ReportEvidenceConfig,
): ReportPage[] {
  const blocks = buildReportBlocks(payload);

  return paginateReportBlocks(payload, blocks, {
    evidenceConfig,
  });
}