import {
  getWorkflowServiceOwnerRole,
  WORKFLOW_SERVICE_OWNER_LABELS,
  WORKFLOW_SERVICE_OWNER_ROLES,
  type WorkflowServiceOwnerRole,
} from "@/lib/constants/services";

export type WorkflowBoardId = "all" | WorkflowServiceOwnerRole;

export interface BoardDef {
  id: WorkflowBoardId;
  label: string;
}

export const BOARDS: BoardDef[] = [
  { id: "all", label: "الكل" },
  ...WORKFLOW_SERVICE_OWNER_ROLES.map((role) => ({
    id: role,
    label: WORKFLOW_SERVICE_OWNER_LABELS[role],
  })),
];

export function classifyServiceSlug(slug: string) {
  return getWorkflowServiceOwnerRole(slug);
}

export function filterServicesByBoard<T extends { slug: string }>(
  services: T[],
  boardId: WorkflowBoardId,
): T[] {
  if (boardId === "all") return services;
  return services.filter((s) => classifyServiceSlug(s.slug) === boardId);
}
