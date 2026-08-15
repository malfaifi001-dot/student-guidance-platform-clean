export type TimetableV3ScheduleViewScope =
  | { mode: "full" }
  | { mode: "teacher"; teacherId: string };

export function filterTimetableV3ScheduleEntries<
  T extends { teacherId: string },
>(
  entries: T[],
  scope: TimetableV3ScheduleViewScope,
) {
  return scope.mode === "teacher"
    ? entries.filter((entry) => entry.teacherId === scope.teacherId)
    : entries;
}
