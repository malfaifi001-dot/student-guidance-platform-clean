
import { CasesSearchTable } from "@/components/cases/cases-search-table";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import {
  buildCaseEntryWhereForUser,
} from "@/lib/cases/case-access-scope";
import { resolveCaseCapabilities } from "@/lib/cases/case-permissions";
import { resolveArabicCaseReportTitle } from "@/lib/cases/resolve-arabic-case-report-title";
import { prisma } from "@/lib/prisma";
import { listLatestReportTwoSnapshotsForCases } from "@/lib/report-2/report-snapshot-service";
import { roleHasReportTwoCapability } from "@/lib/report-2/report-two-access";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "غير محدد";

  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

function getCaseStatusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "SUBMITTED") return "مرسلة";
  if (status === "ARCHIVED") return "مؤرشفة";

  return status || "غير محدد";
}

function getReportStatusLabel(status?: string | null) {
  if (status === "DRAFT") return "مسودة";
  if (status === "GENERATED") return "مولد";
  if (status === "APPROVED") return "معتمد";
  if (status === "ARCHIVED") return "مؤرشف";

  return status || "غير محدد";
}

function getViewerId(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.id ||
    record?.currentUser?.id ||
    record?.sessionUser?.id ||
    record?.userId ||
    null
  ) as string | null;
}

function getViewerName(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.name ||
    record?.currentUser?.name ||
    record?.sessionUser?.name ||
    record?.name ||
    "الموجه/الموجهة"
  ) as string;
}

function getViewerRole(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.role ||
    record?.currentUser?.role ||
    record?.sessionUser?.role ||
    record?.role ||
    (record?.isAdmin ? "ADMIN" : "COUNSELOR")
  ) as string;
}

function getViewerSchoolAccountId(context: unknown) {
  const record = context as Record<string, any>;

  return (
    record?.user?.schoolAccountId ||
    record?.currentUser?.schoolAccountId ||
    record?.sessionUser?.schoolAccountId ||
    record?.schoolAccountId ||
    null
  ) as string | null;
}

export default async function CasesPage() {
  const context = await requireDashboardPageContext({ allowPrincipal: true });

  const viewerRole = getViewerRole(context);
  const viewerSchoolAccountId = getViewerSchoolAccountId(context);

  const viewerId = getViewerId(context);
  const viewerName = getViewerName(context);

  const cases = await prisma.caseEntry.findMany({
    where: buildCaseEntryWhereForUser({
      id: viewerId || "__NO_USER__",
      role: viewerRole,
      schoolAccountId: viewerSchoolAccountId,
      email: context.user.email,
      historicalPersonalRead: true,
    }),
    include: {
      service: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
          workflowType: true,
        },
      },
      student: {
        include: {
          guardian: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      activityAssignment: {
        select: {
          teacherEmail: true,
          status: true,
        },
      },
      values: {
        select: {
          fieldKey: true,
          value: true,
          jsonValue: true,
          field: {
            select: {
              key: true,
              label: true,
              options: {
                orderBy: {
                  order: "asc",
                },
                select: {
                  label: true,
                  value: true,
                  order: true,
                },
              },
            },
          },
        },
      },
      guidanceReports: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          status: true,
          templateId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      _count: {
        select: {
          values: true,
          evidences: true,
          guidanceReports: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 240,
  });

  const snapshotMap = await listLatestReportTwoSnapshotsForCases(
    context,
    cases.map((c) => c.id),
  );
  const roleCanDeleteReportTwo = roleHasReportTwoCapability(
    context.user.role,
    "REPORT_DELETE",
  );

  const rows = cases.map((caseItem) => {
    const historicalPersonalCase =
      viewerRole !== "ADMIN" &&
      caseItem.createdById === viewerId &&
      caseItem.schoolAccountId !== viewerSchoolAccountId;
    const capabilities = resolveCaseCapabilities(
      {
        id: viewerId || "__NO_USER__",
        role: viewerRole,
        schoolAccountId: viewerSchoolAccountId,
        email: context.user.email,
        historicalPersonalRead: true,
      },
      caseItem,
    );
    const latestReportTwoSnapshot = snapshotMap.get(caseItem.id) || null;
    const latestReport = caseItem.guidanceReports[0] || null;
    const reportPreviewUrl = latestReport
      ? `/dashboard/report/${latestReport.id}/preview${
          latestReport.templateId
            ? `?template=${encodeURIComponent(latestReport.templateId)}`
            : ""
        }`
      : null;

    const visibleStudent = historicalPersonalCase ? null : caseItem.student;
    const studentMeta = [
      visibleStudent?.stage,
      visibleStudent?.grade,
      visibleStudent?.classroom
        ? `فصل ${visibleStudent.classroom}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: caseItem.id,
      title: resolveArabicCaseReportTitle(caseItem),
      status: caseItem.status,
      statusLabel: getCaseStatusLabel(caseItem.status),
      createdAt: caseItem.createdAt.toISOString(),
      createdAtLabel: formatDate(caseItem.createdAt),
      updatedAt: caseItem.updatedAt.toISOString(),
      updatedAtLabel: formatDate(caseItem.updatedAt),
      submittedAt: caseItem.submittedAt?.toISOString() || null,
      submittedAtLabel: caseItem.submittedAt
        ? formatDate(caseItem.submittedAt)
        : null,

      service: {
        id: caseItem.service.id,
        name: caseItem.service.name,
        slug: caseItem.service.slug,
      },

      workflow: caseItem.workflow
        ? {
            id: caseItem.workflow.id,
            name: caseItem.workflow.name,
            workflowType: caseItem.workflow.workflowType,
          }
        : null,

      student: visibleStudent
        ? {
            id: visibleStudent.id,
            fullName: visibleStudent.fullName,
            nationalId: visibleStudent.nationalId,
            stage: visibleStudent.stage,
            grade: visibleStudent.grade,
            classroom: visibleStudent.classroom,
            guardianName: visibleStudent.guardian?.name || null,
            guardianPhone: visibleStudent.guardian?.phone || null,
            meta: studentMeta || "بيانات الطالب غير مكتملة",
          }
        : null,

      createdBy: caseItem.createdBy
        ? {
            id: caseItem.createdBy.id,
            name: caseItem.createdBy.name,
          }
        : null,

      isMine: Boolean(viewerId && caseItem.createdById === viewerId),
      valuesCount: caseItem._count.values,
      evidencesCount: caseItem._count.evidences,
      reportsCount: caseItem._count.guidanceReports,
      capabilities: {
        ...capabilities,
        canDeleteCaseReport:
          capabilities.canDeleteCaseReport && roleCanDeleteReportTwo,
      },
      reportTwoReport: latestReportTwoSnapshot
        ? {
            id: latestReportTwoSnapshot.id,
            status: latestReportTwoSnapshot.status,
            title: latestReportTwoSnapshot.reportTitle,
            previewUrl: `/dashboard/report-2/snapshots/${encodeURIComponent(latestReportTwoSnapshot.id)}/preview`,
            canDeleteReport: roleCanDeleteReportTwo,
          }
        : null,

      latestReport: latestReport
        ? {
            id: latestReport.id,
            status: latestReport.status,
            statusLabel: getReportStatusLabel(latestReport.status),
            templateId: latestReport.templateId,
            updatedAt: latestReport.updatedAt.toISOString(),
            updatedAtLabel: formatDate(latestReport.updatedAt),
            previewUrl: reportPreviewUrl,
          }
        : null,
    };
  });

  return (
    <main className="space-y-5" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
        <h1 className="text-4xl font-black">الحالات</h1>
      </section>

      <CasesSearchTable
        cases={rows}
        viewerName={viewerName}
        isAdmin={viewerRole === "ADMIN"}
        viewerRole={viewerRole}
      />
    </main>
  );
}
