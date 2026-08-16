export type TimetableAiImportStage =
  | "ELEMENTARY"
  | "MIDDLE"
  | "HIGH";

export type TimetableAiImportMode =
  | "EXTRACT"
  | "PROPOSE";

export type TimetableAiSource =
  | "USER"
  | "AI_PROPOSAL";

export type TimetableAiImportUncertainField = {
  entity: string;
  field: string;
  value: string | null;
  reason: string;
};

export type TimetableAiImportClass = {
  name: string;
  stage: TimetableAiImportStage | null;
  grade: string | null;
  source: TimetableAiSource;
  confidence: number;
};

export type TimetableAiImportSubject = {
  name: string;
  stageIds: TimetableAiImportStage[];
  weeklyLessons: number | null;
  source: TimetableAiSource;
  confidence: number;
};

export type TimetableAiImportTeacher = {
  name: string;
  specialty: string | null;
  maxWeeklyLoad: number | null;
  source: TimetableAiSource;
  confidence: number;
};

export type TimetableAiImportAssignment = {
  teacherName: string;
  subjectName: string;
  className: string;
  weeklyLessons: number | null;
  source: TimetableAiSource;
  confidence: number;
};

export type TimetableAiImportConstraintCandidate = {
  text: string;
  teacherName: string | null;
  subjectName: string | null;
  className: string | null;
  suggestedType: string | null;
  source: TimetableAiSource;
  confidence: number;
};

export type TimetableAiImportResult = {
  mode: TimetableAiImportMode;
  summary: string;

  assumptions: string[];
  alternatives: string[];

  stages: TimetableAiImportStage[];

  classes: TimetableAiImportClass[];
  subjects: TimetableAiImportSubject[];
  teachers: TimetableAiImportTeacher[];
  assignments: TimetableAiImportAssignment[];

  constraintCandidates:
    TimetableAiImportConstraintCandidate[];

  warnings: string[];

  uncertainFields:
    TimetableAiImportUncertainField[];
};