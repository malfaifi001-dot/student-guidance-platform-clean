export type TimetableFeasibilityStatus =
  | "PROVABLY_INFEASIBLE"
  | "NO_PROVEN_CONTRADICTION"
  | "INVALID_PROBLEM";

export type TimetableFeasibilitySeverity =
  | "ERROR"
  | "WARNING"
  | "INFO";

export type TimetableFeasibilityCategory =
  | "PROBLEM"
  | "SCHOOL"
  | "CLASS"
  | "TEACHER"
  | "SUBJECT"
  | "ASSIGNMENT"
  | "FIXED_SLOT"
  | "DOUBLE_PERIOD"
  | "CONSTRAINT"
  | "CAPACITY";

export type TimetableFeasibilityEvidence = {
  required?: number;
  capacity?: number;
  availableDays?: number;
  availableSlots?: number;
  limit?: number;

  teacherId?: string;
  teacherName?: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  assignmentId?: string;
  constraintId?: string;

  dayId?: string;
  periodId?: string;

  details?: Record<string, unknown>;
};

export type TimetableFeasibilityIssue = {
  code: string;

  severity:
    TimetableFeasibilitySeverity;

  category:
    TimetableFeasibilityCategory;

  proven:
    boolean;

  message:
    string;

  entityId:
    string | null;

  evidence:
    TimetableFeasibilityEvidence;
};

export type TimetableFeasibilityMetric = {
  key: string;
  value: number | string | boolean;
};

export type TimetableFeasibilityReport = {
  version: "1";

  status:
    TimetableFeasibilityStatus;

  feasible:
    boolean | null;

  projectId:
    string;

  analyzedAt:
    string;

  durationMs:
    number;

  summary: {
    days:
      number;

    periodsPerDay:
      number;

    schoolSlots:
      number;

    classes:
      number;

    teachers:
      number;

    subjects:
      number;

    assignments:
      number;

    constraints:
      number;

    requiredSessions:
      number;

    provenContradictions:
      number;

    warnings:
      number;

    infos:
      number;
  };

  issues:
    TimetableFeasibilityIssue[];

  metrics:
    TimetableFeasibilityMetric[];
};
