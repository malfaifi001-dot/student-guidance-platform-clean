"use client";

import { Fragment } from "react";
import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "@/components/curriculum-distribution/curriculum-document-identity";
import { ActivityPlanPhysicalPaginator, type ActivityPlanPhysicalItem } from "@/components/activity-plan/activity-plan-print-pagination";
import { ActivityPlanPrintPage, ACTIVITY_PLAN_PRINT_SUBTITLE, activityPlanPrintShellStyles } from "@/components/activity-plan/activity-plan-print-shell";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import { formatTenPercentWeeks, type ActivityPlanTenPercentRow } from "@/lib/activity-plan/ten-percent-activity-plan-types";

type Props = { rows: ActivityPlanTenPercentRow[]; gradeSections?: string[]; stage: string; academicYear?: string | null; schoolName: string; educationDepartment?: string | null; logoUrl?: string | null; activityLeaderName?: string | null; activityLeaderSignatureUrl?: string | null; principalName?: string | null; principalSignatureUrl?: string | null };
type Group = { id: string; stage: string; gradeSection: string; rows: ActivityPlanTenPercentRow[] };

function displayGrade(value: string) { const [grade, section] = String(value || "").split("::"); return `${grade || "بيانات سابقة غير مصنفة"}${section ? ` ${section}` : ""}`.trim(); }
function materialTypeLabel(value: ActivityPlanTenPercentRow["materialType"]) { return value === "10%" ? "10%" : "أساسية"; }

const semesterPrintStyles = `.activity-plan-semester-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.6pt}.activity-plan-semester-table th,.activity-plan-semester-table td{border:.25mm solid #CBD5E1;padding:1.45mm 1.1mm;text-align:center;vertical-align:middle;overflow-wrap:anywhere}.activity-plan-semester-table th{background:#0F5F7A;color:#fff;font-weight:900;line-height:1.25}.activity-plan-semester-table td{background:#fff;color:#172B3A;font-weight:700;line-height:1.25}.activity-plan-semester-table tbody tr{break-inside:avoid-page;page-break-inside:avoid}.activity-plan-semester-title{display:flex;align-items:center;justify-content:space-between;gap:5mm;margin:2.5mm 0;padding:1.8mm 2.5mm;border-right:2mm solid #0F7FA8;border-bottom:1px solid #B9D8E8;background:#F1F7FA;color:#123B4A}.activity-plan-semester-title h1{margin:0;font-size:14pt;font-weight:900;line-height:1.35}.activity-plan-semester-title span{font-size:9pt;font-weight:900;color:#0F5F7A}.activity-plan-semester-domain-list{display:flex;flex-wrap:wrap;justify-content:center;gap:.8mm}.activity-plan-semester-domain{display:inline-flex;align-items:center;gap:1.2mm;border:1px solid #94A3B8;border-radius:1.5mm;padding:.7mm 1.1mm;background:#F8FAFC;color:#203746;font-size:7.5pt;font-weight:900}.activity-plan-semester-domain i{display:inline-block;width:2.2mm;height:2.2mm;border-radius:50%}.activity-plan-semester-material-type{font-size:7.5pt;font-weight:900}.activity-plan-semester-material-type--core{color:#0F766E}.activity-plan-semester-material-type--ten{color:#B45309}.activity-plan-semester-empty{padding:10mm!important;color:#64748B!important}.activity-plan-semester-multiline{white-space:pre-line}`;

function SemesterRow({ row }: { row: ActivityPlanTenPercentRow }) { return <tr data-activity-plan-row><td><div className="activity-plan-semester-domain-list">{row.domains.map((domain) => { const color = getActivityPlanProgramByKey(domain.slug)?.backgroundColor || "#64748B"; return <span key={domain.serviceSlug} className="activity-plan-semester-domain" style={{ borderColor: color }}><i style={{ backgroundColor: color }} />{domain.title}</span>; })}</div></td><td>{row.programs.map((program) => program.name).join("، ") || "—"}</td><td dir="ltr">{formatTenPercentWeeks(row.executionWeeks)}</td><td dir="ltr">{row.periodCount?.trim() || "—"}</td><td>{row.subject || "—"} <span className={`activity-plan-semester-material-type ${row.materialType === "10%" ? "activity-plan-semester-material-type--ten" : "activity-plan-semester-material-type--core"}`}>({materialTypeLabel(row.materialType)})</span></td><td>{row.grades.map(displayGrade).join("\n") || "—"}</td><td><div className="activity-plan-semester-multiline">{row.teacherNames.join("\n") || "—"}</div></td></tr>; }

function groupRows(rows: ActivityPlanTenPercentRow[], fallbackStage: string): Group[] {
  const grouped = new Map<string, Group>();
  for (const row of rows) for (const gradeSection of row.grades.length ? row.grades : [""]) {
    const rowStage = row.stage || fallbackStage;
    const key = `${rowStage}::${gradeSection}`;
    const group = grouped.get(key) || { id: key, stage: rowStage, gradeSection, rows: [] };
    group.rows.push({ ...row, stage: rowStage, grades: gradeSection ? [gradeSection] : [] });
    grouped.set(key, group);
  }
  return Array.from(grouped.values());
}

export function ActivityPlanSemesterPrintDocument({ rows, gradeSections = [], stage, academicYear, schoolName, educationDepartment, logoUrl, activityLeaderName, activityLeaderSignatureUrl, principalName, principalSignatureUrl }: Props) {
  const scopedRows = gradeSections.length ? rows.flatMap((row) => { const grades = row.grades.filter((value) => gradeSections.includes(value)); return grades.length ? [{ ...row, grades }] : []; }) : rows;
  const groups = groupRows(scopedRows, stage);
  const visibleGroups = groups.length ? groups : [{ id: `${stage}::empty`, stage, gradeSection: "", rows: [] }];
  return <><style>{activityPlanPrintShellStyles}</style><style>{semesterPrintStyles}</style><main className="activity-plan-print-root" dir="rtl">{visibleGroups.map((group, groupIndex) => {
    const items: ActivityPlanPhysicalItem[] = group.rows.length ? group.rows.map((row) => ({ id: row.id, node: <SemesterRow row={row} /> })) : [{ id: `${group.id}:empty`, node: <tr data-activity-plan-row><td colSpan={7} className="activity-plan-semester-empty">لا توجد بيانات محفوظة لهذه المرحلة.</td></tr> }];
    const context = group.gradeSection ? `${group.stage} — ${displayGrade(group.gradeSection)}` : group.stage;
    return <section key={group.id} className="activity-plan-print-group" data-activity-plan-group={group.id}><ActivityPlanPhysicalPaginator items={items} includeSignatures={groupIndex === visibleGroups.length - 1} renderPage={({ items: pageItems, includeSignatures }) => <ActivityPlanPrintPage className={`activity-plan-ten-percent-print-page activity-plan-print-page--physical${includeSignatures ? "" : " activity-plan-print-page--compact-footer"}`} footer={<CurriculumDocumentFooter primaryRoleLabel="رائد النشاط" primaryName={activityLeaderName} primarySignatureUrl={activityLeaderSignatureUrl} primarySignatureAlt="توقيع رائد النشاط" principalName={principalName} principalSignatureUrl={principalSignatureUrl} includeSignatures={includeSignatures} signatureOrder="image-first" />}><CurriculumDocumentHeader title="الخطة الفصلية للنشاط الطلابي" subtitle={ACTIVITY_PLAN_PRINT_SUBTITLE} schoolName={schoolName} educationDepartment={educationDepartment} logoUrl={logoUrl} academicYear={academicYear} /><div className="activity-plan-semester-title"><h1>الخطة الفصلية للنشاط الطلابي</h1><span>{context}</span></div><table className="activity-plan-semester-table"><colgroup><col style={{ width: "18%" }} /><col style={{ width: "24%" }} /><col style={{ width: "12%" }} /><col style={{ width: "9%" }} /><col style={{ width: "15%" }} /><col style={{ width: "11%" }} /><col style={{ width: "11%" }} /></colgroup><thead><tr><th>المجال</th><th>البرنامج / النشاط</th><th>أسابيع التنفيذ</th><th>عدد الحصص</th><th>المادة والنوع</th><th>الصف</th><th>المعلم / المعلمون</th></tr></thead><tbody>{pageItems.map((item) => <Fragment key={item.id}>{item.node}</Fragment>)}</tbody></table></ActivityPlanPrintPage>} /></section>;
  })}</main></>;
}
