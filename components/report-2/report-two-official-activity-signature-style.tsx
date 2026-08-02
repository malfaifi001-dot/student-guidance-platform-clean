export const OFFICIAL_ACTIVITY_CARD_VARIANT_ID = "official-activity-card";

export function ReportTwoOfficialActivitySignatureStyle({
  enabled,
}: {
  enabled: boolean;
}) {
  if (!enabled) return null;

  return (
    <style>{`
      .report-two-official-activity-card .pdf-report-page main:has([data-report-design-signature-block]) {
        min-height: 212mm !important;
      }
    `}</style>
  );
}
