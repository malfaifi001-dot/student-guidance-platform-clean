const STORED_PROGRAM_PREFIX = "activity-plan:";
export const ACTIVITY_PLAN_OTHER_PROGRAM_VALUE = "__activity_plan_other__";

export type ActivityPlanEntryMeta = {
  section?: string;
  subject?: string;
  materialType?: "أساسية" | "10%";
};

export function encodeActivityPlanProgramValue(serviceSlug: string, programName: string, meta?: ActivityPlanEntryMeta) {
  const suffix = meta && Object.values(meta).some(Boolean)
    ? `|meta=${encodeURIComponent(JSON.stringify(meta))}`
    : "";
  return `${STORED_PROGRAM_PREFIX}${serviceSlug}:${programName}${suffix}`;
}

export function decodeActivityPlanProgramValue(value: string) {
  if (!value.startsWith(STORED_PROGRAM_PREFIX)) return null;
  const separator = value.indexOf(":", STORED_PROGRAM_PREFIX.length);
  if (separator < 0) return null;
  const serviceSlug = value.slice(STORED_PROGRAM_PREFIX.length, separator);
  const rawProgram = value.slice(separator + 1).trim();
  const [programName, metaValue] = rawProgram.split("|meta=", 2);
  let meta: ActivityPlanEntryMeta = {};
  if (metaValue) {
    try { meta = JSON.parse(decodeURIComponent(metaValue)) as ActivityPlanEntryMeta; } catch { meta = {}; }
  }
  return serviceSlug && programName ? { serviceSlug, programName, programValue: programName, ...meta } : null;
}

export function getStoredActivityPlanProgramName(value: string) {
  return decodeActivityPlanProgramValue(value)?.programName || null;
}

export function formatActivityPlanEntryLabel(domainTitle?: string | null, programName?: string | null) {
  const domain = String(domainTitle || "").trim();
  const program = String(programName || "").trim();
  if (domain && program) return `${domain} / ${program}`;
  return domain || program;
}
