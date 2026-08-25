export type BroadcastScheduleParsedRow = {
  id?: string;
  week?: unknown;
  day?: unknown;
  date?: unknown;
  grade?: unknown;
  classroom?: unknown;
  topic?: unknown;
  responsible?: unknown;
};

const MAX_BROADCAST_ROWS = 100;

export const BROADCAST_SCHEDULE_ROW_FIELD_KEYS = {
  week: "broadcast_week",
  day: "broadcast_day",
  date: "broadcast_date",
  grade: "broadcast_grade",
  classroom: "broadcast_classroom",
  topic: "broadcast_topic",
  responsible: "broadcast_responsible",
} as const;

export function parseBroadcastScheduleRows(
  value: unknown,
): BroadcastScheduleParsedRow[] | null {
  let parsed = value;

  if (typeof parsed === "string") {
    const text = parsed.trim();
    if (!text) return [];

    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(parsed)) return null;

  return parsed
    .filter(
      (row): row is Record<string, unknown> =>
        Boolean(row && typeof row === "object" && !Array.isArray(row)),
    )
    .slice(0, MAX_BROADCAST_ROWS)
    .map((row) => ({
      id: typeof row.id === "string" ? row.id : undefined,
      week: row.week,
      day: row.day,
      date: row.date,
      grade: row.grade,
      classroom: row.classroom,
      topic: row.topic,
      responsible: row.responsible,
    }));
}

