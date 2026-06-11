import { prisma } from "@/lib/prisma";

export type HealthStatus = "CLEAR" | "WARNING" | "DANGER";

export interface HealthMetric {
  key: string;
  label: string;
  count: number;
  status: HealthStatus;
  description: string;
  href?: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  category: string;
  action: string;
  severity: string;
  title: string;
  details: unknown;
  createdAt: Date;
}

export interface SystemHealthReport {
  generatedAt: string;
  overallStatus: HealthStatus;
  metrics: HealthMetric[];
  recentActivity: AuditLogEntry[];
}

function computeStatus(count: number, dangerThreshold: number, warningThreshold: number): HealthStatus {
  if (count >= dangerThreshold) return "DANGER";
  if (count >= warningThreshold) return "WARNING";
  return "CLEAR";
}

function overallStatus(metrics: HealthMetric[]): HealthStatus {
  if (metrics.some((m) => m.status === "DANGER")) return "DANGER";
  if (metrics.some((m) => m.status === "WARNING")) return "WARNING";
  return "CLEAR";
}

export async function generateSystemHealthReport(): Promise<SystemHealthReport> {
  const now = new Date();

  const [
    noSubscriptionCount,
    expiredSubscriptionCount,
    servicesWithoutActiveWorkflow,
    draftWorkflowCount,
    submittedAssignmentsCount,
    recentLogs,
  ] = await Promise.all([
    prisma.schoolAccount.count({
      where: {
        isActive: true,
        subscription: null,
      },
    }),

    prisma.subscription.count({
      where: {
        status: { in: ["EXPIRED", "CANCELED"] },
      },
    }),

    prisma.service.count({
      where: {
        status: "ACTIVE",
        workflows: {
          none: {
            status: "ACTIVE",
            isActive: true,
          },
        },
      },
    }),

    prisma.workflow.count({
      where: {
        status: "DRAFT",
      },
    }),

    prisma.activityAssignment.count({
      where: {
        status: "SUBMITTED",
      },
    }),

    prisma.platformActivityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const metrics: HealthMetric[] = [
    {
      key: "no-subscription",
      label: "حسابات بدون اشتراك",
      count: noSubscriptionCount,
      status: computeStatus(noSubscriptionCount, 10, 1),
      description: "حسابات مدارس نشطة ليس لها اشتراك فعال",
      href: "/dashboard/admin/subscribers",
    },
    {
      key: "expired-subscriptions",
      label: "اشتراكات منتهية",
      count: expiredSubscriptionCount,
      status: computeStatus(expiredSubscriptionCount, 5, 1),
      description: "اشتراكات بحالة منتهية أو ملغية",
      href: "/dashboard/admin/subscriptions",
    },
    {
      key: "services-without-workflow",
      label: "خدمات بدون Workflow منشور",
      count: servicesWithoutActiveWorkflow,
      status: computeStatus(servicesWithoutActiveWorkflow, 3, 1),
      description: "خدمات نشطة لا يوجد لها Workflow منشور ومعتمد",
      href: "/dashboard/admin/workflows",
    },
    {
      key: "draft-workflows",
      label: "Workflows بحالة مسودة",
      count: draftWorkflowCount,
      status: computeStatus(draftWorkflowCount, 10, 1),
      description: "نماذج Workflow لم تنشر بعد",
      href: "/dashboard/admin/workflow-builder",
    },
    {
      key: "submitted-assignments",
      label: "تكليفات بانتظار الاعتماد",
      count: submittedAssignmentsCount,
      status: computeStatus(submittedAssignmentsCount, 10, 1),
      description: "تكليفات معلمين في ريادة النشاط بحالة SUBMITTED وتحتاج اعتماد",
      href: "/dashboard/admin/activity",
    },
  ];

  const recentActivity: AuditLogEntry[] = recentLogs.map((log) => ({
    id: log.id,
    actorUserId: log.actorUserId,
    category: log.category,
    action: log.action,
    severity: log.severity,
    title: log.title,
    details: log.details,
    createdAt: log.createdAt,
  }));

  return {
    generatedAt: now.toISOString(),
    overallStatus: overallStatus(metrics),
    metrics,
    recentActivity,
  };
}
