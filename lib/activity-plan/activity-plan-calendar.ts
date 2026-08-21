import { SEMESTER_ONE_WEEKS } from "@/lib/academic-calendar/academic-calendar-data";

export const ACTIVITY_PLAN_DAYS = [
  { dayOfWeek: 0, label: "الأحد" },
  { dayOfWeek: 1, label: "الاثنين" },
  { dayOfWeek: 2, label: "الثلاثاء" },
  { dayOfWeek: 3, label: "الأربعاء" },
  { dayOfWeek: 4, label: "الخميس" },
] as const;

export const ACTIVITY_PLAN_PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;

const periodLabels = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة"] as const;

export function getActivityPlanWeekStart(weekNumber: number) {
  const configured = SEMESTER_ONE_WEEKS.find(
    (week) => week.kind === "STUDY_WEEK" && week.weekNumber === weekNumber,
  );
  if (configured) return configured.gregorianStart;

  const first = SEMESTER_ONE_WEEKS.find((week) => week.kind === "STUDY_WEEK");
  if (!first) return null;

  const start = new Date(`${first.gregorianStart}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + (weekNumber - 1) * 7);
  return start.toISOString().slice(0, 10);
}

export function getActivityPlanDates(weekNumber: number) {
  const start = getActivityPlanWeekStart(weekNumber);
  if (!start) return [];
  const date = new Date(`${start}T00:00:00.000Z`);
  return ACTIVITY_PLAN_DAYS.map((day, index) => {
    const current = new Date(date);
    current.setUTCDate(date.getUTCDate() + index);
    return { ...day, date: current.toISOString().slice(0, 10) };
  });
}

export function formatActivityPlanDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function getPeriodLabel(periodNumber: number) {
  return `الحصة ${periodLabels[periodNumber - 1] ?? periodNumber}`;
}

export function isValidActivityPlanSlot(week: number, day: number, period: number) {
  return week >= 1 && week <= 20 && day >= 0 && day <= 4 && period >= 1 && period <= 7;
}
