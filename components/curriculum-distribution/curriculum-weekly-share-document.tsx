import { getCurriculumCalendarItems } from "@/lib/curriculum-distribution/calendar";
import type { CurriculumDistribution } from "@/lib/curriculum-distribution/types";
import { getCurrentAcademicWeek } from "@/lib/academic-calendar/academic-calendar-service";

type WeeklyDistribution = { distribution: CurriculumDistribution };

function lessonLabel(value: string | null | undefined) {
  return String(value || "").replace(/(?:->|<-)/g, " · ").trim();
}

function CurrentWeekSection({ distribution, weekNumber }: { distribution: CurriculumDistribution; weekNumber: number | null }) {
  const item = getCurriculumCalendarItems(distribution.weeks).find((entry) => entry.sequence === weekNumber);
  const lessons = item?.lessons || [];

  return <section className="weekly-share-section">
    <h2>{distribution.subject.name}</h2>
    <div className="weekly-share-meta"><span>المرحلة: {distribution.stage.name}</span><span>الصف / السنة: {distribution.grade.name}</span><span>الفصل: {distribution.semester.name}</span></div>
    {item ? <p className="weekly-share-week"><strong>{item.title}</strong><b dir="ltr">{item.gregorianRange}</b></p> : null}
    {lessons.length ? <table className="weekly-share-table"><thead><tr><th>الوحدة</th><th>الدرس / المحتوى</th></tr></thead><tbody>{lessons.map((lesson, index) => <tr key={`${lesson.id}-${index}`}><td>{lessonLabel(lesson.unit) || "—"}</td><td>{lessonLabel(lesson.lesson) || lessonLabel(lesson.text) || "—"}</td></tr>)}</tbody></table> : <p className="weekly-share-empty">لا يوجد توزيع لهذا الأسبوع.</p>}
  </section>;
}

export function CurriculumWeeklyShareDocument({ distributions, allSubjects = false }: { distributions: WeeklyDistribution[]; allSubjects?: boolean }) {
  const currentWeek = getCurrentAcademicWeek();
  const weekNumber = currentWeek?.weekNumber ?? null;
  return <main dir="rtl" className="weekly-share-root">
    <header className="weekly-share-header"><p>خطة توزيع المنهج</p><h1>{allSubjects ? "منهج الأسبوع" : "منهج الأسبوع"}</h1><span>{currentWeek ? `الأسبوع ${currentWeek.weekNumber} · ${currentWeek.gregorianStart} - ${currentWeek.gregorianEnd}` : "لا يوجد أسبوع دراسي حالي"}</span></header>
    <div className="weekly-share-body">{distributions.map(({ distribution }) => <CurrentWeekSection key={`${distribution.subject.id}-${distribution.semester.id}`} distribution={distribution} weekNumber={weekNumber} />)}</div>
  </main>;
}
