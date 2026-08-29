import { SAUDI_SCHOOL_STAGES } from "@/lib/timetable/catalog/saudi-school-grades";

const stageLabels: string[] = SAUDI_SCHOOL_STAGES.map((stage) => stage.label);

export function normalizeActivityPlanStage(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text === "primary") return stageLabels[0];
  if (text === "intermediate" || text === "middle") return stageLabels[1];
  if (text === "secondary" || text === "high") return stageLabels[2];
  if (text.includes("ابتدائي") || text.includes("ابتدائية")) return stageLabels[0];
  if (text.includes("متوسط")) return stageLabels[1];
  if (text.includes("ثانوي") || text.includes("ثانوية")) return stageLabels[2];
  return text;
}

export function getActivityPlanStageOptions(values: Array<string | null | undefined>) {
  const options: string[] = [];
  for (const value of values) {
    const normalized = normalizeActivityPlanStage(value);
    if (normalized && stageLabels.includes(normalized) && !options.includes(normalized)) options.push(normalized);
  }
  return options;
}

export function getActivityPlanStagesForActivityLeader(teachingStages: unknown, fallbackValues: Array<string | null | undefined>) {
  const assignedValues = Array.isArray(teachingStages)
    ? teachingStages.filter((value): value is string => typeof value === "string")
    : [];
  const assignedStages = getActivityPlanStageOptions(assignedValues);
  return assignedStages.length ? assignedStages : getActivityPlanStageOptions(fallbackValues);
}

export function getActivityPlanStagesFromProfile(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text) return [];
  const stages: string[] = [];
  for (const stage of stageLabels) {
    const marker = stage.replace(/^المرحلة\s+/, "");
    if (text.includes(marker) || normalizeActivityPlanStage(text) === stage) stages.push(stage);
  }
  return stages;
}

export const REAL_ACTIVITY_PLAN_STAGES = stageLabels;
