import "server-only";

import type { DashboardContext } from "@/lib/auth/dashboard-context";
import { getDashboardContext } from "@/lib/auth/dashboard-context";
import { prisma } from "@/lib/prisma";
import { listIssuedReportSources } from "@/lib/statistics/statistics-issued-report-source";
import {
  ADMIN_INSIGHT_METRICS,
  type AdminInsightData,
  type AdminInsightMetric,
  type AdminInsightRow,
} from "./admin-insights-types";

const titles: Record<AdminInsightMetric, { title: string; description: string }> = {
  cases: { title: "الحالات", description: "الحالات الفعلية غير المؤرشفة في المنصة." },
  reports: { title: "التقارير", description: "التقارير النهائية المحفوظة، لا عمليات التصدير." },
  evidence: { title: "الشواهد", description: "إجمالي عناصر الشواهد والملفات المرفوعة." },
  users: { title: "المستخدمون النشطون", description: "المستخدمون الذين نفذوا نشاطًا خلال آخر 30 يومًا." },
  subscriptions: { title: "الاشتراكات", description: "توزيع سجلات الاشتراكات حسب حالتها الحالية." },
  accounts: { title: "المدارس والحسابات", description: "الحسابات النشطة مرتبة حسب النشاط التجاري المسجل." },
};

function rowsFromMap(map: Map<string, number>, labels = new Map<string, string>()): AdminInsightRow[] {
  return Array.from(map.entries())
    .sort((first, second) => second[1] - first[1])
    .slice(0, 20)
    .map(([key, value]) => ({ label: labels.get(key) || key, value }));
}

function ensureAdmin(context: DashboardContext | null): asserts context is DashboardContext {
  if (!context || !context.isAdmin) throw new Error("ADMIN access required");
}

async function reportRows(context: DashboardContext) {
  const [guidance, snapshots, active] = await Promise.all([
    prisma.guidanceReport.findMany({
      where: {
        OR: [
          { status: { in: ["GENERATED", "APPROVED"] } },
          { status: "ARCHIVED", OR: [{ approvedAt: { not: null } }, { generatedAt: { not: null } }] },
        ],
      },
      select: { caseEntryId: true },
    }),
    prisma.reportSnapshot.findMany({
      select: { caseEntryId: true },
    }),
    prisma.reportTwoActive.findMany({
      where: { status: "APPROVED", approvedAt: { not: null } },
      select: { caseEntryId: true },
    }),
  ]);

  const snapshotCases = new Set<string>();
  const latestSnapshots = snapshots.filter((row) => {
    if (snapshotCases.has(row.caseEntryId)) return false;
    snapshotCases.add(row.caseEntryId);
    return true;
  });
  const caseIds = Array.from(new Set([
    ...guidance.map((row) => row.caseEntryId),
    ...latestSnapshots.map((row) => row.caseEntryId),
    ...active.filter((row) => !snapshotCases.has(row.caseEntryId)).map((row) => row.caseEntryId),
  ]));
  const cases = await prisma.caseEntry.findMany({
    where: { id: { in: caseIds } },
    select: {
      id: true,
      createdBy: { select: { id: true, officialName: true, name: true, email: true } },
      schoolAccount: { select: { id: true, name: true } },
      service: { select: { id: true, name: true, slug: true } },
    },
  });
  const byId = new Map(cases.map((row) => [row.id, row]));
  return [
    ...guidance,
    ...latestSnapshots,
    ...active.filter((row) => !snapshotCases.has(row.caseEntryId)),
  ].map((row) => ({ ...row, caseEntry: byId.get(row.caseEntryId) })).filter((row) => row.caseEntry);
}

export async function getAdminInsightData(metric: AdminInsightMetric): Promise<AdminInsightData> {
  const context = await getDashboardContext();
  ensureAdmin(context);
  const meta = titles[metric];

  if (metric === "cases") {
    const [total, grouped, services] = await Promise.all([
      prisma.caseEntry.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.caseEntry.groupBy({ by: ["createdById"], where: { status: { not: "ARCHIVED" } }, _count: { _all: true }, orderBy: { _count: { createdById: "desc" } }, take: 20 }),
      prisma.caseEntry.groupBy({ by: ["serviceId"], where: { status: { not: "ARCHIVED" } }, _count: { _all: true }, orderBy: { _count: { serviceId: "desc" } }, take: 20 }),
    ]);
    const [users, serviceRows] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: grouped.map((row) => row.createdById).filter((id): id is string => Boolean(id)) } }, select: { id: true, officialName: true, name: true, email: true } }),
      prisma.service.findMany({ where: { id: { in: services.map((row) => row.serviceId) } }, select: { id: true, name: true, slug: true } }),
    ]);
    const userLabels = new Map(users.map((user) => [user.id, user.officialName || user.name || user.email]));
    const serviceLabels = new Map(serviceRows.map((service) => [service.id, service.name]));
    return { ...meta, metric, total, rows: [...rowsFromMap(new Map(grouped.map((row) => [row.createdById || "غير منسوب", row._count._all])), userLabels), ...rowsFromMap(new Map(services.map((row) => [row.serviceId, row._count._all])), serviceLabels)] };
  }

  if (metric === "reports") {
    const rows = await reportRows(context);
    const userMap = new Map<string, number>();
    const serviceMap = new Map<string, number>();
    for (const row of rows) {
      const owner = row.caseEntry?.createdBy;
      const service = row.caseEntry?.service;
      if (owner) userMap.set(owner.id, (userMap.get(owner.id) || 0) + 1);
      if (service) serviceMap.set(service.id, (serviceMap.get(service.id) || 0) + 1);
    }
    const [users, services] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: [...userMap.keys()] } }, select: { id: true, officialName: true, name: true, email: true } }),
      prisma.service.findMany({ where: { id: { in: [...serviceMap.keys()] } }, select: { id: true, name: true } }),
    ]);
    return { ...meta, metric, total: rows.length, rows: [...rowsFromMap(userMap, new Map(users.map((user) => [user.id, user.officialName || user.name || user.email]))), ...rowsFromMap(serviceMap, new Map(services.map((service) => [service.id, service.name])))] };
  }

  if (metric === "evidence") {
    const [workflow, caseEvidence, reportEvidence, uploaders] = await Promise.all([
      prisma.evidence.count(),
      prisma.caseEvidence.count(),
      prisma.reportEvidence.count(),
      prisma.caseEvidence.groupBy({ by: ["uploadedById"], _count: { _all: true }, orderBy: { _count: { uploadedById: "desc" } }, take: 20 }),
    ]);
    const users = await prisma.user.findMany({ where: { id: { in: uploaders.map((row) => row.uploadedById).filter((id): id is string => Boolean(id)) } }, select: { id: true, officialName: true, name: true, email: true } });
    return { ...meta, metric, total: workflow + caseEvidence + reportEvidence, rows: rowsFromMap(new Map(uploaders.map((row) => [row.uploadedById || "غير منسوب", row._count._all])), new Map(users.map((user) => [user.id, user.officialName || user.name || user.email]))) };
  }

  if (metric === "users") {
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const logs = await prisma.platformActivityLog.groupBy({ by: ["actorUserId"], where: { createdAt: { gte: from }, actorUserId: { not: null } }, _count: { _all: true }, orderBy: { _count: { actorUserId: "desc" } }, take: 20 });
    const users = await prisma.user.findMany({ where: { id: { in: logs.map((row) => row.actorUserId).filter((id): id is string => Boolean(id)) } }, select: { id: true, officialName: true, name: true, email: true } });
    return { ...meta, metric, total: logs.length, rows: rowsFromMap(new Map(logs.map((row) => [row.actorUserId || "", row._count._all])), new Map(users.map((user) => [user.id, user.officialName || user.name || user.email]))) };
  }

  if (metric === "subscriptions") {
    const groups = await prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } });
    return { ...meta, metric, total: groups.reduce((sum, row) => sum + row._count._all, 0), rows: groups.map((row) => ({ label: row.status === "ACTIVE" ? "نشطة" : row.status === "TRIAL" ? "تجريبية" : row.status === "PAST_DUE" ? "متأخرة" : row.status === "EXPIRED" ? "منتهية" : "ملغاة", value: row._count._all })).sort((a, b) => b.value - a.value) };
  }

  const [accounts, caseGroups, userGroups] = await Promise.all([
    prisma.schoolAccount.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.caseEntry.groupBy({ by: ["schoolAccountId"], where: { status: { not: "ARCHIVED" } }, _count: { _all: true } }),
    prisma.user.groupBy({ by: ["schoolAccountId"], where: { isActive: true, schoolAccountId: { not: null } }, _count: { _all: true } }),
  ]);
  const caseMap = new Map(caseGroups.map((row) => [row.schoolAccountId, row._count._all]));
  const userMap = new Map(userGroups.map((row) => [row.schoolAccountId || "", row._count._all]));
  const rows: AdminInsightRow[] = accounts.map((account) => ({ label: account.name, value: (caseMap.get(account.id) || 0) + (userMap.get(account.id) || 0), detail: `حالات: ${caseMap.get(account.id) || 0} · مستخدمون: ${userMap.get(account.id) || 0}` })).sort((a, b) => b.value - a.value).slice(0, 20);
  return { ...meta, metric, total: accounts.length, rows };
}

export function isAdminInsightMetric(value: string): value is AdminInsightMetric {
  return (ADMIN_INSIGHT_METRICS as readonly string[]).includes(value);
}
