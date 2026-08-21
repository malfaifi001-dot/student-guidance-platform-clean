export const ACTIVITY_PLAN_PROGRAM_OPTIONS = [
  { key: "citizenship-life", title: "المواطنة والحياة", colorClass: "border-amber-200 bg-amber-50 text-amber-950", printColorClass: "border-amber-700 bg-amber-500 text-amber-950" },
  { key: "science-technology", title: "العلوم والتقنية", colorClass: "border-sky-200 bg-sky-50 text-sky-950", printColorClass: "border-blue-800 bg-blue-700 text-white" },
  { key: "culture-arts", title: "الثقافة والفنون", colorClass: "border-cyan-200 bg-cyan-50 text-cyan-950", printColorClass: "border-teal-700 bg-teal-600 text-white" },
  { key: "sports-health", title: "الرياضة والصحة", colorClass: "border-rose-200 bg-rose-50 text-rose-950", printColorClass: "border-red-700 bg-red-600 text-white" },
  { key: "scouting", title: "النشاط الكشفي", colorClass: "border-orange-200 bg-orange-50 text-orange-950", printColorClass: "border-orange-700 bg-orange-600 text-white" },
  { key: "events-occasions", title: "الأيام والمناسبات", colorClass: "border-emerald-200 bg-emerald-50 text-emerald-950", printColorClass: "border-emerald-700 bg-emerald-600 text-white" },
] as const;

export function getActivityPlanProgramByKey(key: string) {
  return ACTIVITY_PLAN_PROGRAM_OPTIONS.find((program) => program.key === key) ?? null;
}
