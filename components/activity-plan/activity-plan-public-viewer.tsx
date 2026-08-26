import type { ActivityPlanPrintWeek } from "@/lib/activity-plan/activity-plan-print-data";
import { getActivityPlanProgramByKey } from "@/lib/activity-plan/activity-plan-programs";

export function ActivityPlanPublicViewer({
  weeks,
  schoolName,
  academicYear,
  educationDepartment,
}: {
  weeks: ActivityPlanPrintWeek[];
  schoolName: string;
  academicYear?: string | null;
  educationDepartment?: string | null;
}) {
  return (
    <main className="activity-plan-public-viewer" dir="rtl">
      <header className="activity-plan-public-cover">
        <p>{educationDepartment || "خطة النشاط الطلابي"}</p>
        <h1>خطة النشاط الطلابي</h1>
        <strong>{schoolName}</strong>
        {academicYear ? <span>العام الدراسي: {academicYear}</span> : null}
        <small>عرض للقراءة فقط</small>
      </header>
      {weeks.map((week) => (
        <section className="activity-plan-public-week" key={week.weekNumber}>
          <div className="activity-plan-public-week-heading"><h2>الأسبوع {week.weekNumber}</h2><span>{week.dates[0]?.date || ""} – {week.dates.at(-1)?.date || ""}</span></div>
          <table>
            <thead><tr><th>اليوم</th><th>التاريخ</th><th>الحصة</th><th>المجال / النشاط</th><th>الصف</th><th>المشرف</th></tr></thead>
            <tbody>
              {week.dates.flatMap((day) => week.entries.filter((entry) => entry.dayOfWeek === day.dayOfWeek).map((entry) => {
                const domainProgram = getActivityPlanProgramByKey(entry.domainKey);
                return <tr key={`${week.weekNumber}-${day.dayOfWeek}-${entry.periodNumber}`}><td>{day.label}</td><td>{day.date}</td><td>{entry.periodNumber}</td><td className="activity-plan-public-program" style={domainProgram ? { backgroundColor: domainProgram.backgroundColor, color: "#ffffff", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } : undefined}>{entry.displayTitle || "نشاط طلابي"}</td><td>{entry.gradeLabel}</td><td>{entry.teacherName}</td></tr>;
              }))}
            </tbody>
          </table>
          {!week.entries.length ? <p className="activity-plan-public-empty">لا توجد أنشطة مسجلة لهذا الأسبوع.</p> : null}
        </section>
      ))}
    </main>
  );
}
