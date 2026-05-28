export function createAutosavePayload(params: {
  workflowId: string;
  serviceId: string;
  values: Record<string, unknown>;
  studentId?: string | null;
}) {
  return {
    workflowId: params.workflowId,
    serviceId: params.serviceId,
    values: params.values,
    studentId: params.studentId || null,
    savedAt: new Date().toISOString(),
  };
}