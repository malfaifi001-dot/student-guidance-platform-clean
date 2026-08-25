import { isActivityProgramServiceSlug } from "@/lib/activity-programs/activity-program-catalog";

/**
 * CaseValue keys produced by Teachix runtime infrastructure rather than by a
 * workflow DynamicField. These values are still explicit and validated; this
 * is not a general-purpose escape hatch for arbitrary submitted keys.
 */
const GLOBAL_SYSTEM_CASE_VALUE_KEYS = new Set([
  "selectedStudent",
  "selected_students_count",
  "selected_students_names_text",
  "selected_students_json",
  "primary_student_id",
  "studentSnapshot",
  "guardianSnapshot",
]);

const ACTIVITY_PROGRAM_CONTEXT_KEYS = new Set([
  "activity_domain",
  "activity_assignment_id",
  "assigned_teacher_name",
  "assigned_teacher_phone",
  "assigned_teacher_signature_url",
  "assigned_teacher_signed_name",
  "assigned_teacher_signed_at",
  "submission_source",
]);

const ACTIVITY_BROADCAST_CONTEXT_KEYS = new Set([
  "broadcast_schedule_items",
]);

export function isAllowedSystemCaseValueKey(
  serviceSlug: string,
  fieldKey: string,
) {
  if (GLOBAL_SYSTEM_CASE_VALUE_KEYS.has(fieldKey)) {
    return true;
  }

  if (
    isActivityProgramServiceSlug(serviceSlug) &&
    ACTIVITY_PROGRAM_CONTEXT_KEYS.has(fieldKey)
  ) {
    return true;
  }

  return (
    serviceSlug === "activity-programs-school-broadcast" &&
    ACTIVITY_BROADCAST_CONTEXT_KEYS.has(fieldKey)
  );
}

