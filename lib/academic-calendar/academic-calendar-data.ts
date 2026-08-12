import type {
  AcademicCalendarEvent,
  AcademicCalendarWeek,
} from "./academic-calendar-types";

export const SEMESTER_ONE_ACADEMIC_YEAR = "1448–1449هـ";

export const SEMESTER_ONE_EVENTS: readonly AcademicCalendarEvent[] = [
  {
    id: "administrative-staff-return",
    title: "عودة الهيئة الإدارية والمشرفين التربويين",
    type: "RETURN",
    gregorianStart: "2026-08-11",
    hijriStart: "1448/2/28هـ",
    audience: ["ADMINISTRATIVE_STAFF", "EDUCATIONAL_SUPERVISORS"],
    priority: 10,
  },
  {
    id: "practicing-teachers-return",
    title: "عودة المعلمين الممارسين للتدريس",
    type: "RETURN",
    gregorianStart: "2026-08-16",
    hijriStart: "1448/3/3هـ",
    audience: ["TEACHER"],
    priority: 20,
  },
  {
    id: "academic-year-start",
    title: "بداية العام الدراسي",
    type: "SEMESTER_START",
    gregorianStart: "2026-08-23",
    hijriStart: "1448/3/10هـ",
    priority: 30,
  },
  {
    id: "national-day-holiday",
    title: "إجازة اليوم الوطني",
    type: "HOLIDAY",
    gregorianStart: "2026-09-23",
    gregorianEnd: "2026-09-26",
    hijriStart: "1448/4/12هـ",
    hijriEnd: "1448/4/15هـ",
    priority: 40,
  },
  {
    id: "autumn-break",
    title: "إجازة الخريف",
    type: "HOLIDAY",
    gregorianStart: "2026-11-20",
    gregorianEnd: "2026-11-28",
    hijriStart: "1448/6/10هـ",
    hijriEnd: "1448/6/18هـ",
    priority: 50,
  },
  {
    id: "semester-one-final-exams",
    title: "اختبارات نهاية الفصل الدراسي الأول",
    type: "EXAMS",
    gregorianStart: "2027-01-03",
    gregorianEnd: "2027-01-07",
    hijriStart: "1448/7/25هـ",
    hijriEnd: "1448/7/29هـ",
    priority: 60,
  },
  {
    id: "mid-year-break-start",
    title: "بداية إجازة منتصف العام",
    type: "SEMESTER_END",
    gregorianStart: "2027-01-08",
    hijriStart: "1448/7/30هـ",
    priority: 70,
  },
] as const;

export const SEMESTER_ONE_WEEKS: readonly AcademicCalendarWeek[] = [
  week(1, "1448/3/10", "1448/3/14", "2026-08-23", "2026-08-27"),
  week(2, "1448/3/17", "1448/3/21", "2026-08-30", "2026-09-03"),
  week(3, "1448/3/24", "1448/3/28", "2026-09-06", "2026-09-10"),
  week(4, "1448/4/2", "1448/4/6", "2026-09-13", "2026-09-17"),
  week(5, "1448/4/9", "1448/4/13", "2026-09-20", "2026-09-24"),
  week(6, "1448/4/16", "1448/4/20", "2026-09-27", "2026-10-01"),
  week(7, "1448/4/23", "1448/4/27", "2026-10-04", "2026-10-08"),
  week(8, "1448/4/30", "1448/5/4", "2026-10-11", "2026-10-15"),
  week(9, "1448/5/7", "1448/5/11", "2026-10-18", "2026-10-22"),
  week(10, "1448/5/14", "1448/5/18", "2026-10-25", "2026-10-29"),
  week(11, "1448/5/21", "1448/5/25", "2026-11-01", "2026-11-05"),
  week(12, "1448/5/28", "1448/6/2", "2026-11-08", "2026-11-12"),
  week(13, "1448/6/5", "1448/6/9", "2026-11-15", "2026-11-19"),
  {
    id: "autumn-break",
    kind: "BREAK",
    title: "إجازة الخريف",
    hijriStart: "1448/6/10",
    hijriEnd: "1448/6/18",
    gregorianStart: "2026-11-20",
    gregorianEnd: "2026-11-28",
  },
  week(14, "1448/6/19", "1448/6/23", "2026-11-29", "2026-12-03"),
  week(15, "1448/6/26", "1448/7/1", "2026-12-06", "2026-12-10"),
  week(16, "1448/7/4", "1448/7/8", "2026-12-13", "2026-12-17"),
  week(17, "1448/7/11", "1448/7/15", "2026-12-20", "2026-12-24"),
  week(18, "1448/7/18", "1448/7/22", "2026-12-27", "2026-12-31"),
  week(19, "1448/7/25", "1448/7/29", "2027-01-03", "2027-01-07", "اختبارات نهاية الفصل الدراسي الأول"),
] as const;

function week(
  weekNumber: number,
  hijriStart: string,
  hijriEnd: string,
  gregorianStart: string,
  gregorianEnd: string,
  title = `الأسبوع الدراسي ${weekNumber}`,
): AcademicCalendarWeek {
  return {
    id: `semester-one-week-${weekNumber}`,
    kind: "STUDY_WEEK",
    weekNumber,
    title,
    hijriStart,
    hijriEnd,
    gregorianStart,
    gregorianEnd,
  };
}
