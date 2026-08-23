import type { PortfolioServiceOutputChunk } from "@/lib/portfolio/service-outputs/service-output-types";
import { activityPlanTableRows, activityTeamTableRows, PortfolioStructuredTable } from "@/components/portfolio/print/shared/portfolio-structured-table";

export type ActivityLeaderPortfolioDesign = "ministry-elegant" | "moe-official-2024" | "editorial-atlas" | "geometric-horizon";

export function ActivityLeaderServiceOutputContent({ chunk, design }: { chunk: PortfolioServiceOutputChunk; design: ActivityLeaderPortfolioDesign }) {
  const prefix = `portfolio-${design}`;

  if (chunk.kind === "activity-team") {
    return (
      <div className={`${prefix}-activity-output-body`}>
        <style>{`.portfolio-structured-table-wrap{width:100%;overflow:hidden}.${prefix}-activity-output-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:8px}.${prefix}-activity-output-table th,.${prefix}-activity-output-table td{padding:1.8mm 2mm;overflow-wrap:anywhere;text-align:right;vertical-align:middle}.${prefix}-activity-output-table tbody tr{break-inside:avoid;page-break-inside:avoid}.portfolio-structured-table-signature{display:block;max-width:22mm;max-height:8mm;margin:auto;object-fit:contain}`}</style>
        <PortfolioStructuredTable className={`${prefix}-activity-output-table`} columns={[{ key: "number", label: "م", width: "9%" }, { key: "field", label: "مجال النشاط", width: "43%" }, { key: "supervisor", label: "اسم المشرف", width: "28%" }, { key: "signature", label: "التوقيع", width: "20%" }]} rows={activityTeamTableRows(chunk.rows)} />
      </div>
    );
  }

  if (chunk.kind === "activity-plan") {
    return (
      <div className={`${prefix}-activity-output-body`}>
        <style>{`.portfolio-structured-table-wrap{width:100%;overflow:hidden}.${prefix}-activity-output-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:7.4px}.${prefix}-activity-output-table th,.${prefix}-activity-output-table td{padding:1.3mm 1.2mm;overflow-wrap:anywhere;text-align:right;vertical-align:middle}.${prefix}-activity-output-table tbody tr{break-inside:avoid;page-break-inside:avoid}.${prefix}-activity-plan-meta,.${prefix}-activity-plan-stats{display:flex;flex-wrap:wrap;gap:2mm;margin-bottom:2mm;font-size:8px}.${prefix}-activity-plan-meta span,.${prefix}-activity-plan-stats b{padding:1.5mm 2mm;border:1px solid currentColor;border-radius:1.5mm}.${prefix}-activity-plan-stats strong{margin-inline-start:1mm;font-size:10px}.${prefix}-activity-plan-share{display:flex;align-items:center;justify-content:space-between;gap:5mm;margin-top:3mm;padding:2.5mm 3mm;border:1px solid currentColor;break-inside:avoid}.${prefix}-activity-plan-share img{width:28mm;height:28mm;object-fit:contain}.${prefix}-activity-plan-share strong,.${prefix}-activity-plan-share a,.${prefix}-activity-plan-share small{display:block}.${prefix}-activity-plan-share a{margin-top:1mm;text-decoration:underline;font-weight:900}.${prefix}-activity-plan-share small{margin-top:1mm;direction:ltr;font-size:6px;overflow-wrap:anywhere}`}</style>
        {chunk.summary ? <div className={`${prefix}-activity-plan-summary`}>
          <div className={`${prefix}-activity-plan-meta`}><span>العام الدراسي: {chunk.summary.academicYear || "—"}</span><span>الفصل: {chunk.summary.semester || "—"}</span></div>
          <div className={`${prefix}-activity-plan-stats`}><b>عدد الأسابيع <strong>{chunk.summary.totalWeeks}</strong></b><b>الأسابيع النشطة <strong>{chunk.summary.populatedWeeks}</strong></b><b>عدد الأنشطة <strong>{chunk.summary.totalEntries}</strong></b><b>المجالات <strong>{chunk.summary.activityAreas.length}</strong></b></div>
        </div> : null}
        <PortfolioStructuredTable className={`${prefix}-activity-output-table`} columns={[{ key: "week", label: "الأسبوع", width: "9%" }, { key: "day", label: "اليوم", width: "12%" }, { key: "date", label: "التاريخ", width: "12%" }, { key: "activityArea", label: "المجال", width: "17%" }, { key: "activity", label: "النشاط / البرنامج", width: "22%" }, { key: "period", label: "الحصة", width: "10%" }, { key: "grade", label: "الصف", width: "9%" }, { key: "supervisor", label: "المشرف", width: "9%" }]} rows={activityPlanTableRows(chunk.rows)} />
        {chunk.shareQrDataUrl ? <div className={`${prefix}-activity-plan-share`}>
          <div><strong>عرض الخطة التفصيلية الكاملة</strong><a href={chunk.shareUrl} target="_blank" rel="noreferrer">عرض الخطة الكاملة</a><small>{chunk.shareUrl}</small></div>
          <img src={chunk.shareQrDataUrl} alt="رمز QR لعرض خطة النشاط الكاملة" />
        </div> : null}
      </div>
    );
  }

  return null;
}
