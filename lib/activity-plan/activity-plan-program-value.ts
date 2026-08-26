const STORED_PROGRAM_PREFIX = "activity-plan:";
export const ACTIVITY_PLAN_OTHER_PROGRAM_VALUE = "__activity_plan_other__";

export function encodeActivityPlanProgramValue(serviceSlug: string, programName: string) {
  return `${STORED_PROGRAM_PREFIX}${serviceSlug}:${programName}`;
}

export function decodeActivityPlanProgramValue(value: string) {
  if (!value.startsWith(STORED_PROGRAM_PREFIX)) return null;
  const separator = value.indexOf(":", STORED_PROGRAM_PREFIX.length);
  if (separator < 0) return null;
  const serviceSlug = value.slice(STORED_PROGRAM_PREFIX.length, separator);
  const programName = value.slice(separator + 1).trim();
  return serviceSlug && programName ? { serviceSlug, programName, programValue: programName } : null;
}

export function getStoredActivityPlanProgramName(value: string) {
  return decodeActivityPlanProgramValue(value)?.programName || null;
}
