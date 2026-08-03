import { redirect } from "next/navigation";

import { MobileCasesList } from "@/components/mobile/mobile-cases-list";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import { buildCaseEntryWhereForUser } from "@/lib/cases/case-access-scope";
import { prisma } from "@/lib/prisma";

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
  if (status === "SUBMITTED") return "مكتملة";
  if (status === "ARCHIVED") return "مؤرشفة";
  return status || "غير محدد";
}

function cleanTitle(value: unknown) {
  const text = String(value ?? "").trim();

  if (!text || text === "null" || text === "undefined") {
    return "";
  }

  return text.length > 120 ? "" : text;
}

function getCaseDisplayTitle(caseItem: {
  title?: string | null;
  service?: { name?: string | null } | null;
  student?: { fullName?: string | null } | null;
}) {
  return (
    cleanTitle(caseItem.title) ||
    cleanTitle(caseItem.student?.fullName) ||
    cleanTitle(caseItem.service?.name) ||
    "حالة بدون عنوان"
  );
}

function getViewerRole(context: unknown) {
  const record = context as Record<string, any>;

  return String(
    record?.user?.role ||
      record?.currentUser?.role ||
      record?.sessionUser?.role ||
      record?.role ||
      "COUNSELOR",
  );
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

export default async function MobileCounselorCasesPage() {
  const context = await requireDashboardPageContext();

  const viewerRole = getViewerRole(context);
  const viewerId = getViewerId(context);
  const viewerSchoolAccountId = getViewerSchoolAccountId(context);

  if (viewerRole !== "ADMIN" && !viewerSchoolAccountId) {
    redirect("/dashboard/onboarding?required=true");
  }

  const cases = await prisma.caseEntry.findMany({
    where: buildCaseEntryWhereForUser({
      id: viewerId || "__NO_USER__",
      role: viewerRole,
      schoolAccountId: viewerSchoolAccountId,
      email: context.user.email,
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
    take: 80,
  });

  const rows = cases.map((caseItem) => {
    const studentMeta = [
      caseItem.student?.stage,
      caseItem.student?.grade,
      caseItem.student?.classroom ? `فصل ${caseItem.student.classroom}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      id: caseItem.id,
      title: getCaseDisplayTitle(caseItem),
      status: caseItem.status,
      statusLabel: getCaseStatusLabel(caseItem.status),
      updatedAtLabel: formatDate(caseItem.updatedAt),
      createdAtLabel: formatDate(caseItem.createdAt),
      service: {
        name: caseItem.service.name,
        slug: caseItem.service.slug,
      },
      workflow: caseItem.workflow
        ? {
            name: caseItem.workflow.name,
            workflowType: caseItem.workflow.workflowType,
          }
        : null,
      student: caseItem.student
        ? {
            fullName: caseItem.student.fullName,
            nationalId: caseItem.student.nationalId,
            meta: studentMeta || "بيانات الطالب غير مكتملة",
          }
        : null,
      createdBy: caseItem.createdBy
        ? {
            name: caseItem.createdBy.name,
          }
        : null,
      valuesCount: caseItem._count.values,
      evidencesCount: caseItem._count.evidences,
      reportsCount: caseItem._count.guidanceReports,
      isMine: Boolean(viewerId && caseItem.createdById === viewerId),
    };
  });

  return <MobileCasesList cases={rows} />;
}
