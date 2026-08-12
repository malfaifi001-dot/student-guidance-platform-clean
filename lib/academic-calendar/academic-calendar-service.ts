import { SEMESTER_ONE_EVENTS, SEMESTER_ONE_WEEKS } from "./academic-calendar-data";
import type {
  AcademicCalendarEvent,
  AcademicCalendarStatus,
  AcademicCalendarWeek,
} from "./academic-calendar-types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const GREGORIAN_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;
const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
] as const;
const ARABIC_ORDINALS = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
  "الثالث عشر",
  "الرابع عشر",
  "الخامس عشر",
  "السادس عشر",
  "السابع عشر",
  "الثامن عشر",
  "التاسع عشر",
] as const;

type CalendarDateInput = Date | string;

export function getCurrentSaudiCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${value.year}-${value.month}-${value.day}`;
}

function parseDateParts(value: CalendarDateInput) {
  if (value instanceof Date) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid academic calendar date: ${value}`);

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function dateOrdinal(value: CalendarDateInput) {
  const { year, month, day } = parseDateParts(value);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

function eventEnd(event: AcademicCalendarEvent) {
  return event.gregorianEnd || event.gregorianStart;
}

function formatDays(count: number) {
  if (count === 1) return "متبقي يوم واحد";
  if (count === 2) return "متبقي يومان";
  if (count >= 3 && count <= 10) return `متبقي ${count} أيام`;
  return `متبقي ${count} يومًا`;
}

export function getCurrentAcademicWeek(
  today: CalendarDateInput = getCurrentSaudiCalendarDate(),
): AcademicCalendarWeek | null {
  const todayOrdinal = dateOrdinal(today);

  return (
    SEMESTER_ONE_WEEKS.find(
      (week) =>
        week.kind === "STUDY_WEEK" &&
        todayOrdinal >= dateOrdinal(week.gregorianStart) &&
        todayOrdinal <= dateOrdinal(week.gregorianEnd),
    ) || null
  );
}

export function getNextAcademicCalendarEvent(
  today: CalendarDateInput = getCurrentSaudiCalendarDate(),
): AcademicCalendarEvent | null {
  const todayOrdinal = dateOrdinal(today);
  return (
    SEMESTER_ONE_EVENTS.find(
      (event) => dateOrdinal(event.gregorianStart) > todayOrdinal,
    ) || null
  );
}

export function getCurrentAcademicCalendarStatus(
  today: CalendarDateInput = getCurrentSaudiCalendarDate(),
): AcademicCalendarStatus {
  const todayOrdinal = dateOrdinal(today);
  const currentWeek = getCurrentAcademicWeek(today);
  const activeEvent = SEMESTER_ONE_EVENTS.find(
    (event) =>
      todayOrdinal >= dateOrdinal(event.gregorianStart) &&
      todayOrdinal <= dateOrdinal(eventEnd(event)),
  );

  if (activeEvent) {
    const startOrdinal = dateOrdinal(activeEvent.gregorianStart);
    const endOrdinal = dateOrdinal(eventEnd(activeEvent));
    const isSingleDay = startOrdinal === endOrdinal;
    const isFinalDay = todayOrdinal === endOrdinal;
    const remainingDays = endOrdinal - todayOrdinal + 1;

    return {
      state: "ACTIVE",
      event: activeEvent,
      currentWeek,
      timingLabel: isFinalDay && !isSingleDay
        ? "آخر يوم"
        : todayOrdinal === startOrdinal
          ? "يبدأ اليوم"
          : activeEvent.type === "HOLIDAY"
            ? "الإجازة جارية الآن"
            : "الحدث جارٍ الآن",
      remainingLabel:
        isSingleDay || isFinalDay ? null : formatDays(remainingDays),
    };
  }

  const nextEvent = getNextAcademicCalendarEvent(today);
  if (nextEvent) {
    const daysUntil = dateOrdinal(nextEvent.gregorianStart) - todayOrdinal;
    return {
      state: "UPCOMING",
      event: nextEvent,
      currentWeek,
      timingLabel: daysUntil === 1 ? "يبدأ غدًا" : formatDays(daysUntil),
      remainingLabel: null,
    };
  }

  return {
    state: "COMPLETE",
    event: null,
    currentWeek,
    timingLabel: "انتهى الفصل الدراسي الأول",
    remainingLabel: "سيتم تحديث التقويم للفصل الدراسي القادم",
  };
}

export function formatAcademicWeekLabel(week: AcademicCalendarWeek) {
  const ordinal = week.weekNumber
    ? ARABIC_ORDINALS[week.weekNumber - 1]
    : null;
  return ordinal ? `الأسبوع الدراسي ${ordinal}` : week.title;
}

export function formatGregorianCalendarRange(event: AcademicCalendarEvent) {
  const start = parseDateParts(event.gregorianStart);
  if (!event.gregorianEnd) {
    return `${start.day} ${GREGORIAN_MONTHS[start.month - 1]} ${start.year}`;
  }

  const end = parseDateParts(event.gregorianEnd);
  if (start.year === end.year && start.month === end.month) {
    return `${start.day} – ${end.day} ${GREGORIAN_MONTHS[start.month - 1]} ${start.year}`;
  }

  return `${start.day} ${GREGORIAN_MONTHS[start.month - 1]} ${start.year} – ${end.day} ${GREGORIAN_MONTHS[end.month - 1]} ${end.year}`;
}

function parseHijri(value: string) {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})هـ$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function formatHijriCalendarRange(event: AcademicCalendarEvent) {
  const start = parseHijri(event.hijriStart);
  const end = event.hijriEnd ? parseHijri(event.hijriEnd) : null;
  if (!start) return event.hijriStart;

  if (!end) {
    return `${start.day} ${HIJRI_MONTHS[start.month - 1]} ${start.year}هـ`;
  }

  if (start.year === end.year && start.month === end.month) {
    return `${start.day} – ${end.day} ${HIJRI_MONTHS[start.month - 1]} ${start.year}هـ`;
  }

  return `${start.day} ${HIJRI_MONTHS[start.month - 1]} ${start.year}هـ – ${end.day} ${HIJRI_MONTHS[end.month - 1]} ${end.year}هـ`;
}
