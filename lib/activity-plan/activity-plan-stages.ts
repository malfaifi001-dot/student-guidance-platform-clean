import { SAUDI_SCHOOL_STAGES } from "@/lib/timetable/catalog/saudi-school-grades";

export const UNSPECIFIED_ACTIVITY_PLAN_STAGE = "غير محددة";

const stageLabels = SAUDI_SCHOOL_STAGES.map((stage) => stage.label);

export function normalizeActivityPlanStage(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text === UNSPECIFIED_ACTIVITY_PLAN_STAGE) return UNSPECIFIED_ACTIVITY_PLAN_STAGE;
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
    if (normalized && !options.includes(normalized)) options.push(normalized);
  }
  return options;
}

export function getActivityPlanStagesFromProfile(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text) return [];
  const stages: string[] = [];
  for (const stage of stageLabels) {
    const marker = stage.replace(/^المرحلة\s+/, "");
    if (text.includes(marker) || normalizeActivityPlanStage(text) === stage) stages.push(stage);
  }
  return stages.length ? stages : [text];
}

