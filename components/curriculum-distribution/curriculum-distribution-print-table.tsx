import type { CurriculumCalendarItem } from "@/lib/curriculum-distribution/calendar";
import type { CurriculumLesson } from "@/lib/curriculum-distribution/types";

function cleanText(value: string | null | undefined) {
  return String(value || "").replace(/(?:->|<-)/g, " · ").trim();
}

function semanticKind(text: string) {
  if (/اختبار/.test(text)) return "exam";
  if (/إجازة|عطلة/.test(text)) return "holiday";
  if (/مراجعة/.test(text)) return "review";
  if (/تهيئة|استعداد/.test(text)) return "preparation";
  return "neutral";
}

function groupWeek(lessons: CurriculumLesson[]) {
  const units: Array<{ name: string; lessons: string[] }> = [];
  const byUnit = new Map<string, { name: string; lessons: string[] }>();
  const standalone: string[] = [];

  for (const item of lessons) {
    const text = cleanText(item.lesson) || cleanText(item.text) || "درس غير محدد";
    const unit = cleanText(item.unit);
    if (!unit) {
      standalone.push(text);
      continue;
    }
    let group = byUnit.get(unit);
    if (!group) {
      group = { name: unit, lessons: [] };
      byUnit.set(unit, group);
      units.push(group);
    }
    group.lessons.push(text);
  }

  return { units, standalone };
}

function WeekCell({ item }: { item: CurriculumCalendarItem }) {
  const grouped = groupWeek(item.lessons);
  const isBreak = item.kind === "BREAK";
  const isCalendarWeek = item.kind === "CALENDAR_WEEK";

  return (
    <div className={`curriculum-print-week-cell${isBreak ? " curriculum-print-week-cell--break" : ""}`}>
      <div className="curriculum-print-week-heading">
        <strong>{isBreak ? item.title : `الأسبوع ${item.sequence}`}</strong>
        <span>{isBreak ? "إجازة" : isCalendarWeek ? item.title : `${item.lessons.length} ${item.lessons.length === 1 ? "درس" : "دروس"}`}</span>
      </div>
      <div className="curriculum-print-week-dates" dir="rtl">
        <span>هجري: <b dir="ltr">{item.hijriRange}</b></span>
        <span>ميلادي: <b dir="ltr">{item.gregorianRange}</b></span>
      </div>

      {isBreak || isCalendarWeek ? (
        <p className="curriculum-print-calendar-note">{item.title}</p>
      ) : null}

      {grouped.units.map((unit) => (
        <section className="curriculum-print-unit" key={unit.name}>
          <h3>{unit.name}</h3>
          <ul>
            {unit.lessons.map((lesson, index) => <li key={`${unit.name}-${lesson}-${index}`}>{lesson}</li>)}
          </ul>
        </section>
      ))}

      {grouped.standalone.length > 0 ? (
        <div className="curriculum-print-special-items" aria-label="عناصر إضافية">
          {grouped.standalone.map((value, index) => (
            <span className={`curriculum-print-special-item curriculum-print-special-item--${semanticKind(value)}`} key={`${value}-${index}`}>
              {value}
            </span>
          ))}
        </div>
      ) : null}

      {!isBreak && !isCalendarWeek && item.lessons.length === 0 ? <p className="curriculum-print-empty-week">لا يوجد توزيع لهذا الأسبوع</p> : null}
    </div>
  );
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export function CurriculumDistributionPrintTable({ items }: { items: CurriculumCalendarItem[] }) {
  return (
    <table className="curriculum-print-table">
      <caption className="sr-only">توزيع المنهج حسب الأسابيع</caption>
      <tbody>
        {chunks(items, 5).map((row, rowIndex) => (
          <tr key={`week-row-${rowIndex}`}>
            {row.map((item) => <td key={item.id}><WeekCell item={item} /></td>)}
            {Array.from({ length: 5 - row.length }, (_, index) => <td className="curriculum-print-empty-cell" key={`empty-${rowIndex}-${index}`} aria-hidden="true" />)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
