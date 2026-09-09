import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "@/components/curriculum-distribution/curriculum-document-identity";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import type { ActivityPlanTenPercentRow } from "@/lib/activity-plan/ten-percent-activity-plan-types";
import { formatTenPercentWeeks } from "@/lib/activity-plan/ten-percent-activity-plan-types";
import { ActivityPlanPrintPage, ACTIVITY_PLAN_PRINT_SUBTITLE, activityPlanPrintShellStyles } from "@/components/activity-plan/activity-plan-print-shell";

type Props = { rows: ActivityPlanTenPercentRow[]; gradeSections?: string[]; stage: string; academicYear?: string | null; schoolName: string; educationDepartment?: string | null; logoUrl?: string | null; activityLeaderName?: string | null; activityLeaderSignatureUrl?: string | null; principalName?: string | null; principalSignatureUrl?: string | null };

function displayGrade(value: string) {
  const [grade, section] = String(value || "").split("::");
  return `${grade || "بيانات سابقة غير مصنفة"}${section ? ` ${section}` : ""}`.trim();
}

function materialTypeLabel(value: ActivityPlanTenPercentRow["materialType"]) {
  return value === "10%" ? "10%" : "أساسية";
}

const SEMESTER_PRINTABLE_TABLE_HEIGHT_MM = 136;
const SEMESTER_TABLE_HEADER_HEIGHT_MM = 10;

function lineCount(value: string, charactersPerLine: number) {
  return String(value || "—")
    .split(/\r?\n/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.trim().length / charactersPerLine)), 0);
}

function estimateRowHeightMm(row: ActivityPlanTenPercentRow) {
  const domainLines = row.domains.reduce((total, domain) => total + lineCount(domain.title, 14), 0);
  const programLines = lineCount(row.programs.map((program) => program.name).join("، "), 20);
  const subjectLines = lineCount(`${row.subject || "—"} (${materialTypeLabel(row.materialType)})`, 20);
  const gradeLines = lineCount(row.grades.map(displayGrade).join("\n"), 16);
  const teacherLines = row.teacherNames.length
    ? row.teacherNames.reduce((total, teacher) => total + lineCount(teacher, 16), 0)
    : 1;
  const lines = Math.max(1, domainLines, programLines, subjectLines, gradeLines, teacherLines);

  // The base covers the compact cell padding and borders; extra lines use the
  // actual readable line-height used by the semester table.
  return Math.max(9.2, 4.8 + lines * 4);
}

function groupRows(rows: ActivityPlanTenPercentRow[], fallbackStage: string) {
  const grouped = new Map<string, { stage: string; destination: string; rows: ActivityPlanTenPercentRow[] }>();
  for (const row of rows) {
    const combinations = row.grades.length ? row.grades : [""];
    for (const combination of combinations) {
      const destination = String(combination || "").trim();
      const [grade = "", section = ""] = destination.split("::");
      const rowStage = String(row.stage || fallbackStage).trim() || fallbackStage;
      const key = JSON.stringify([rowStage, grade.trim(), section.trim()]);
      const group = grouped.get(key) || { stage: rowStage, destination, rows: [] };
      group.rows.push({ ...row, stage: rowStage, grades: destination ? [destination] : [] });
      grouped.set(key, group);
    }
  }

  return Array.from(grouped.entries()).flatMap(([groupKey, group]) => {
    const pages: Array<[string, ActivityPlanTenPercentRow[]]> = [];
    let pageRows: ActivityPlanTenPercentRow[] = [];
    let usedHeight = SEMESTER_TABLE_HEADER_HEIGHT_MM;

    for (const row of group.rows) {
      const rowHeight = estimateRowHeightMm(row);
      if (pageRows.length && usedHeight + rowHeight > SEMESTER_PRINTABLE_TABLE_HEIGHT_MM) {
        pages.push([`${groupKey}:${pages.length}`, pageRows]);
        pageRows = [];
        usedHeight = SEMESTER_TABLE_HEADER_HEIGHT_MM;
      }
      pageRows.push(row);
      usedHeight += rowHeight;
    }

    if (pageRows.length) pages.push([`${groupKey}:${pages.length}`, pageRows]);
    return pages;
  });
}

export function ActivityPlanSemesterPrintDocument({ rows, gradeSections = [], stage, academicYear, schoolName, educationDepartment, logoUrl, activityLeaderName, activityLeaderSignatureUrl, principalName, principalSignatureUrl }: Props) {
  const scopedRows = gradeSections.length
    ? rows.flatMap((row) => {
        const selectedDestinations = row.grades.filter((value) => gradeSections.includes(value));
        return selectedDestinations.length ? [{ ...row, grades: selectedDestinations }] : [];
      })
    : rows;
  const pages = groupRows(scopedRows, stage);
  if (!pages.length) pages.push(["empty", []]);

  return <><style>{activityPlanPrintShellStyles}</style><style>{`@page{size:A4 landscape;margin:0}.activity-plan-semester-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.6pt}.activity-plan-semester-table th,.activity-plan-semester-table td{border:.25mm solid #CBD5E1;padding:2.1mm;text-align:center;vertical-align:middle;overflow-wrap:anywhere}.activity-plan-semester-table th{background:#0F5F7A;color:#fff;font-weight:900;line-height:1.3}.activity-plan-semester-table td{background:#fff;color:#172B3A;font-weight:700;line-height:1.4}.activity-plan-semester-title{display:flex;align-items:center;justify-content:space-between;gap:5mm;margin:3.5mm 0;padding:2.5mm 3mm;border-right:2mm solid #0F7FA8;border-bottom:1px solid #B9D8E8;background:#F1F7FA;color:#123B4A}.activity-plan-semester-title h1{margin:0;font-size:15pt;font-weight:900;line-height:1.35}.activity-plan-semester-title span{font-size:10pt;font-weight:900;color:#0F5F7A}.activity-plan-semester-domain-list{display:flex;flex-wrap:wrap;justify-content:center;gap:1.2mm}.activity-plan-semester-domain{display:inline-flex;align-items:center;gap:1.2mm;border:1px solid #94A3B8;border-radius:1.5mm;padding:1mm 1.5mm;background:#F8FAFC;color:#203746;font-size:7.5pt;font-weight:900}.activity-plan-semester-domain i{display:inline-block;width:2.2mm;height:2.2mm;border-radius:50%}.activity-plan-semester-material-type{font-size:7.5pt;font-weight:900}.activity-plan-semester-material-type--core{color:#0F766E}.activity-plan-semester-material-type--ten{color:#B45309}.activity-plan-semester-empty{padding:10mm!important;color:#64748B!important}.activity-plan-semester-multiline{white-space:pre-line}@media print{.activity-plan-semester-table th{-webkit-print-color-adjust:exact;print-color-adjust:exact}.activity-plan-semester-domain i{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`}</style><main className="activity-plan-print-root" dir="rtl">{pages.map(([key, pageRows]) => { const combination = pageRows[0]?.grades[0] || ""; const context = combination ? `${stage} — ${displayGrade(combination)}` : `${stage} — بيانات سابقة غير مصنفة`; return <ActivityPlanPrintPage key={key} className="activity-plan-ten-percent-print-page activity-plan-print-page--physical" contentClassName="ten-percent-plan-page-content" footer={<CurriculumDocumentFooter primaryRoleLabel="رائد النشاط" primaryName={activityLeaderName} primarySignatureUrl={activityLeaderSignatureUrl} primarySignatureAlt="توقيع رائد النشاط" principalName={principalName} principalSignatureUrl={principalSignatureUrl} />}><CurriculumDocumentHeader title="الخطة الفصلية للنشاط الطلابي" subtitle={ACTIVITY_PLAN_PRINT_SUBTITLE} schoolName={schoolName} educationDepartment={educationDepartment} logoUrl={logoUrl} academicYear={academicYear} /><div className="activity-plan-semester-title"><h1>الخطة الفصلية للنشاط الطلابي</h1><span>{context}</span></div><table className="activity-plan-semester-table"><thead><tr><th>المجال</th><th>البرنامج / النشاط</th><th>أسابيع التنفيذ</th><th>المادة والنوع</th><th>الصف</th><th>المعلم / المعلمون</th></tr></thead><tbody>{pageRows.length ? pageRows.map((row) => <tr key={row.id}><td><div className="activity-plan-semester-domain-list">{row.domains.map((domain) => { const color = getActivityPlanProgramByKey(domain.slug)?.backgroundColor || "#64748B"; return <span key={domain.serviceSlug} className="activity-plan-semester-domain" style={{ borderColor: color }}><i style={{ backgroundColor: color }} />{domain.title}</span>; })}</div></td><td>{row.programs.map((program) => program.name).join("، ") || "—"}</td><td dir="ltr">{formatTenPercentWeeks(row.executionWeeks)}</td><td>{row.subject || "—"} <span className={`activity-plan-semester-material-type ${row.materialType === "10%" ? "activity-plan-semester-material-type--ten" : "activity-plan-semester-material-type--core"}`}>({materialTypeLabel(row.materialType)})</span></td><td>{row.grades.map(displayGrade).join("\n") || "—"}</td><td><div className="activity-plan-semester-multiline">{row.teacherNames.join("\n") || "—"}</div></td></tr>) : <tr><td colSpan={6} className="activity-plan-semester-empty">لا توجد بيانات محفوظة لهذه المرحلة.</td></tr>}</tbody></table></ActivityPlanPrintPage>; })}</main></>;
}
