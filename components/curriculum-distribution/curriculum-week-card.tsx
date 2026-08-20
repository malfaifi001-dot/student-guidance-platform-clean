import type { CurriculumCalendarItem } from "@/lib/curriculum-distribution/calendar";

function displayText(value: string | null | undefined) {
  return String(value || "").replace(/(?:->|<-)/g, " · ").trim();
}

export function CurriculumWeekCard({ item }: { item: CurriculumCalendarItem }) {
  const grouped = new Map<string, string[]>();
  const standalone: string[] = [];

  for (const lesson of item.lessons) {
    const lessonText = displayText(lesson.lesson) || displayText(lesson.text) || "درس غير محدد";
    const unit = displayText(lesson.unit);
    if (!unit) {
      standalone.push(lessonText);
      continue;
    }
    const current = grouped.get(unit) || [];
    current.push(lessonText);
    grouped.set(unit, current);
  }

  const isBreak = item.kind === "BREAK";
  const isCalendarWeek = item.kind === "CALENDAR_WEEK";

  return (
    <article className="break-inside-avoid rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md md:p-5">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-black text-slate-950">{isBreak ? item.title : `الأسبوع ${item.sequence}`}</h3>
          {!isBreak ? <span className="mt-1 block text-[11px] font-bold text-slate-400">{isCalendarWeek ? item.title : `${item.lessons.length} ${item.lessons.length === 1 ? "درس" : "دروس"}`}</span> : null}
        </div>
        {isBreak ? <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">إجازة</span> : null}
      </header>

      <div className="mt-3 space-y-0.5 text-[10px] font-bold text-slate-400" dir="rtl">
        <p><span>هجري: </span><b dir="ltr" className="font-black text-slate-500">{item.hijriRange}</b></p>
        <p><span>ميلادي: </span><b dir="ltr" className="font-black text-slate-500">{item.gregorianRange}</b></p>
      </div>

      {isBreak || isCalendarWeek ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600">{item.title}</p>
      ) : item.lessons.length ? (
        <div className="mt-4 space-y-4">
          {[...grouped.entries()].map(([unit, lessons]) => (
            <section key={unit}>
              <h4 className="border-s-2 border-sky-500 pe-3 text-sm font-black text-sky-800">{unit}</h4>
              <ul className="mt-2 space-y-1.5 pe-4 text-sm font-bold leading-6 text-slate-700">
                {lessons.map((lesson, index) => (
                  <li key={`${unit}-${lesson}-${index}`} className="relative pe-4">
                    <span className="absolute end-0 top-3 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />
                    {lesson}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {standalone.length ? (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {standalone.map((value, index) => (
                <span key={`${value}-${index}`} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-100">{value}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500">لا يوجد توزيع لهذا الأسبوع</p>
      )}
    </article>
  );
}
