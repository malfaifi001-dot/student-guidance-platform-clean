import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

async function requireAdmin() {
  const current = await getCurrentSessionUser();

  if (!current?.user || current.user.role !== "ADMIN") {
    return null;
  }

  return current;
}

export async function GET() {
  const current = await requireAdmin();

  if (!current) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
  }

  const logs = await prisma.platformActivityLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 700,
  });

  const userIds = Array.from(
    new Set(
      logs
        .flatMap((log) => [log.actorUserId, log.targetUserId])
        .filter((id): id is string => Boolean(id))
    )
  );

  const schoolAccountIds = Array.from(
    new Set(logs.map((log) => log.schoolAccountId).filter((id): id is string => Boolean(id)))
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

  const userMap = new Map(users.map((user) => [user.id, user]));
  const schoolMap = new Map(schools.map((school) => [school.id, school]));

  const enrichedLogs = logs.map((log) => {
    const actor = log.actorUserId ? userMap.get(log.actorUserId) : null;
    const target = log.targetUserId ? userMap.get(log.targetUserId) : null;
    const school = log.schoolAccountId ? schoolMap.get(log.schoolAccountId) : null;

    return {
      id: log.id,
      category: log.category,
      action: log.action,
      severity: log.severity,
      title: log.title,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      actor: actor
        ? {
            id: actor.id,
            name: actor.officialName || actor.name || actor.email,
            email: actor.email,
            role: actor.role,
          }
        : null,
      target: target
        ? {
            id: target.id,
            name: target.officialName || target.name || target.email,
            email: target.email,
            role: target.role,
          }
        : null,
      school: school
        ? {
            id: school.id,
            name: school.profile?.schoolName || school.name,
            slug: school.slug,
          }
        : null,
    };
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const stats = {
    total: logs.length,
    today: logs.filter((log) => log.createdAt >= todayStart).length,
    success: logs.filter((log) => log.severity === "SUCCESS").length,
    warnings: logs.filter((log) => log.severity === "WARNING").length,
    errors: logs.filter((log) => log.severity === "ERROR").length,
    security: logs.filter((log) => log.category === "SECURITY" || log.category === "AUTH").length,
    subscriptions: logs.filter((log) => log.category === "SUBSCRIPTION" || log.category === "ACTIVATION" || log.category === "PAYMENT").length,
    users: logs.filter((log) => log.category === "USER").length,
  };

  return NextResponse.json({
    stats,
    logs: enrichedLogs,
  });
}
