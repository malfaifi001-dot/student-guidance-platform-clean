export type TimetableDayId =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type TimetableDay = {
  id: TimetableDayId;
  label: string;
  order: number;
};

export type TimetablePeriod = {
  id: string;
  label: string;
  order: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
};

export type TeacherUnavailableSlot = {
  dayId: TimetableDayId;
  periodId: string;
};

export type FixedTimetableSlot = {
  dayId: TimetableDayId;
  periodId: string;
  isLocked: boolean;
};

export type TimetableProjectSettings = {
  startTime: string;
  lessonDurationMinutes: number;
  breakAfterPeriod: number;
  breakDurationMinutes: number;
};

export type TimetableValidationIssueLevel = "ERROR" | "WARNING";

export type TimetableValidationIssueCode =
  | "PROJECT_DAYS_REQUIRED"
  | "PROJECT_PERIODS_REQUIRED"
  | "TEACHER_REQUIRED"
  | "CLASS_REQUIRED"
  | "SUBJECT_REQUIRED"
  | "UNASSIGNED_SUBJECT"
  | "TEACHER_QUOTA_EXCEEDED"
  | "CLASS_CAPACITY_OVERFLOW"
  | "CLASS_CAPACITY_UNDERFLOW"
  | "TEACHER_CONSTRAINT_UNSOLVABLE"
  | "FIXED_SLOT_CONFLICT"
  | "ASSIGNMENT_PERIODS_INVALID";

export type TimetableValidationIssue = {
  level: TimetableValidationIssueLevel;
  code: TimetableValidationIssueCode;
  message: string;
  entityId?: string;
};