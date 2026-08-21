export const ACTIVITY_PLAN_PROGRAM_OPTIONS = [
  { key: "citizenship-life", title: "المواطنة والحياة", colorClass: "border-amber-200 bg-amber-50 text-amber-950", printColorClass: "border-amber-800 text-white", backgroundColor: "#F4B000" },
  { key: "science-technology", title: "العلوم والتقنية", colorClass: "border-sky-200 bg-sky-50 text-sky-950", printColorClass: "border-blue-900 text-white", backgroundColor: "#1D4ED8" },
  { key: "culture-arts", title: "الثقافة والفنون", colorClass: "border-cyan-200 bg-cyan-50 text-cyan-950", printColorClass: "border-teal-800 text-white", backgroundColor: "#0F9F9A" },
  { key: "sports-health", title: "الرياضة والصحة", colorClass: "border-rose-200 bg-rose-50 text-rose-950", printColorClass: "border-red-800 text-white", backgroundColor: "#DC2626" },
  { key: "scouting", title: "النشاط الكشفي", colorClass: "border-orange-200 bg-orange-50 text-orange-950", printColorClass: "border-orange-800 text-white", backgroundColor: "#EA580C" },
  { key: "events-occasions", title: "الأيام والمناسبات", colorClass: "border-emerald-200 bg-emerald-50 text-emerald-950", printColorClass: "border-emerald-800 text-white", backgroundColor: "#0F9F63" },
] as const;

export function getActivityPlanProgramByKey(key: string) {
  return ACTIVITY_PLAN_PROGRAM_OPTIONS.find((program) => program.key === key) ?? null;
}
