import { CurriculumDocumentFooter, CurriculumDocumentHeader } from "@/components/curriculum-distribution/curriculum-document-identity";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";
import type { ActivityPlanPrintWeek as ActivityPlanPrintWeekData } from "@/lib/activity-plan/activity-plan-print-data";

function formatDate(value: string) {
  const [, month, day] = value.slice(0, 10).split("-");
  return month && day ? `${day}/${month}` : "";
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
  const entryBySlot = new Map(week.entries.map((entry) => [`${entry.dayOfWeek}-${entry.periodNumber}`, entry]));

  return (
    <section className="activity-plan-print-page" dir="rtl">
      <CurriculumDocumentHeader title="خطة النشاط الطلابي" schoolName={schoolName} educationDepartment={educationDepartment} logoUrl={logoUrl} academicYear={academicYear} />

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
                  const entry = entryBySlot.get(`${day.dayOfWeek}-${period}`);
                  const program = entry ? getActivityPlanProgramByKey(entry.programKey) : null;
                  const value = rowIndex === 0 ? program?.title || "" : rowIndex === 1 ? entry?.gradeLabel || "" : entry?.teacherName || "";
                  const isProgramCell = rowIndex === 0 && Boolean(program);
                  return <td key={`${rowLabel}-${period}`} className={isProgramCell ? "activity-plan-program-cell" : ""} style={isProgramCell && program ? { backgroundColor: program.backgroundColor, color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : undefined}>{value}</td>;
                })}
              </tr>
            ));
          })}
        </tbody>
      </table>

      <CurriculumDocumentFooter primaryRoleLabel="رائد النشاط" primaryName={activityLeaderName} primarySignatureUrl={activityLeaderSignatureUrl} primarySignatureAlt="توقيع رائد النشاط" principalName={principalName} principalSignatureUrl={principalSignatureUrl} />
    </section>
  );
}
