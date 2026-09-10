import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "@/components/curriculum-distribution/curriculum-document-identity";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import type { ActivityPlanPrintEntry, ActivityPlanPrintWeek as ActivityPlanPrintWeekData } from "@/lib/activity-plan/activity-plan-print-data";
import { formatActivityPlanHijriDate } from "@/lib/activity-plan/activity-plan-date-format";
import { ActivityPlanPrintPage, ACTIVITY_PLAN_PRINT_SUBTITLE } from "@/components/activity-plan/activity-plan-print-shell";

function formatDate(value: string) {
  return formatActivityPlanHijriDate(value);
}

const periods = [1, 2, 3, 4, 5, 6, 7];
const programKeys = ["citizenship-life", "science-technology", "culture-arts", "sports-health", "scouting", "events-occasions"];

type ActivityPlanPrintWeekProps = {
  week: ActivityPlanPrintWeekData;
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

export function ActivityPlanPrintWeek({
  week,
  stage,
  academicYear,
  schoolName,
  educationDepartment,
  logoUrl,
  activityLeaderName,
  activityLeaderSignatureUrl,
  principalName,
  principalSignatureUrl,
}: ActivityPlanPrintWeekProps) {
  const entriesBySlot = new Map<string, ActivityPlanPrintEntry[]>();
  for (const entry of week.entries) {
    const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
    entriesBySlot.set(key, [...(entriesBySlot.get(key) || []), entry]);
  }

  return (
    <ActivityPlanPrintPage
      className="activity-plan-print-page--physical"
      footer={<CurriculumDocumentFooter primaryRoleLabel="رائد النشاط" primaryName={activityLeaderName} primarySignatureUrl={activityLeaderSignatureUrl} primarySignatureAlt="توقيع رائد النشاط" principalName={principalName} principalSignatureUrl={principalSignatureUrl} />}
    >
      <CurriculumDocumentHeader title="خطة النشاط الطلابي" subtitle={ACTIVITY_PLAN_PRINT_SUBTITLE} schoolName={schoolName} educationDepartment={educationDepartment} logoUrl={logoUrl} academicYear={academicYear} />

      <section className="activity-plan-print-objective">
        <strong>المرحلة</strong>
        <span aria-label="المرحلة">{stage}</span>
      </section>

      <section className="activity-plan-print-legend" aria-label="مجالات النشاط الطلابي">
        <strong>مجالات النشاط</strong>
        {programKeys.map((key) => {
          const program = getActivityPlanProgramByKey(key);
          return <span key={key} className={`activity-plan-print-legend-item ${program?.printColorClass || ""}`} style={program ? { backgroundColor: program.backgroundColor, color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : undefined}>{program?.title}</span>;
        })}
      </section>

      <section className="activity-plan-print-week-strip">
        <strong>الأسبوع</strong>
        <b>{week.weekNumber}</b>
        <span />
      </section>

      <h2 className="activity-plan-print-table-heading">الحصص الدراسية</h2>
      <table className="activity-plan-print-table">
        <caption className="sr-only">خطة النشاط الطلابي للأسبوع {week.weekNumber}</caption>
        <thead>
          <tr>
            <th className="activity-plan-print-day-head">اليوم والتاريخ</th>
            <th className="activity-plan-print-label-head">البيان</th>
            {periods.map((period) => <th key={period}>الحصة {new Intl.NumberFormat("ar-SA").format(period)}</th>)}
          </tr>
        </thead>
        <tbody>
          {week.dates.map((day) => {
            const rows = ["البرنامج", "الصف", "اسم المعلم"] as const;
            return rows.map((rowLabel, rowIndex) => (
              <tr key={`${day.dayOfWeek}-${rowLabel}`}>
                {rowIndex === 0 ? <th className="activity-plan-print-day" rowSpan={3}><span>{day.label}</span><small>{formatDate(day.date)}</small></th> : null}
                <th className="activity-plan-print-row-label">{rowLabel}</th>
                {periods.map((period) => {
                  const entries = entriesBySlot.get(`${day.dayOfWeek}-${period}`) || [];
                  const hasProgram = rowIndex === 0 && entries.some((entry) => Boolean(entry.displayTitle));
                  return <td key={`${rowLabel}-${period}`} className={hasProgram ? "activity-plan-program-cell" : ""} style={rowIndex === 1 ? { whiteSpace: "pre-line" } : undefined}>{entries.length ? <div className="activity-plan-print-entry-stack">{entries.map((entry, index) => {
                    const domainProgram = entry.domainKey ? getActivityPlanProgramByKey(entry.domainKey) : null;
                    const value = rowIndex === 0 ? entry.displayTitle : rowIndex === 1 ? [entry.stage, entry.gradeLabel && `${entry.gradeLabel}${entry.section ? ` ${entry.section}` : ""}`, entry.subject && `${entry.subject} (${entry.materialType || "أساسية"})`].filter(Boolean).join("\n") : entry.teacherName;
                    const isProgram = rowIndex === 0 && Boolean(entry.displayTitle);
                    return <div key={`${entry.programKey}-${index}`} className={isProgram ? "activity-plan-print-entry activity-plan-print-entry--program" : "activity-plan-print-entry"} style={isProgram && domainProgram ? { backgroundColor: domainProgram.backgroundColor, color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : undefined}>{value}</div>;
                  })}</div> : null}</td>;
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>

    </ActivityPlanPrintPage>
  );
}
