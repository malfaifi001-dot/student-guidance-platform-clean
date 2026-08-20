import { SEMESTER_ONE_EVENTS, SEMESTER_ONE_WEEKS } from "@/lib/academic-calendar/academic-calendar-data";
import type { CurriculumLesson, CurriculumWeek } from "./types";

export type CurriculumCalendarItemKind = "CURRICULUM_WEEK" | "CALENDAR_WEEK" | "BREAK";

export type CurriculumCalendarItem = {
  id: string;
  kind: CurriculumCalendarItemKind;
  sequence?: number;
  title: string;
  lessons: CurriculumLesson[];
  hijriRange: string;
  gregorianRange: string;
};

const BREAK_TITLES: Record<string, string> = {
  "autumn-break": "إجازة الخريف",
  "mid-year-break": "إجازة منتصف العام",
};

const CALENDAR_WEEK_TITLES: Record<number, string> = {
  17: "المراجعة العامة",
  18: "الاختبارات الشفهية والعملية",
  19: "الاختبارات النهائية",
};

function pad(value: string) {
  return value.length === 1 ? `0${value}` : value;
}

function formatHijri(value: string) {
  const [year, month, day] = value.split("/");
  return `${year}/${pad(month || "")}/${pad(day || "")}`;
}

function formatGregorian(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatRange(start: string, end: string, formatter: (value: string) => string) {
  const first = formatter(start);
  const last = formatter(end);
  return first === last ? first : `${first} - ${last}`;
}

function dateFields(item: { hijriStart: string; hijriEnd?: string; gregorianStart: string; gregorianEnd?: string }) {
  return {
    hijriRange: formatRange(item.hijriStart, item.hijriEnd || item.hijriStart, formatHijri),
    gregorianRange: formatRange(item.gregorianStart, item.gregorianEnd || item.gregorianStart, formatGregorian),
  };
}

/**
 * Combines subject lessons with the shared semester calendar for presentation.
 * Calendar-only entries are intentionally kept out of CurriculumWeek/database data.
 */
export function getCurriculumCalendarItems(weeks: CurriculumWeek[]): CurriculumCalendarItem[] {
  const bySequence = new Map(weeks.map((week) => [week.sequence, week]));

  const items: CurriculumCalendarItem[] = SEMESTER_ONE_WEEKS.map((calendarItem) => {
    const dates = dateFields(calendarItem);
    if (calendarItem.kind === "BREAK") {
      const title = BREAK_TITLES[calendarItem.id] || calendarItem.title;
      return { id: calendarItem.id, kind: "BREAK", title, lessons: [], ...dates };
    }

    const sequence = calendarItem.weekNumber as number;
    const existingWeek = bySequence.get(sequence);
    const isFixedCalendarWeek = sequence >= 17;
    return {
      id: existingWeek?.id || calendarItem.id,
      kind: isFixedCalendarWeek ? "CALENDAR_WEEK" : "CURRICULUM_WEEK",
      sequence,
      title: isFixedCalendarWeek ? (CALENDAR_WEEK_TITLES[sequence] || calendarItem.title) : `الأسبوع ${sequence}`,
      lessons: isFixedCalendarWeek ? [] : (existingWeek?.lessons || []),
      ...dates,
    };
  });
  const midYearBreak = SEMESTER_ONE_EVENTS.find((event) => event.id === "mid-year-break-start");
  if (midYearBreak) {
    items.push({
      id: "mid-year-break",
      kind: "BREAK",
      title: BREAK_TITLES["mid-year-break"],
      lessons: [],
      ...dateFields(midYearBreak),
    });
  }
  return items;
}
