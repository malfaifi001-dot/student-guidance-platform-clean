const LEGACY_PRIMARY_WORKFLOW_TYPE = "default";
const PRIMARY_WORKFLOW_TYPE = "service-main";

export function normalizeWorkflowActivationType(type: string | null | undefined) {
  const normalized = String(type ?? "").trim().toLowerCase();

  if (!normalized || normalized === LEGACY_PRIMARY_WORKFLOW_TYPE) {
    return PRIMARY_WORKFLOW_TYPE;
  }

  return normalized;
}

export function getWorkflowActivationSlot(input: {
  serviceId: string;
  workflowType: string | null | undefined;
}) {
  return `${input.serviceId}:${normalizeWorkflowActivationType(input.workflowType)}`;
}

export function getWorkflowSlotTypeAliases(type: string | null | undefined) {
  const canonicalType = normalizeWorkflowActivationType(type);

  return canonicalType === PRIMARY_WORKFLOW_TYPE
    ? [PRIMARY_WORKFLOW_TYPE, LEGACY_PRIMARY_WORKFLOW_TYPE]
    : [canonicalType];
}

export function workflowBelongsToSlot(
  workflowType: string | null | undefined,
  slotType: string | null | undefined,
) {
  return (
    normalizeWorkflowActivationType(workflowType) ===
    normalizeWorkflowActivationType(slotType)
  );
}

export const PRIMARY_WORKFLOW_SLOT_TYPE = PRIMARY_WORKFLOW_TYPE;
