import "server-only";

import { prisma } from "@/lib/prisma";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { TEACHER_PORTFOLIO_SERVICE_SLUGS } from "@/lib/portfolio/portfolio-performance-elements";
import { ACTIVITY_PROGRAM_DOMAIN_SERVICE_SLUGS } from "@/lib/activity-programs/activity-program-catalog";
import { STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG } from "@/lib/activity-competitions/activity-competitions-service";

export const SPECIAL_REPORT_SOURCE_TYPE = "SPECIAL_REPORT_CASE" as const;
export const TEACHER_SERVICE_TARGET_TYPE = "TEACHER_SERVICE" as const;
export const ACTIVITY_SERVICE_TARGET_TYPE = "ACTIVITY_SERVICE" as const;
export const LEGACY_ACTIVITY_PROGRAM_TARGET_TYPE = "ACTIVITY_PROGRAM" as const;
export const ACTIVITY_LEADER_SERVICE_SLUGS = [...ACTIVITY_PROGRAM_DOMAIN_SERVICE_SLUGS, STUDENT_ACTIVITY_COMPETITIONS_SERVICE_SLUG] as const;

export type SpecialReportLinkRole = "TEACHER" | "ACTIVITY_LEADER";
export type SpecialReportLinkedContext = { targetId: string; targetType: string; title: string };

function targetTypeForRole(role: SpecialReportLinkRole) {
  return role === "TEACHER" ? TEACHER_SERVICE_TARGET_TYPE : ACTIVITY_SERVICE_TARGET_TYPE;
}

export async function requireSpecialReportLinkAccess(userId: string, role: string, schoolAccountId: string | null) {
  if (role !== "TEACHER" && role !== "ACTIVITY_LEADER") throw new Error("هذا الربط متاح للمعلم وقائد النشاط فقط.");
  if (!schoolAccountId) throw new Error("لا يوجد نطاق مدرسة صالح.");
  const access = await requireServiceAccessApi("special-report", { allowPrincipal: false });
  if (access) throw new Error("لا تملك صلاحية استخدام خدمة التقارير المخصصة.");
  return { userId, schoolAccountId, role: role as SpecialReportLinkRole, targetType: targetTypeForRole(role as SpecialReportLinkRole) };
}

export async function getApprovedSpecialReportCase(caseId: string, userId: string, schoolAccountId: string) {
  const item = await prisma.caseEntry.findFirst({
    where: { id: caseId, schoolAccountId, createdById: userId, service: { slug: "special-report" } },
    select: { id: true, title: true, serviceId: true },
  });
  if (!item) return null;

  const [active, snapshot, guidance] = await Promise.all([
    prisma.reportTwoActive.findFirst({ where: { caseEntryId: caseId, schoolAccountId, status: "APPROVED" }, select: { id: true } }),
    prisma.reportSnapshot.findFirst({ where: { caseEntryId: caseId, OR: [{ schoolAccountId }, { schoolAccountId: null }] }, select: { id: true } }),
    prisma.guidanceReport.findFirst({ where: { caseEntryId: caseId, status: "APPROVED" }, select: { id: true } }),
  ]);
  if (!active && !snapshot && !guidance) return null;
  const approvedReport = active
    ? { id: active.id, type: "REPORT_TWO_ACTIVE" as const }
    : snapshot
      ? { id: snapshot.id, type: "REPORT_SNAPSHOT" as const }
      : guidance
        ? { id: guidance.id, type: "GUIDANCE_REPORT" as const }
        : null;
  return { ...item, approvedReportId: approvedReport?.id || null, approvedReportType: approvedReport?.type || null };
}

export async function listSpecialReportLinkTargets(role: SpecialReportLinkRole, userId: string, schoolAccountId: string) {
  if (role === "TEACHER") {
    const services = await prisma.service.findMany({
      where: { slug: { in: [...TEACHER_PORTFOLIO_SERVICE_SLUGS] }, status: "ACTIVE" },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });
    return services.map((item) => ({ id: item.id, title: item.name, subtitle: item.slug }));
  }

  const services = await prisma.service.findMany({
    where: { slug: { in: [...ACTIVITY_LEADER_SERVICE_SLUGS] }, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return services.map((item) => ({ id: item.id, title: item.name }));
}

export async function getSpecialReportLink(caseId: string, role: SpecialReportLinkRole, schoolAccountId: string) {
  const link = await prisma.dashboardResourceLink.findFirst({ where: { schoolAccountId, sourceType: SPECIAL_REPORT_SOURCE_TYPE, sourceId: caseId, targetType: targetTypeForRole(role) }, orderBy: { createdAt: "desc" } })
    || (role === "ACTIVITY_LEADER" ? await prisma.dashboardResourceLink.findFirst({ where: { schoolAccountId, sourceType: SPECIAL_REPORT_SOURCE_TYPE, sourceId: caseId, targetType: LEGACY_ACTIVITY_PROGRAM_TARGET_TYPE }, orderBy: { createdAt: "desc" } }) : null);
  if (!link) return null;
  const target = role === "TEACHER" || link.targetType === ACTIVITY_SERVICE_TARGET_TYPE
    ? await prisma.service.findUnique({ where: { id: link.targetId }, select: { id: true, name: true, slug: true } })
    : await prisma.caseEntry.findFirst({ where: { id: link.targetId, schoolAccountId }, select: { id: true, title: true, service: { select: { name: true, slug: true } } } });
  if (!target) return null;
  const title = role === "TEACHER" || link.targetType === ACTIVITY_SERVICE_TARGET_TYPE
    ? (target as { name: string }).name
    : (target as { title: string | null; service: { name: string } }).title || (target as { service: { name: string } }).service.name;
  const subtitle = role === "TEACHER" || link.targetType === ACTIVITY_SERVICE_TARGET_TYPE
    ? (target as { slug: string }).slug
    : (target as { service: { name: string } }).service.name;
  return { id: link.id, targetId: link.targetId, target: { id: target.id, title, subtitle } };
}

export async function getSpecialReportLinkedContexts(caseIds: string[], role: string, schoolAccountId: string) {
  const result = new Map<string, SpecialReportLinkedContext>();
  if (!caseIds.length || (role !== "TEACHER" && role !== "ACTIVITY_LEADER")) return result;
  const targetType = targetTypeForRole(role as SpecialReportLinkRole);
  const links = await prisma.dashboardResourceLink.findMany({
    where: { schoolAccountId, sourceType: SPECIAL_REPORT_SOURCE_TYPE, sourceId: { in: caseIds }, targetType: role === "ACTIVITY_LEADER" ? { in: [ACTIVITY_SERVICE_TARGET_TYPE, LEGACY_ACTIVITY_PROGRAM_TARGET_TYPE] } : targetType },
    select: { sourceId: true, targetId: true, targetType: true },
  });
  if (!links.length) return result;
  if (role === "TEACHER") {
    const targets = await prisma.service.findMany({ where: { id: { in: links.map((link) => link.targetId) } }, select: { id: true, name: true } });
    const byId = new Map(targets.map((target) => [target.id, target.name]));
    for (const link of links) { const title = byId.get(link.targetId); if (title) result.set(link.sourceId, { targetId: link.targetId, targetType, title }); }
    return result;
  }
  const serviceTargets = await prisma.service.findMany({ where: { id: { in: links.filter((link) => link.targetType === ACTIVITY_SERVICE_TARGET_TYPE).map((link) => link.targetId) }, slug: { in: [...ACTIVITY_LEADER_SERVICE_SLUGS] } }, select: { id: true, name: true } });
  const oldTargets = await prisma.caseEntry.findMany({ where: { id: { in: links.filter((link) => link.targetType === LEGACY_ACTIVITY_PROGRAM_TARGET_TYPE).map((link) => link.targetId) }, schoolAccountId }, select: { id: true, title: true, service: { select: { name: true } } } });
  const byId = new Map([...serviceTargets.map((target) => [target.id, target.name] as const), ...oldTargets.map((target) => [target.id, target.title || target.service.name] as const)]);
  for (const link of links) { const title = byId.get(link.targetId); if (title) result.set(link.sourceId, { targetId: link.targetId, targetType: link.targetType, title }); }
  return result;
}

export async function saveSpecialReportLink(input: { caseId: string; role: SpecialReportLinkRole; userId: string; schoolAccountId: string; targetId: string | null }) {
  const source = await getApprovedSpecialReportCase(input.caseId, input.userId, input.schoolAccountId);
  if (!source) throw new Error("لا يمكن ربط تقرير غير معتمد.");
  const targetType = targetTypeForRole(input.role);
  let valid = false;
  if (input.targetId) {
    valid = input.role === "TEACHER"
      ? Boolean(await prisma.service.findFirst({ where: { id: input.targetId, slug: { in: [...TEACHER_PORTFOLIO_SERVICE_SLUGS] }, status: "ACTIVE" }, select: { id: true } }))
      : Boolean(await prisma.service.findFirst({ where: { id: input.targetId, slug: { in: [...ACTIVITY_LEADER_SERVICE_SLUGS] }, status: "ACTIVE" }, select: { id: true } }));
    if (!valid) throw new Error("الهدف المختار غير متاح لهذا الدور أو المدرسة.");
  }
  await prisma.dashboardResourceLink.deleteMany({ where: { schoolAccountId: input.schoolAccountId, sourceType: SPECIAL_REPORT_SOURCE_TYPE, sourceId: input.caseId, targetType: input.role === "ACTIVITY_LEADER" ? { in: [ACTIVITY_SERVICE_TARGET_TYPE, LEGACY_ACTIVITY_PROGRAM_TARGET_TYPE] } : targetType } });
  if (!input.targetId) return null;
  return prisma.dashboardResourceLink.create({ data: { schoolAccountId: input.schoolAccountId, sourceType: SPECIAL_REPORT_SOURCE_TYPE, sourceId: input.caseId, targetType, targetId: input.targetId, createdById: input.userId } });
}
