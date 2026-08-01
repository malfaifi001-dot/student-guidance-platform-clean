import "dotenv/config";

import { prisma } from "../lib/prisma";
import { getWorkflowActivationSlot } from "../lib/workflows/workflow-slot";

const apply = process.argv.includes("--apply");

type WorkflowRow = Awaited<ReturnType<typeof loadWorkflows>>[number];

function loadWorkflows() {
  return prisma.workflow.findMany({
    where: { OR: [{ isActive: true }, { status: "ACTIVE" }, { activeKey: { not: null } }] },
    select: {
      id: true,
      serviceId: true,
      workflowType: true,
      version: true,
      status: true,
      isActive: true,
      activeKey: true,
      updatedAt: true,
      _count: { select: { cases: true } },
    },
  });
}

function compareWinner(a: WorkflowRow, b: WorkflowRow) {
  const aCurrent = a.workflowType === "service-main" ? 1 : 0;
  const bCurrent = b.workflowType === "service-main" ? 1 : 0;
  return (
    bCurrent - aCurrent ||
    b.version - a.version ||
    b.updatedAt.getTime() - a.updatedAt.getTime() ||
    b.id.localeCompare(a.id)
  );
}

async function main() {
  const workflows = await loadWorkflows();
  const groups = new Map<string, WorkflowRow[]>();
  for (const workflow of workflows) {
    const slot = getWorkflowActivationSlot(workflow);
    groups.set(slot, [...(groups.get(slot) ?? []), workflow]);
  }

  let changedGroups = 0;
  for (const [slot, rows] of groups) {
    const ordered = [...rows].sort(compareWinner);
    const winner = ordered[0];
    const losers = ordered.slice(1);
    const needsRepair =
      losers.length > 0 ||
      !winner.isActive ||
      winner.status !== "ACTIVE" ||
      winner.activeKey !== slot;
    if (!needsRepair) continue;

    changedGroups += 1;
    console.log(JSON.stringify({
      slot,
      winner: { id: winner.id, type: winner.workflowType, version: winner.version, linkedCases: winner._count.cases },
      deactivate: losers.map((item) => ({ id: item.id, type: item.workflowType, version: item.version, linkedCases: item._count.cases })),
      mode: apply ? "apply" : "dry-run",
    }, null, 2));

    if (apply) {
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM Service WHERE id = ${winner.serviceId} FOR UPDATE`;
        if (losers.length) {
          await tx.workflow.updateMany({
            where: { id: { in: losers.map((item) => item.id) } },
            data: { isActive: false, status: "ARCHIVED", activeKey: null },
          });
        }
        await tx.workflow.update({
          where: { id: winner.id },
          data: { isActive: true, status: "ACTIVE", activeKey: slot },
        });
        await tx.platformActivityLog.create({
          data: {
            category: "WORKFLOW",
            action: "WORKFLOW_ACTIVE_INVARIANT_REPAIRED",
            severity: "WARNING",
            title: "تم إصلاح تعارض Workflow نشط",
            details: {
              slot,
              winnerWorkflowId: winner.id,
              deactivatedWorkflowIds: losers.map((item) => item.id),
              repairedAt: new Date().toISOString(),
            },
          },
        });
      });
    }
  }

  console.log(`${apply ? "Applied" : "Dry run"}: ${changedGroups} slot(s) require repair.`);
}

main()
  .catch((error) => {
    console.error("WORKFLOW_REPAIR_FAILED", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
