export type GenerationDay = {
  id: string;
  label: string;
  order: number;
};

export type GenerationPeriod = {
  id: string;
  label: string;
  order: number;
};

export type GenerationTeacher = {
  id: string;
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number;
};

export type GenerationClass = {
  id: string;
  name: string;
  stageId?: import("../project-setup").TimetableV2StageId;
  weeklyPeriodTarget?: number | null;
};

export type GenerationSubject = {
  id: string;
  name: string;
};

export type GenerationFixedSlot = {
  dayId: string;
  periodId: string;
  isLocked: boolean;
};

export type GenerationAssignment = {
  id: string;

  teacherId: string;
  teacherName: string;

  classId: string;
  className: string;

  subjectId: string;
  subjectName: string;

  assignedLessons: number;

  singlePeriods: number;
  doublePeriods: number;

  fixedSlots: GenerationFixedSlot[];
};

export type GenerationConstraint = {
  id: string;

  type: string;
  strength: string;

  valueInt: number | null;
  weight: number;

  teacherIds: string[];
  subjectIds: string[];
  classIds: string[];

  dayIds: string[];
  periodIds: string[];

  slots: Array<{
    dayId: string;
    periodId: string;
  }>;

  configJson?: Record<string, unknown>;
};

export type GenerationProblem = {
  projectId: string;

  days: GenerationDay[];
  periods: GenerationPeriod[];

  teachers: GenerationTeacher[];
  classes: GenerationClass[];
  subjects: GenerationSubject[];

  assignments: GenerationAssignment[];
  constraints: GenerationConstraint[];
};

export type GenerationTask = {
  id: string;

  assignmentId: string;

  teacherId: string;
  teacherName: string;

  classId: string;
  className: string;

  subjectId: string;
  subjectName: string;

  length: 1 | 2;

  fixedSlot?: GenerationFixedSlot;

  fixedDayId?: string;

  fixedSource?:
    | "FIXED_ASSIGNMENT"
    | "FIXED_ASSIGNMENT_JSON"
    | "FIXED_SUBJECT_DAY"
    | "FIXED_TEACHER_SLOT";

  blockNumber: number;
};

export type GeneratedSession = {
  temporaryId: string;

  blockId: string;
  blockIndex: number;
  blockLength: 1 | 2;

  assignmentId: string;

  teacherId: string;
  teacherName: string;

  classId: string;
  className: string;

  subjectId: string;
  subjectName: string;

  dayId: string;
  dayLabel: string;

  periodId: string;
  periodLabel: string;
  periodOrder: number;

  isLocked: boolean;

  source:
    | "GENERATED"
    | "FIXED_ASSIGNMENT"
    | "FIXED_ASSIGNMENT_JSON"
    | "FIXED_SUBJECT_DAY"
    | "FIXED_TEACHER_SLOT";

  placementScore: number;
};

export type GenerationDiagnostic = {
  code: string;

  level:
    | "ERROR"
    | "WARNING"
    | "INFO";

  title: string;
  description: string;

  taskId?: string;
  assignmentId?: string;
  constraintId?: string;
};

export type GenerationScoreBreakdown = {
  preferencePenalty: number;
  teacherGapPenalty: number;
  classGapPenalty: number;
  subjectSpreadPenalty: number;
  firstPeriodFairnessPenalty: number;
  lastPeriodFairnessPenalty: number;
  dailyLoadPenalty: number;
  totalPenalty: number;
  score: number;
};

export type GenerationValidationIssue = {
  code: string;
  message: string;
  entityId?: string;
};

export type GenerationValidationResult = {
  valid: boolean;

  hardViolationCount: number;

  issues:
    GenerationValidationIssue[];
};

export type GenerationAttemptResult = {
  complete: boolean;

  sessions:
    GeneratedSession[];

  requiredSessions: number;
  scheduledSessions: number;
  unscheduledSessions: number;

  completeness: number;

  softPenalty: number;
  score: number;

  scoreBreakdown:
    GenerationScoreBreakdown;

  validation:
    GenerationValidationResult;

  diagnostics:
    GenerationDiagnostic[];
};

export type GenerationResult = {
  success: boolean;

  seed: number;

  attemptCount: number;
  completedAttempts: number;

  durationMs: number;

  best:
    GenerationAttemptResult;

  diagnostics:
    GenerationDiagnostic[];
};

export type GenerationOptions = {
  seed: number;
  attempts: number;

  maxNodesPerAttempt?: number;
  maxCandidatesPerTask?: number;
};
