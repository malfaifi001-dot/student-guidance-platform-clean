import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE_TYPES = ["CASE_REPORT"] as const;
const TARGET_TYPES = ["ASSESSMENT_ANALYSIS", "SURVEY_ANALYSIS"] as const;

type SourceType = (typeof SOURCE_TYPES)[number];
type TargetType = (typeof TARGET_TYPES)[number];

type CaseReportRow = {
  id: string;
  title: string | null;
  status: string;
  serviceName: string | null;
  studentName: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function safeString(value: unknown) {
  return String(value ?? "").trim();
}

function isSourceType(value: string): value is SourceType {
  return SOURCE_TYPES.includes(value as SourceType);
}

function isTargetType(value: string): value is TargetType {
  return TARGET_TYPES.includes(value as TargetType);
}

async function ensureTargetAccess(targetType: TargetType) {
  if (targetType === "ASSESSMENT_ANALYSIS") {
    return requireServiceAccessApi("assessment-center");
  }

  if (targetType === "SURVEY_ANALYSIS") {
    return requireServiceAccessApi("surveys");
  }

  return null;
}

async function loadCaseReports({
  schoolAccountId,
  query,
}: {
  schoolAccountId: string;
  query: string;
}) {
  const where: string[] = ["c.schoolAccountId = ?"];
  const params: unknown[] = [schoolAccountId];

  if (query) {
    const like = `%${query}%`;

    where.push(
      "(c.title LIKE ? OR c.id LIKE ? OR s.name LIKE ? OR st.fullName LIKE ?)",
    );
    params.push(like, like, like, like);
  }

  const rows = await prisma.$queryRawUnsafe<CaseReportRow[]>(
    `
    SELECT
      c.id,
      c.title,
      c.status,
      s.name AS serviceName,
      st.fullName AS studentName,
      c.createdAt,
      c.updatedAt
    FROM CaseEntry c
    LEFT JOIN Service s ON s.id = c.serviceId
    LEFT JOIN Student st ON st.id = c.studentId
    WHERE ${where.join(" AND ")}
    ORDER BY c.updatedAt DESC, c.createdAt DESC
    LIMIT 120
    `,
    ...params,
  );

  return rows.map((item) => ({
    id: item.id,
    title: item.title || item.serviceName || "تقرير صادر",
    subtitle: `${item.serviceName || "خدمة غير محددة"} · ${item.studentName || "بدون طالب"}`,
    status: item.status || "DRAFT",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    openUrl: `/dashboard/report-2/cases/${item.id}/studio`,
  }));
}

async function loadAssessmentAnalyses({
  schoolAccountId,
  query,
}: {
  schoolAccountId: string;
  query: string;
}) {
  const where: any = {
    schoolAccountId,
  };

  if (query) {
    where.OR = [
      { id: { contains: query } },
      { title: { contains: query } },
      { sourceFile: { contains: query } },
    ];
  }

  const rows = await prisma.assessmentAnalysis.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    take: 160,
    select: {
      id: true,
      title: true,
      sourceFile: true,
      status: true,
      totalStudents: true,
      totalSubjects: true,
      averagePercentage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return rows.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: `${item.sourceFile || "ملف غير محدد"} · ${item.totalStudents} طالب · ${item.totalSubjects} مادة · ${Math.round(Number(item.averagePercentage || 0))}%`,
    status: item.status || "COMPLETED",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    openUrl: `/dashboard/assessment-center/${item.id}`,
  }));
}

async function loadSurveyAnalyses({
  schoolAccountId,
  query,
}: {
  schoolAccountId: string;
  query: string;
}) {
  const where: any = {
    schoolAccountId,
  };

  if (query) {
    where.OR = [
      { id: { contains: query } },
      { title: { contains: query } },
      { description: { contains: query } },
    ];
  }

  const rows = await prisma.survey.findMany({
    where,
    orderBy: {
      updatedAt: "desc",
    },
    take: 160,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      audienceType: true,
      createdAt: true,
      updatedAt: true,
      service: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          questions: true,
          responses: true,
        },
      },
    },
  });

  return rows.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: `${item.service?.name || "استبيان عام"} · ${item._count.questions} سؤال · ${item._count.responses} استجابة`,
    status: item.status || "DRAFT",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    openUrl: `/dashboard/surveys/${item.id}/analysis`,
  }));
}

async function loadTargets({
  targetType,
  schoolAccountId,
  query,
}: {
  targetType: TargetType;
  schoolAccountId: string;
  query: string;
}) {
  if (targetType === "ASSESSMENT_ANALYSIS") {
    return loadAssessmentAnalyses({
      schoolAccountId,
      query,
    });
  }

  if (targetType === "SURVEY_ANALYSIS") {
    return loadSurveyAnalyses({
      schoolAccountId,
      query,
    });
  }

  return [];
}

async function sourceExists({
  sourceType,
  sourceId,
  schoolAccountId,
}: {
  sourceType: SourceType;
  sourceId: string;
  schoolAccountId: string;
}) {
  if (sourceType === "CASE_REPORT") {
    const item = await prisma.caseEntry.findFirst({
      where: {
        id: sourceId,
        schoolAccountId,
      },
      select: {
        id: true,
      },
    });

    return Boolean(item);
  }

  return false;
}

async function validTargetIds({
  targetType,
  targetIds,
  schoolAccountId,
}: {
  targetType: TargetType;
  targetIds: string[];
  schoolAccountId: string;
}) {
  if (!targetIds.length) {
    return [];
  }

  if (targetType === "ASSESSMENT_ANALYSIS") {
    const rows = await prisma.assessmentAnalysis.findMany({
      where: {
        id: {
          in: targetIds,
        },
        schoolAccountId,
      },
      select: {
        id: true,
      },
    });

    const allowed = new Set(rows.map((item) => item.id));
    return targetIds.filter((id) => allowed.has(id));
  }

  if (targetType === "SURVEY_ANALYSIS") {
    const rows = await prisma.survey.findMany({
      where: {
        id: {
          in: targetIds,
        },
        schoolAccountId,
      },
      select: {
        id: true,
      },
    });

    const allowed = new Set(rows.map((item) => item.id));
    return targetIds.filter((id) => allowed.has(id));
  }

  return [];
}

export async function GET(request: Request) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  const url = new URL(request.url);
  const sourceTypeRaw = safeString(url.searchParams.get("sourceType"));
  const targetTypeRaw = safeString(url.searchParams.get("targetType"));
  const sourceQuery = safeString(url.searchParams.get("sourceQuery"));
  const targetQuery = safeString(url.searchParams.get("targetQuery"));

  if (!isSourceType(sourceTypeRaw) || !isTargetType(targetTypeRaw)) {
    return NextResponse.json(
      { error: "نوع الربط غير مدعوم." },
      { status: 400 },
    );
  }

  const accessError = await ensureTargetAccess(targetTypeRaw);
  if (accessError) return accessError;

  try {
    const sources = await loadCaseReports({
      schoolAccountId: auth.schoolAccountId,
      query: sourceQuery,
    });

    const targets = await loadTargets({
      targetType: targetTypeRaw,
      schoolAccountId: auth.schoolAccountId,
      query: targetQuery,
    });

    const sourceIds = sources.map((item) => item.id);

    const links = sourceIds.length
      ? await prisma.dashboardResourceLink.findMany({
          where: {
            schoolAccountId: auth.schoolAccountId,
            sourceType: sourceTypeRaw,
            sourceId: {
              in: sourceIds,
            },
            targetType: targetTypeRaw,
          },
          orderBy: [
            { sourceId: "asc" },
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          select: {
            sourceId: true,
            targetId: true,
          },
        })
      : [];

    const linkedBySource = new Map<string, string[]>();
    const sourceById = new Map(sources.map((source) => [source.id, source]));
    const targetById = new Map(targets.map((target) => [target.id, target]));

    for (const link of links) {
      linkedBySource.set(link.sourceId, [
        ...(linkedBySource.get(link.sourceId) || []),
        link.targetId,
      ]);
    }

    const existingLinks = links
      .map((link) => {
        const source = sourceById.get(link.sourceId);
        const target = targetById.get(link.targetId);

        if (!source || !target) {
          return null;
        }

        return {
          sourceId: link.sourceId,
          targetId: link.targetId,
          sourceTitle: source.title,
          sourceSubtitle: source.subtitle,
          sourceStatus: source.status,
          sourceOpenUrl: source.openUrl,
          targetTitle: target.title,
          targetSubtitle: target.subtitle,
          targetStatus: target.status,
          targetOpenUrl: target.openUrl,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      sourceType: sourceTypeRaw,
      targetType: targetTypeRaw,
      sources: sources.map((source) => ({
        ...source,
        linkedTargetIds: linkedBySource.get(source.id) || [],
      })),
      targets,
      existingLinks,
    });
  } catch (error) {
    console.error("DASHBOARD_RESOURCE_LINKS_GET_ERROR", error);

    return NextResponse.json(
      { error: "تعذر تحميل خيارات الربط." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSchoolDashboardApiContext();

  if (auth instanceof Response) {
    return auth;
  }

  let body: any = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const sourceTypeRaw = safeString(body.sourceType);
  const sourceId = safeString(body.sourceId);
  const targetTypeRaw = safeString(body.targetType);

  if (!isSourceType(sourceTypeRaw) || !isTargetType(targetTypeRaw)) {
    return NextResponse.json(
      { error: "نوع الربط غير مدعوم." },
      { status: 400 },
    );
  }

  const accessError = await ensureTargetAccess(targetTypeRaw);
  if (accessError) return accessError;

  if (!sourceId) {
    return NextResponse.json(
      { error: "اختر التقرير أولًا." },
      { status: 400 },
    );
  }

  const exists = await sourceExists({
    sourceType: sourceTypeRaw,
    sourceId,
    schoolAccountId: auth.schoolAccountId,
  });

  if (!exists) {
    return NextResponse.json(
      { error: "التقرير غير موجود أو لا تملك صلاحية الوصول إليه." },
      { status: 404 },
    );
  }

  const requestedTargetIds: string[] = Array.isArray(body.targetIds)
    ? body.targetIds.map((item: unknown) => safeString(item)).filter(Boolean)
    : [];

  const uniqueTargetIds = Array.from(new Set(requestedTargetIds));

  const targetIds = await validTargetIds({
    targetType: targetTypeRaw,
    targetIds: uniqueTargetIds,
    schoolAccountId: auth.schoolAccountId,
  });

  await prisma.$transaction(async (tx) => {
    await tx.dashboardResourceLink.deleteMany({
      where: {
        schoolAccountId: auth.schoolAccountId,
        sourceType: sourceTypeRaw,
        sourceId,
        targetType: targetTypeRaw,
      },
    });

    if (targetIds.length) {
      await tx.dashboardResourceLink.createMany({
        data: targetIds.map((targetId, index) => ({
          id: randomUUID(),
          schoolAccountId: auth.schoolAccountId,
          sourceType: sourceTypeRaw,
          sourceId,
          targetType: targetTypeRaw,
          targetId,
          sortOrder: index,
          createdById: auth.user.id,
        })),
      });
    }
  });

  return NextResponse.json({
    ok: true,
    sourceType: sourceTypeRaw,
    sourceId,
    targetType: targetTypeRaw,
    targetIds,
    linkedCount: targetIds.length,
  });
}