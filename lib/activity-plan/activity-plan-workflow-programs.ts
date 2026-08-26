import "server-only";

import { getRuntimeWorkflowByServiceSlug } from "@/engine/runtime/runtime-resolver";
import { getActivityProgramDomainByServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { ACTIVITY_PLAN_OTHER_PROGRAM_VALUE } from "@/lib/activity-plan/activity-plan-program-value";

export type ActivityPlanWorkflowProgramOption = {
  value: string;
  label: string;
  isOther: boolean;
};

function isOtherOption(value: string, label: string) {
  const text = `${value} ${label}`.trim().toLowerCase();
  return text === "أخرى" || text === "اخرى" || text.includes("other");
}

export async function getActivityPlanWorkflowPrograms(serviceSlug: string) {
  const domain = getActivityProgramDomainByServiceSlug(serviceSlug);
  if (!domain) return null;

  const publishedWorkflow = await getRuntimeWorkflowByServiceSlug(domain.serviceSlug);
  if (!publishedWorkflow) return null;

  const fields = publishedWorkflow.workflow.steps.flatMap((step) => step.fields);
  const programField = fields.find((field) => field.key === "activity_program" && field.options.length > 0)
    || fields.find((field) => field.key.startsWith("activity_program_") && field.options.length > 0)
    || fields.find((field) => field.key !== "activity_domain" && field.label.includes("برنامج"));
  if (!programField) return null;

  const options = programField.options.map((option) => ({
    value: option.value,
    label: option.label,
    isOther: isOtherOption(option.value, option.label),
  }));
  if (programField.allowOther && !options.some((option) => option.isOther)) {
    options.push({ value: ACTIVITY_PLAN_OTHER_PROGRAM_VALUE, label: "أخرى", isOther: true });
  }

  return { domain, fieldKey: programField.key, options };
}

export function findActivityPlanWorkflowProgram(options: ActivityPlanWorkflowProgramOption[], value: string) {
  return options.find((option) => option.value === value || option.label === value) || null;
}
