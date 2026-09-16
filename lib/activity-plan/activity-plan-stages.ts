import { SAUDI_SCHOOL_GRADES, SAUDI_SCHOOL_STAGES } from "@/lib/timetable/catalog/saudi-school-grades";

const stageLabels: string[] = SAUDI_SCHOOL_STAGES.map((stage) => stage.label);

export function normalizeActivityPlanStage(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text) return null;
  const key = text.toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "primary" || key === "primary_stage") return stageLabels[0];
  if (key === "intermediate" || key === "middle" || key === "middle_stage" || key === "intermediate_stage") return stageLabels[1];
  if (key === "secondary" || key === "high" || key === "secondary_stage" || key === "high_stage") return stageLabels[2];
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
  if (assignedStages.length) return assignedStages;

  const fallbackStages = getActivityPlanStageOptions(fallbackValues);
  return fallbackStages.length ? fallbackStages : [...stageLabels];
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

export const ACTIVITY_PLAN_SECTIONS = ["أ", "ب", "ج", "د", "هـ", "و", "ز"] as const;

export function getActivityPlanGradeOptions(stage: string) {
  const normalized = normalizeActivityPlanStage(stage);
  const stageKey = SAUDI_SCHOOL_STAGES.find((item) => item.label === normalized)?.key;
  return stageKey ? SAUDI_SCHOOL_GRADES.filter((grade) => grade.stageKey === stageKey).map((grade) => grade.label) : [];
}
