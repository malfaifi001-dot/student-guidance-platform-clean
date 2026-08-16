"use client";

export const TIMETABLE_HISTORY_UPDATED_EVENT =
  "timetable-v3-history-updated";

export function notifyTimetableHistoryUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TIMETABLE_HISTORY_UPDATED_EVENT));
  }
}
