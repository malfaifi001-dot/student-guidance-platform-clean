export type AcademicCalendarEventType =
  | "RETURN"
  | "SEMESTER_START"
  | "HOLIDAY"
  | "EXAMS"
  | "SEMESTER_END";

export type AcademicCalendarEvent = {
  id: string;
  title: string;
  type: AcademicCalendarEventType;
  gregorianStart: string;
  gregorianEnd?: string;
  hijriStart: string;
  hijriEnd?: string;
  audience?: string[];
  priority?: number;
};

export type AcademicCalendarWeek = {
  id: string;
  kind: "STUDY_WEEK" | "BREAK";
  weekNumber?: number;
  title: string;
  gregorianStart: string;
  gregorianEnd: string;
  hijriStart: string;
  hijriEnd: string;
};

export type AcademicCalendarStatus = {
  state: "UPCOMING" | "ACTIVE" | "COMPLETE";
  event: AcademicCalendarEvent | null;
  currentWeek: AcademicCalendarWeek | null;
  timingLabel: string;
  remainingLabel: string | null;
};
