import { ReportPrepareFlow } from "@/components/report-flow/report-prepare-flow";
import type {
  ReportVariantConfig,
  ReportVariantId,
} from "@/lib/report-engine/report-variant-registry";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

type SmartReportCasePreviewPageProps = {
  payload: SmartReportPayload;
  selectedVariantId: ReportVariantId;
  variants: ReportVariantConfig[];
};

export function SmartReportCasePreviewPage({
  payload,
  selectedVariantId,
  variants,
}: SmartReportCasePreviewPageProps) {
  return (
    <ReportPrepareFlow
      payload={payload}
      selectedVariantId={selectedVariantId}
      variants={variants}
    />
  );
}