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

export type TimetableAiImportResult = {
  mode: TimetableAiImportMode;

  summary: string;

  assumptions: string[];

  alternatives: string[];

  stages: TimetableAiImportStage[];

  classes: Array<{
    name: string;
    stage: TimetableAiImportStage | null;
    grade: string | null;
    source: TimetableAiSource;
    confidence: number;
  }>;

  subjects: Array<{
    name: string;
    stageIds: TimetableAiImportStage[];
    weeklyLessons: number | null;
    source: TimetableAiSource;
    confidence: number;
  }>;

  teachers: Array<{
    name: string;
    specialty: string | null;
    maxWeeklyLoad: number | null;
    source: TimetableAiSource;
    confidence: number;
  }>;

  assignments: Array<{
    teacherName: string;
    subjectName: string;
    className: string;
    weeklyLessons: number | null;
    source: TimetableAiSource;
    confidence: number;
  }>;

  constraintCandidates: Array<{
    text: string;
    teacherName: string | null;
    subjectName: string | null;
    className: string | null;
    suggestedType: string | null;
    source: TimetableAiSource;
    confidence: number;
  }>;

  warnings: string[];

  uncertainFields: Array<{
    entity: string;
    field: string;
    value: string | null;
    reason: string;
  }>;
};
