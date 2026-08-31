import type React from "react";
import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "@/components/curriculum-distribution/curriculum-document-identity";
import type { WeeklyActivityPlan } from "@/lib/activity-plan/weekly-activity-plan-service";
import { formatActivityPlanHijriDate } from "@/lib/activity-plan/activity-plan-date-format";
import { ActivityPlanPrintPage, activityPlanPrintShellStyles } from "@/components/activity-plan/activity-plan-print-shell";

type Props = {
  weeks: WeeklyActivityPlan[];
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

const DOMAIN_STYLES: Record<string, { background: string; color: string }> = {
  "citizenship-life": { background: "#fff2cc", color: "#5f4700" },
  "science-technology": { background: "#dce6f8", color: "#193b72" },
  "culture-arts": { background: "#d9f0ec", color: "#165d54" },
  "sports-health": { background: "#f7dddd", color: "#7a2424" },
  scouting: { background: "#fce4d6", color: "#7b3b16" },
  "events-occasions": { background: "#d9ead3", color: "#315b2c" },
  "non-class-periods": { background: "#eee7f5", color: "#563d6c" },
};

function dateLabel(value: string) {
  return formatActivityPlanHijriDate(value);
}

function groups(weeks: WeeklyActivityPlan[]) {
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  return [sorted.slice(0, 7), sorted.slice(7, 14), sorted.slice(14, 20)].filter((group) => group.length);
}

function CellText({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <div style={{ fontSize: 9, lineHeight: 1.35, fontWeight: 700, color: muted ? "#7a8587" : "#172b31", overflowWrap: "anywhere" }}>{children}</div>;
}

function PlanCell({ week, row }: { week: WeeklyActivityPlan; row: "domain" | "program" | "periods" }) {
  if (row === "periods") return <CellText muted={week.periodCount == null}>{week.periodCount ?? "—"}</CellText>;
  if (!week.items.length) return <CellText muted>—</CellText>;
  if (row === "domain") return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    {week.items.map((item) => { const style = DOMAIN_STYLES[item.domainServiceSlug] || { background: "#eef2f1", color: "#334443" }; return <div key={item.domainServiceSlug} style={{ borderRadius: 2, background: style.background, color: style.color, padding: "2px 3px", fontSize: 8.6, lineHeight: 1.25, fontWeight: 800 }}>{item.domainTitle}</div>; })}
  </div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{week.items.flatMap((item) => item.programs.map((program, index) => <CellText key={`${item.domainServiceSlug}-${program.value}-${index}`}>{program.name}</CellText>))}</div>;
}

const border: React.CSSProperties = { border: "1px solid #c7d2d0" };
const bodyCell: React.CSSProperties = { ...border, background: "#ffffff", padding: "5px 5px", textAlign: "center", verticalAlign: "middle" };
const labelCell: React.CSSProperties = { ...border, width: 70, background: "#f1f6f5", color: "#31524d", padding: "5px", fontSize: 9.5, fontWeight: 900, textAlign: "center", verticalAlign: "middle" };

function Band({ weeks }: { weeks: WeeklyActivityPlan[] }) {
  return <div className="weekly-plan-band-frame" style={{ overflow: "hidden", border: "1px solid #c7b79b", borderRadius: 14, background: "#fff" }}><table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", direction: "rtl" }}>
    <colgroup><col style={{ width: 70 }} />{weeks.map((week) => <col key={week.weekNumber} />)}</colgroup>
    <tbody>
      <tr><th style={{ ...border, background: "#0f766e", color: "#fff", padding: 5, fontSize: 9.5, fontWeight: 900 }}>الأسابيع</th>{weeks.map((week) => <th key={week.weekNumber} style={{ ...border, background: "#0f766e", color: "#fff", padding: "5px 3px", fontSize: 9.5, lineHeight: 1.35 }}><div>الأسبوع {week.weekNumber}</div><small dir="ltr" style={{ display: "block", color: "#d9f3ef", fontSize: 7.5, marginTop: 2 }}>{dateLabel(week.dateFrom)} - {dateLabel(week.dateTo)}</small></th>)}</tr>
      <tr><th style={labelCell}>المجال</th>{weeks.map((week) => <td key={week.weekNumber} style={bodyCell}><PlanCell week={week} row="domain" /></td>)}</tr>
      <tr><th style={labelCell}>البرنامج</th>{weeks.map((week) => <td key={week.weekNumber} style={bodyCell}><PlanCell week={week} row="program" /></td>)}</tr>
      <tr><th style={labelCell}>عدد الحصص</th>{weeks.map((week) => <td key={week.weekNumber} style={{ ...bodyCell, height: 25 }}><PlanCell week={week} row="periods" /></td>)}</tr>
    </tbody>
  </table></div>;
}

export function WeeklyActivityPlanMatrix({ weeks }: { weeks: WeeklyActivityPlan[] }) {
  return <div className="weekly-plan-bands" style={{ display: "flex", flexDirection: "column", gap: 8 }}>{groups(weeks).map((group, index) => <div key={`band-${index}`} className="weekly-plan-band"><Band weeks={group} /></div>)}</div>;
}

export function WeeklyActivityPlanPrintDocument({ weeks, stage, academicYear, schoolName, educationDepartment, logoUrl, activityLeaderName, activityLeaderSignatureUrl, principalName, principalSignatureUrl }: Props) {
  return <>
    <style>{`@page { size: A4 landscape; margin: 8mm; } .weekly-activity-plan-print-page { height: auto !important; min-height: 0 !important; max-height: none !important; padding: 0 !important; overflow: visible !important; page-break-after: auto !important; break-after: auto !important; } .weekly-plan-a4 { width: 100%; min-height: 194mm; display: flex; flex-direction: column; } .weekly-plan-band, .weekly-plan-band-frame { break-inside: avoid; page-break-inside: avoid; } @media print { html, body { margin: 0 !important; padding: 0 !important; } .weekly-plan-a4 { min-height: 194mm; } .weekly-plan-band-frame { box-shadow: none !important; } }`}</style>
    <style>{activityPlanPrintShellStyles}</style><main className="activity-plan-print-root" dir="rtl">
      <ActivityPlanPrintPage className="weekly-activity-plan-print-page activity-plan-print-page--physical">
        <div className="weekly-plan-a4">
          <CurriculumDocumentHeader title="الخطة الفصلية للنشاط الطلابي" schoolName={schoolName} educationDepartment={educationDepartment} logoUrl={logoUrl} academicYear={academicYear} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #087e8b", margin: "4px 0 5px", padding: "3px 2px 5px" }}><h1 style={{ margin: 0, color: "#174d59", fontSize: 15, lineHeight: 1.2, fontWeight: 900 }}>الخطة الفصلية للنشاط الطلابي</h1><div style={{ display: "flex", gap: 5, fontSize: 9, fontWeight: 800 }}><span style={{ color: "#617477" }}>المرحلة</span><span style={{ border: "1px solid #9fb7b3", background: "#eff6f4", borderRadius: 3, padding: "2px 7px", color: "#214e49", fontWeight: 900 }}>{stage}</span></div></div>
          <div style={{ flex: 1 }}><WeeklyActivityPlanMatrix weeks={weeks} /></div>
          <div style={{ marginTop: 5 }}><CurriculumDocumentFooter primaryRoleLabel="رائد النشاط" primaryName={activityLeaderName} primarySignatureUrl={activityLeaderSignatureUrl} primarySignatureAlt="توقيع رائد النشاط" principalName={principalName} principalSignatureUrl={principalSignatureUrl} /></div>
        </div>
      </ActivityPlanPrintPage>
    </main>
  </>;
}
