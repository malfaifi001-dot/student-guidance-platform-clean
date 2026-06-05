import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";

type AdminActivityLogItem = {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  schoolAccountId: string | null;
  category: string | null;
  action: string | null;
  severity: string | null;
  entityType: string | null;
  entityId: string | null;
  title: string | null;
  message: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
};

type AdminActivityUserItem = {
  id: string;
  officialName: string | null;
  name: string | null;
  email: string | null;
  role: string | null;
};

type AdminActivitySchoolItem = {
  id: string;
  name: string | null;
  slug: string | null;
  profile: {
    schoolName: string | null;
  } | null;
};

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const logs = (await prisma.platformActivityLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 700,
  })) as AdminActivityLogItem[];

  const userIds = Array.from(
    new Set(
      logs
        .flatMap((log: any) => [log.actorUserId, log.targetUserId])
        .filter((id): id is string => Boolean(id))
    )
  );

  const schoolAccountIds = Array.from(
    new Set(
      logs
        .map((log: any) => log.schoolAccountId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [users, schools] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            name: true,
            officialName: true,
            email: true,
            role: true,
          },
        })
      : [],

    schoolAccountIds.length
      ? prisma.schoolAccount.findMany({
          where: {
            id: {
              in: schoolAccountIds,
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            profile: {
              select: {
                schoolName: true,
              },
            },
          },
        })
      : [],
  ]);

  const typedUsers = users as AdminActivityUserItem[];
  const typedSchools = schools as AdminActivitySchoolItem[];

  const userMap = new Map<string, AdminActivityUserItem>(
    typedUsers.map((user: any) => [user.id, user])
  );

  const schoolMap = new Map<string, AdminActivitySchoolItem>(
    typedSchools.map((school: any) => [school.id, school])
  );

  const enrichedLogs = logs.map((log: any) => {
    const actor = log.actorUserId ? userMap.get(log.actorUserId) : null;
    const target = log.targetUserId ? userMap.get(log.targetUserId) : null;
    const school = log.schoolAccountId ? schoolMap.get(log.schoolAccountId) : null;

    return {
      id: log.id,
      category: log.category,
      action: log.action,
      severity: log.severity,
      title: log.title,
      message: log.message,
      details: log.details,
      entityType: log.entityType,
      entityId: log.entityId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      actor: actor
        ? {
            id: actor.id,
            name: actor.officialName || actor.name || actor.email || "مستخدم",
            email: actor.email || "",
            role: actor.role || "",
          }
        : null,
      target: target
        ? {
            id: target.id,
            name: target.officialName || target.name || target.email || "مستخدم",
            email: target.email || "",
            role: target.role || "",
          }
        : null,
      school: school
        ? {
            id: school.id,
            name: school.profile?.schoolName || school.name || "مدرسة",
            slug: school.slug || "",
          }
        : null,
    };
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const stats = {
    total: logs.length,
    today: logs.filter((log: any) => log.createdAt >= todayStart).length,
    success: logs.filter((log: any) => log.severity === "SUCCESS").length,
    warnings: logs.filter((log: any) => log.severity === "WARNING").length,
    errors: logs.filter((log: any) => log.severity === "ERROR").length,
    security: logs.filter(
      (log: any) => log.category === "SECURITY" || log.category === "AUTH"
    ).length,
    subscriptions: logs.filter(
      (log: any) =>
        log.category === "SUBSCRIPTION" ||
        log.category === "ACTIVATION" ||
        log.category === "PAYMENT"
    ).length,
    users: logs.filter((log: any) => log.category === "USER").length,
  };

  return NextResponse.json({
    stats,
    logs: enrichedLogs,
  });
}
