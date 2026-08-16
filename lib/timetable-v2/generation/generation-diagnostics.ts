export type TimetableGenerationPhase =
  | "PREPARE"
  | "READINESS"
  | "FEASIBILITY"
  | "SOLVER_REQUEST"
  | "SOLVER"
  | "VALIDATION"
  | "PERSISTENCE"
  | "COMPLETED";

export type TimetableGenerationStatus =
  | "START"
  | "OK"
  | "FAILED";

export type TimetableGenerationDiagnostics = {
  requestId: string;
  projectId: string;
  phase: TimetableGenerationPhase;
  status: TimetableGenerationStatus;
  durationMs?: number;
  score?: string | number | null;
  hardViolations?: number;
  softPenalty?: number;
  sessions?: number;
  errorCode?: string;
};

export function createTimetableGenerationRequestId() {
  return Math.random().toString(36).slice(2, 8);
}

export function logTimetableGeneration(
  diagnostics: TimetableGenerationDiagnostics,
) {
  const details = [
    diagnostics.durationMs === undefined
      ? null
      : `${diagnostics.durationMs}ms`,
    diagnostics.score === undefined
      ? null
      : `score=${diagnostics.score}`,
    diagnostics.hardViolations === undefined
      ? null
      : `hard=${diagnostics.hardViolations}`,
    diagnostics.softPenalty === undefined
      ? null
      : `soft=${diagnostics.softPenalty}`,
    diagnostics.sessions === undefined
      ? null
      : `sessions=${diagnostics.sessions}`,
    diagnostics.errorCode
      ? `code=${diagnostics.errorCode}`
      : null,
  ].filter(Boolean).join(" ");

  console.info(
    `[TIMETABLE] ${diagnostics.requestId} ${diagnostics.phase} ${diagnostics.status}${details ? ` ${details}` : ""}`,
  );
}
