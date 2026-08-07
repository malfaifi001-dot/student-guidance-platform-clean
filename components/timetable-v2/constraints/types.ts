export type DayItem = {
  id: string;
  label: string;
  order: number;
};

export type PeriodItem = {
  id: string;
  label: string;
  order: number;
  isBreak: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type Teacher = {
  id: string;
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number;
};

export type Subject = {
  id: string;
  name: string;
};

export type ClassItem = {
  id: string;
  name: string;
};

export type ConstraintTeacherLink = {
  teacher: {
    id: string;
    name: string;
    specialty: string | null;
  };
};

export type ConstraintSubjectLink = {
  subject: {
    id: string;
    name: string;
  };
};

export type ConstraintClassLink = {
  class: {
    id: string;
    name: string;
  };
};

export type Constraint = {
  id: string;
  type: string;
  strength: string;
  title: string | null;
  valueInt: number | null;
  notes: string | null;
  isActive: boolean;
  configJson: unknown;

  teachers: Array<ConstraintTeacherLink>;
  subjects: Array<ConstraintSubjectLink>;
  classes: Array<ConstraintClassLink>;

  days: Array<{
    dayId: string;
  }>;

  periods: Array<{
    periodId: string;
  }>;

  slots: Array<{
    dayId: string;
    periodId: string;
  }>;
};

export type Slot = {
  dayId: string;
  periodId: string;
};

export type ConstraintDraft = {
  type: string;
  strength: "HARD" | "SOFT";
  notes: string;
  valueInt: number | null;
  weight: number | null;
  teacherIds: string[];
  subjectIds: string[];
  classIds: string[];
  dayIds: string[];
  periodIds: string[];
  slots: Slot[];
};

export type ConstraintTone =
  | "danger"
  | "fixed"
  | "preferred"
  | "fairness"
  | "custom";

export type ToneHint =
  | ConstraintTone
  | null;
