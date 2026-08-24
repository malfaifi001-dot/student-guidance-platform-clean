import type { WorkflowServiceOwnerRole } from "@/lib/constants/services";
import {
  ensureDashboardWorkflowServicesForRole,
  getWorkflowUploadServicesForRole,
} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";
import { prisma } from "@/lib/prisma";
import { getWorkflowActivationSlot } from "@/lib/workflows/workflow-slot";

export type AdminWorkflowServiceSummary = {
  slug: string;
  title: string;
  description: string;
  workflows: Array<{
    id: string;
    name: string;
    version: number;
    status: string;
    isActive: boolean;
    workflowType: string;
    activeKey: string | null;
    updatedAt: Date;
  }>;
};

export async function getAdminWorkflowServicesForRole(
  role: WorkflowServiceOwnerRole,
) {
  const roleServices = getWorkflowUploadServicesForRole(role);

  await ensureDashboardWorkflowServicesForRole(role);

  const services = await prisma.service.findMany({
    where: {
      slug: { in: roleServices.map((service) => service.slug) },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
    },
  });

  const serviceIds = services.map((service) => service.id);
  const workflowSelect = {
    id: true,
    serviceId: true,
    name: true,
    version: true,
    status: true,
    isActive: true,
    workflowType: true,
    activeKey: true,
    updatedAt: true,
  } as const;

  const [latestWorkflows, activeWorkflows] = await Promise.all([
    prisma.workflow.findMany({
      where: { serviceId: { in: serviceIds } },
      select: workflowSelect,
      orderBy: { updatedAt: "desc" },
      distinct: ["serviceId"],
    }),
    prisma.workflow.findMany({
      where: {
        serviceId: { in: serviceIds },
        isActive: true,
        status: "ACTIVE",
      },
      select: workflowSelect,
      orderBy: { updatedAt: "desc" },
      distinct: ["serviceId"],
    }),
  ]);

  const workflowsByServiceId = new Map<string, typeof latestWorkflows>();
  for (const workflow of [...latestWorkflows, ...activeWorkflows]) {
    const current = workflowsByServiceId.get(workflow.serviceId) || [];
    if (!current.some((item) => item.id === workflow.id)) current.push(workflow);
    workflowsByServiceId.set(workflow.serviceId, current);
  }

  const serviceOrder = new Map(
    roleServices.map((service, index) => [service.slug, index]),
  );

  return services
    .sort(
      (left, right) =>
        (serviceOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
        (serviceOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
    )
    .map((service) => ({
      slug: service.slug,
      title: service.name,
      description: service.description || "",
      workflows: (workflowsByServiceId.get(service.id) || []).map((workflow) => ({
        ...workflow,
        status: String(workflow.status),
        activeKey: workflow.activeKey,
        isActive:
          workflow.isActive &&
          String(workflow.status) === "ACTIVE" &&
          workflow.activeKey ===
            getWorkflowActivationSlot({
              serviceId: service.id,
              workflowType: workflow.workflowType,
            }),
      })),
    })) satisfies AdminWorkflowServiceSummary[];
}
