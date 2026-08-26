export type TimetableImportSourceType = "EXCEL" | "IMAGE" | "PDF";

export type ImportedTimetableEntry = {
  teacherName: string;
  day: string;
  period: number;
  subjectName?: string | null;
  gradeName?: string | null;
  classroomName?: string | null;
  rawCell?: string | null;
  confidence?: number | null;
};

export type TimetableImportIssueSeverity = "WARNING" | "ERROR";

export type TimetableImportIssue = {
  severity: TimetableImportIssueSeverity;
  message: string;
  row?: number;
};

export type TimetableImportResult = {
  sourceType: TimetableImportSourceType;
  entries: ImportedTimetableEntry[];
  warnings: string[];
  issues: TimetableImportIssue[];
  confidence?: number | null;
  geometry?: {
    weekdayCount: number;
    periodColumnCount: number;
    teacherRowCount: number;
    cellCount: number;
  };
};

export type OcrExtraction = {
  text?: string;
  tables?: unknown;
  confidence?: number | null;
  pages?: OcrPage[];
  blocks?: OcrBlock[];
};

export type OcrBlock = {
  text: string;
  confidence?: number | null;
  box?: unknown;
  page?: number;
};

export type OcrPage = {
  page: number;
  text?: string;
  blocks?: OcrBlock[];
};
