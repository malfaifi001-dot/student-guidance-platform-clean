import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "@/components/curriculum-distribution/curriculum-document-identity";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import type { ActivityPlanTenPercentRow, TenPercentDomainValue, TenPercentProgramValue } from "@/lib/activity-plan/ten-percent-activity-plan-types";
import { formatTenPercentWeeks } from "@/lib/activity-plan/ten-percent-activity-plan-types";
import { ActivityPlanPrintPage, activityPlanPrintShellStyles } from "@/components/activity-plan/activity-plan-print-shell";

type Props = {
  rows: ActivityPlanTenPercentRow[];
  stage: string;
  academicYear?: string | null;
  schoolName: string;
  educationDepartment?: string | null;
  logoUrl?: string | null;
  activityLeaderName?: string | null;
  activityLeaderSignatureUrl?: string | null;
  principalName?: string | null;
  principalSignatureUrl?: string | null;
};

function domainColor(domain: TenPercentDomainValue) {
  const configured = getActivityPlanProgramByKey(domain.slug);
  return configured?.backgroundColor || "#64748b";
}

type LightDomainPalette = { background: string; border: string; color: string };

const LIGHT_DOMAIN_PALETTE: Record<string, LightDomainPalette> = {
  "citizenship-life": { background: "#FFF4CC", border: "#F3C64D", color: "#7A5B00" },
  "science-technology": { background: "#DCEBFF", border: "#6EA8FE", color: "#1D4ED8" },
  "culture-arts": { background: "#DDF7F3", border: "#5BC0BE", color: "#0F766E" },
  "sports-health": { background: "#FFE2E2", border: "#F59E9E", color: "#B42318" },
  scouting: { background: "#FFE8D1", border: "#FB923C", color: "#9A3412" },
  "events-occasions": { background: "#DCFCE7", border: "#86EFAC", color: "#166534" },
  "non-class-periods": { background: "#F1E9FA", border: "#C4A7E7", color: "#6941C6" },
  "school-broadcast": { background: "#E6F4FF", border: "#91C8F6", color: "#175CD3" },
};

function domainPalette(domain: TenPercentDomainValue): LightDomainPalette {
  const configured = LIGHT_DOMAIN_PALETTE[domain.slug];
  if (configured) return configured;
  const source = domainColor(domain);
  return { background: `${source}12`, border: `${source}66`, color: source };
}

function domainNames(domains: TenPercentDomainValue[]) {
  return domains.map((domain) => {
    const palette = domainPalette(domain);
    return <span key={domain.serviceSlug} className="ten-percent-domain-chip" style={{ background: palette.background, borderColor: palette.border, color: palette.color }}>{domain.title}</span>;
  });
}

function programNames(programs: TenPercentProgramValue[]) {
  return programs.map((program) => <div key={`${program.domainServiceSlug}-${program.value}`} className="ten-percent-program-line"><span>{program.name}</span><small>{program.domainTitle}</small></div>);
}

export function ActivityPlanTenPercentPrintDocument({ rows, stage, academicYear, schoolName, educationDepartment, logoUrl, activityLeaderName, activityLeaderSignatureUrl, principalName, principalSignatureUrl }: Props) {
  const printStyles = `
    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    .activity-plan-ten-percent-print-page {
      width: 100%;
      height: auto !important;
      min-height: 194mm !important;
      max-height: none !important;
      margin: 0 auto;
      padding: 0 0 2mm !important;
      overflow: visible !important;
      page-break-after: auto !important;
      break-after: auto !important;
      background: #F8FAFC;
      display: block !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .ten-percent-plan-a4 {
      width: 100%;
      min-height: 194mm;
      display: flex;
      flex-direction: column;
      break-inside: auto;
      page-break-inside: auto;
    }

    .activity-plan-ten-percent-print-page .curriculum-print-footer {
      position: static !important;
      inset: auto !important;
      flex: 0 0 auto;
      margin-top: 5mm !important;
      padding-top: 5mm;
      break-before: avoid-page;
      page-break-before: avoid;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .activity-plan-ten-percent-print-page .curriculum-print-signature-row {
      break-inside: avoid;
      page-break-inside: avoid;
      padding-bottom: 4.5mm;
    }

    .ten-percent-plan-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 5mm;
      margin: 4mm 0 4mm;
      padding: 3mm 2mm 3mm;
      border-bottom: 2px solid #D7E3EA;
      color: #16324F;
      background: #EEF4F7;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .ten-percent-plan-title h1 {
      margin: 0;
      font-size: 15pt;
      font-weight: 900;
      line-height: 1.2;
    }

    .ten-percent-plan-title span {
      padding: 2mm 4mm;
      border: 1px solid #D7E3EA;
      border-radius: 2mm;
      background: #F1F5F9;
      font-size: 9pt;
      font-weight: 900;
      color: #16324F;
    }

    .ten-percent-plan-table-wrap {
      flex: 1 0 auto;
      min-height: 0;
      overflow: visible;
    }

    .ten-percent-plan-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      color: #1F2937;
      background: #F8FAFC;
      font-size: 8.2pt;
    }

    .ten-percent-plan-table th,
    .ten-percent-plan-table td {
      padding: 2.4mm 2mm;
      border: .25mm solid #D7E3EA;
      text-align: center;
      vertical-align: middle;
      overflow-wrap: anywhere;
    }

    .ten-percent-plan-table thead {
      display: table-header-group;
    }

    .ten-percent-plan-table thead th {
      color: #16324F;
      background: #EAF2F8;
      font-size: 8.2pt;
      font-weight: 900;
    }

    .ten-percent-plan-table thead tr:first-child th {
      background: #EEF4F7;
    }

    .ten-percent-plan-table tbody td {
      background: #fff;
      color: #1F2937;
      font-weight: 700;
      line-height: 1.35;
    }

    .ten-percent-plan-table tbody tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .ten-percent-domain-list,
    .ten-percent-program-list {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 1.2mm;
    }

    .ten-percent-domain-chip {
      display: block;
      padding: 1.2mm;
      border: 1px solid;
      border-radius: 1.5mm;
      font-size: 7.5pt;
      font-weight: 900;
    }

    .ten-percent-program-line {
      display: flex;
      flex-direction: column;
      gap: .5mm;
    }

    .ten-percent-program-line small {
      color: #64748B;
      font-size: 6.4pt;
      font-weight: 700;
    }

    .ten-percent-multiline {
      white-space: pre-line;
    }

    .ten-percent-empty {
      padding: 12mm !important;
      color: #64748B !important;
      background: #F1F5F9 !important;
      font-weight: 800 !important;
    }

    @media print {
      html,
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }

      .activity-plan-ten-percent-print-page {
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 194mm !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        page-break-after: auto !important;
        break-after: auto !important;
        box-shadow: none !important;
      }

      .ten-percent-plan-a4 {
        min-height: 194mm !important;
        display: flex !important;
        flex-direction: column !important;
      }

      .ten-percent-plan-table-wrap {
        flex: 1 0 auto !important;
        min-height: 0 !important;
        overflow: visible !important;
      }

      .activity-plan-ten-percent-print-page .curriculum-print-footer {
        position: static !important;
        inset: auto !important;
        flex: 0 0 auto !important;
        margin-top: 5mm !important;
        padding-top: 5mm !important;
        break-before: avoid-page;
        page-break-before: avoid;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .ten-percent-plan-table {
        font-size: 8pt;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `;

  return <>
    <style>{printStyles + activityPlanPrintShellStyles}</style>
    <main className="activity-plan-print-root" dir="rtl">
      <ActivityPlanPrintPage className="activity-plan-ten-percent-print-page activity-plan-print-page--flow" contentClassName="ten-percent-plan-page-content">
        <div className="ten-percent-plan-a4">
          <CurriculumDocumentHeader title="الخطة الفصلية (10%) للنشاط الطلابي" schoolName={schoolName} educationDepartment={educationDepartment} logoUrl={logoUrl} academicYear={academicYear} />
          <div className="ten-percent-plan-title"><h1>الخطة الفصلية (10%) للنشاط الطلابي</h1><span>{stage}</span></div>
          <div className="ten-percent-plan-table-wrap">
            <table className="ten-percent-plan-table">
              <colgroup><col style={{ width: "24%" }} /><col style={{ width: "25%" }} /><col style={{ width: "10%" }} /><col style={{ width: "11%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /></colgroup>
              <thead><tr><th colSpan={3}>مجالات وبرامج النشاط المنفذة</th><th rowSpan={2}>أسبوع التنفيذ</th><th rowSpan={2}>مادة 10%</th><th rowSpan={2}>الصف</th><th rowSpan={2}>المعلم</th></tr><tr><th>المجال</th><th>البرنامج</th><th>عدد الحصص</th></tr></thead>
              <tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td><div className="ten-percent-domain-list">{domainNames(row.domains)}</div></td><td><div className="ten-percent-program-list">{programNames(row.programs)}</div></td><td>{row.periodCount || "—"}</td><td dir="ltr">{formatTenPercentWeeks(row.executionWeeks)}</td><td>{row.subject || "—"}</td><td><div className="ten-percent-multiline">{row.grades.join("\n") || "—"}</div></td><td><div className="ten-percent-multiline">{row.teacherNames.join("\n") || "—"}</div></td></tr>) : <tr><td colSpan={7} className="ten-percent-empty">لا توجد بيانات محفوظة لهذه المرحلة.</td></tr>}</tbody>
            </table>
          </div>
          <CurriculumDocumentFooter primaryRoleLabel="رائد النشاط" primaryName={activityLeaderName} primarySignatureUrl={activityLeaderSignatureUrl} primarySignatureAlt="توقيع رائد النشاط" principalName={principalName} principalSignatureUrl={principalSignatureUrl} />
        </div>
      </ActivityPlanPrintPage>
    </main>
  </>;
}
