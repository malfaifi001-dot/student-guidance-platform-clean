import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getWorkflowActivationSlot,
  getWorkflowSlotTypeAliases,
} from "@/lib/workflows/workflow-slot";

export class WorkflowActivationConflictError extends Error {
  code = "WORKFLOW_ACTIVATION_CONFLICT" as const;

  constructor() {
    super("تعذر إتمام التفعيل بسبب طلب متزامن. حدّث الصفحة وحاول مرة أخرى.");
  }
}

type ActivationInput = {
  workflowId: string;
  actorUserId?: string | null;
  sourceAction: string;
  activityAction?: string;
  activityTitle?: string;
};

export async function activateWorkflow(input: ActivationInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const target = await tx.workflow.findUnique({
        where: { id: input.workflowId },
        include: { service: { select: { id: true, slug: true, name: true } } },
      });

      if (!target) throw new Error("WORKFLOW_NOT_FOUND");

      // Serializes every activation for this service. The unique activeKey is the
      // final guard across processes and concurrent requests.
      await tx.$queryRaw`SELECT id FROM Service WHERE id = ${target.serviceId} FOR UPDATE`;

      const canonicalSlot = getWorkflowActivationSlot(target);
      const slotAliases = getWorkflowSlotTypeAliases(target.workflowType);
      const previous = await tx.workflow.findMany({
        where: {
          serviceId: target.serviceId,
          id: { not: target.id },
          OR: [
            { workflowType: { in: slotAliases }, isActive: true },
            { workflowType: { in: slotAliases }, status: "ACTIVE" },
            { activeKey: canonicalSlot },
          ],
        },
        select: { id: true },
      });

      if (previous.length) {
        await tx.workflow.updateMany({
          where: { id: { in: previous.map((item) => item.id) } },
          data: { isActive: false, status: "ARCHIVED", activeKey: null },
        });
      }

      const workflow = await tx.workflow.update({
        where: { id: target.id },
        data: { isActive: true, status: "ACTIVE", activeKey: canonicalSlot },
      });

      await tx.platformActivityLog.create({
        data: {
          category: "WORKFLOW",
          action: input.activityAction ?? "WORKFLOW_ACTIVATED",
          severity: "INFO",
          title: input.activityTitle ?? "تم تفعيل Workflow",
          details: {
            serviceId: target.serviceId,
            serviceSlug: target.service.slug,
            targetWorkflowId: target.id,
            previousActiveWorkflowIds: previous.map((item) => item.id),
            workflowType: target.workflowType,
            canonicalSlot,
            actorUserId: input.actorUserId ?? null,
            sourceAction: input.sourceAction,
            activatedAt: new Date().toISOString(),
          },
        },
      });

      return { workflow, previousActiveWorkflowIds: previous.map((item) => item.id), canonicalSlot };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new WorkflowActivationConflictError();
    }
    throw error;
  }
}

export async function deactivateWorkflow(input: {
  workflowId: string;
  actorUserId?: string | null;
  sourceAction: string;
}) {
  return prisma.$transaction(async (tx) => {
    const workflow = await tx.workflow.findUnique({ where: { id: input.workflowId } });
    if (!workflow) throw new Error("WORKFLOW_NOT_FOUND");

    await tx.$queryRaw`SELECT id FROM Service WHERE id = ${workflow.serviceId} FOR UPDATE`;
    const updated = await tx.workflow.update({
      where: { id: workflow.id },
      data: { isActive: false, status: "ARCHIVED", activeKey: null },
    });

    await tx.platformActivityLog.create({
      data: {
        category: "WORKFLOW",
        action: "WORKFLOW_DEACTIVATED",
        severity: "INFO",
        title: "تم إلغاء تفعيل Workflow",
        details: {
          workflowId: workflow.id,
          serviceId: workflow.serviceId,
          actorUserId: input.actorUserId ?? null,
          sourceAction: input.sourceAction,
          deactivatedAt: new Date().toISOString(),
        },
      },
    });
    return updated;
  });
}
