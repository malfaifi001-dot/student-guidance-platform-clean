export type TimefoldV1Day = {
  id: string;
  label: string;
  order: number;
};

export type TimefoldV1Period = {
  id: string;
  label: string;
  order: number;
};

export type TimefoldV1Teacher = {
  id: string;
  name: string;
  maxWeeklyLoad: number | null;
};

export type TimefoldV1Class = {
  id: string;
  name: string;
};

export type TimefoldV1Subject = {
  id: string;
  name: string;
};

export type TimefoldV1FixedSlot = {
  dayId: string;
  periodId: string;
  locked: boolean;
};

export type TimefoldV1Assignment = {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;

  assignedLessons: number;
  singlePeriods: number;
  doublePeriods: number;

  fixedSlots: TimefoldV1FixedSlot[];
};

export type TimefoldV1Constraint = {
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

  config: Record<string, unknown>;
};

export type TimefoldSolveRequestV1 = {
  contractVersion: "1";
  projectId: string;

  days: TimefoldV1Day[];
  periods: TimefoldV1Period[];

  teachers: TimefoldV1Teacher[];
  classes: TimefoldV1Class[];
  subjects: TimefoldV1Subject[];

  assignments: TimefoldV1Assignment[];
  constraints: TimefoldV1Constraint[];

  options: {
    seed: number | null;
    spentLimitSeconds: number | null;
  };
};

export type TimefoldOccupiedSlotV1 = {
  dayId: string;
  periodId: string;
  periodOrder: number;
};

export type TimefoldBlockResultV1 = {
  blockId: string;
  assignmentId: string;

  teacherId: string;
  classId: string;
  subjectId: string;

  length: number;

  startDayId: string | null;
  startPeriodId: string | null;

  occupiedSlots:
    TimefoldOccupiedSlotV1[];
};

export type TimefoldDiagnosticV1 = {
  code: string;
  message: string;
  entityId: string | null;
};

export type TimefoldSolveResultV1 = {
  contractVersion: string;
  engine: string;

  success: boolean;

  projectId: string;

  score: string | null;
  hardScore: number;
  softScore: number;

  requiredSessions: number;
  solvedSessions: number;
  blockCount: number;

  durationMs: number;

  blocks: TimefoldBlockResultV1[];

  diagnostics: TimefoldDiagnosticV1[];
};