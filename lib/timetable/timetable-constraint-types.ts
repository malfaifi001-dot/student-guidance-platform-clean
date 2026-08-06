export type TimetableConstraintLevel =
  | "HARD"
  | "PREFERRED";

export type TimetableConstraintType =
  | "TEACHER_UNAVAILABLE_SLOT"
  | "TEACHER_DAY_OFF"
  | "TEACHER_NOT_BEFORE_PERIOD"
  | "TEACHER_NOT_AFTER_PERIOD"
  | "TEACHER_MAX_DAILY_PERIODS"
  | "TEACHER_MAX_CONSECUTIVE_PERIODS"
  | "TEACHER_MAX_DAILY_GAPS"
  | "SUBJECT_FORBIDDEN_SLOT"
  | "SUBJECT_FIXED_SLOT"
  | "SUBJECT_MAX_DAILY_OCCURRENCES"
  | "SCHOOL_BLOCKED_SLOT"
  | "CLASS_NO_INTERNAL_GAPS"
  | "CLASS_MAX_HEAVY_SUBJECTS_DAILY"
  | "FAIR_FIRST_PERIODS"
  | "FAIR_LAST_PERIODS"
  | "TEACHER_WORKING_DAYS"
  | "TEACHER_MIN_DAILY_PERIODS"
  | "TEACHER_NO_SINGLE_PERIOD_DAY"
  | "SUBJECT_MIN_DISTRIBUTION_DAYS"
  | "NO_CONSECUTIVE_HEAVY_SUBJECTS"
  | "SUBJECT_REQUIRED_DOUBLE_PERIODS"
  | "CLASS_MAX_PERIODS_ON_DAY"
  | "SCHOOL_MAX_PERIODS_ON_DAY"
  | "SUBJECT_ROOM_REQUIREMENT"
  | "ROOM_UNAVAILABLE_SLOT";

export type TimetableConstraint = {
  id: string;
  type: TimetableConstraintType;
  level: TimetableConstraintLevel;
  isEnabled: boolean;

  teacherId?: string;
  subjectId?: string;
  classId?: string;

  dayId?: string;
  dayIds?: string[];
  periodId?: string;

  value?: number;
  weight?: number;
  subjectIds?: string[];
  roomId?: string;

  isLocked?: boolean;
};

export type TimetableConstraintsSettings = {
  version: "1";
  items: TimetableConstraint[];
};
export type TimetableRoom = {
  id: string;
  name: string;
  roomType:
    | "CLASSROOM"
    | "SCIENCE_LAB"
    | "COMPUTER_LAB"
    | "GYM"
    | "ART_ROOM"
    | "RESOURCE_ROOM"
    | "OTHER";
  capacity?: number;
  isActive: boolean;
};