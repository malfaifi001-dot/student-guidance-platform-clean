import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveSubscriptionApi, requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { logReportCreatedEvent } from "@/lib/admin/activity-events";
import {
  mapCaseEntryToReportData,
  type ReportMappedCase,
} from "@/lib/report-engine/report-case-data-mapper";
import {
  createDefaultTemplateSnapshot,
  createReportDataSnapshot,
} from "@/lib/report-engine/report-snapshot";

type CreateReportBody = {
  caseEntryId?: string;
  caseId?: string;
  title?: string;
  templateId?: string;
};

function parseBuilderTemplateJson(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    return value as Record<string, any>;
  }

  return null;
}

function isPublishedBuilderTemplate(templateJson: Record<string, any> | null) {
  return templateJson?.status === "PUBLISHED" && Array.isArray(templateJson?.pages);
}

async function createTemplateSnapshotFromDatabase(templateId: string) {
  const builderTemplate = await prisma.reportTemplate.findUnique({
    where: {
      id: templateId,
    },
  });

  const templateJson =
    parseBuilderTemplateJson(builderTemplate?.templateJson) ||
    parseBuilderTemplateJson(builderTemplate?.content);

  if (!builderTemplate || !isPublishedBuilderTemplate(templateJson)) {
    return createDefaultTemplateSnapshot(templateId);
  }

  const safeTemplateJson = templateJson as Record<string, any>;

  return {
    templateId: builderTemplate.id,
    templateName: builderTemplate.name,
    version: 1,
    capturedAt: new Date().toISOString(),
    source: "TEMPLATE_BUILDER",
    settings: {
      showCover: true,
      defaultTemplate: builderTemplate.id,
      defaultEvidenceLayout: "grid-2x2",
      pageSize: "A4",
      direction: "rtl",
    },
    builderTemplate: {
      ...safeTemplateJson,
      id: builderTemplate.id,
      name: builderTemplate.name || safeTemplateJson.name,
      description:
        builderTemplate.description ||
        safeTemplateJson.description ||
        "قالب تقرير محفوظ من صانع القوالب.",
      serviceSlug:
        builderTemplate.serviceSlug || safeTemplateJson.serviceSlug || null,
      status: "PUBLISHED",
    },
  };
}

function buildReportContent(reportData: ReportMappedCase) {
  const studentLines = reportData.student
    ? [
        `اسم الطالب/الطالبة: ${reportData.student.fullName}`,
        `رقم الهوية: ${reportData.student.nationalId || "غير متوفر"}`,
        `المرحلة: ${reportData.student.stage || "غير محدد"}`,
        `الصف: ${reportData.student.grade || "غير محدد"}`,
        `الفصل: ${reportData.student.classroom || "غير محدد"}`,
        `ولي الأمر: ${reportData.student.guardianName || "غير متوفر"}`,
        `جوال ولي الأمر: ${reportData.student.guardianPhone || "غير متوفر"}`,
      ].join("\n")
    : "لا يوجد طالب/طالبة مرتبط بهذه الحالة.";

  const valuesLines = reportData.values.length
    ? reportData.values
        .map((item, index) => {
          return `${index + 1}. ${item.fieldLabel}: ${item.value || "غير محدد"}`;
        })
        .join("\n")
    : "لا توجد قيم محفوظة في الحالة.";

  const evidencesLines = reportData.evidences.length
    ? reportData.evidences
        .map((item, index) => {
          return `${index + 1}. ${item.title || item.fileName || "شاهد"}`;
        })
        .join("\n")
    : "لا توجد شواهد مرفقة.";

  return `
تقرير: ${reportData.title}

الخدمة:
${reportData.service.name}

بيانات الطالب/الطالبة:
${studentLines}

بيانات الحالة:
رقم الحالة: ${reportData.id}
حالة السجل: ${reportData.status}
تاريخ الإنشاء: ${new Date(reportData.createdAt).toLocaleDateString("ar-SA")}

القيم المسجلة:
${valuesLines}

الشواهد:
${evidencesLines}

ملخص التقرير:
تم إنشاء هذا التقرير بناءً على البيانات المسجلة في منصة التوجيه الطلابي، ويعتمد على الحالة المرتبطة بالخدمة، وبيانات الطالب/الطالبة، والقيم المدخلة، والشواهد المرفقة.
`.trim();
}

export async function POST(request: Request) {
  // subscription-api-guard:POST:requireActiveSubscriptionApi()
  const subscriptionGuard = await requireActiveSubscriptionApi();
  if (subscriptionGuard) return subscriptionGuard;

  try {
    const body = (await request.json()) as CreateReportBody;

    const caseEntryId = body.caseEntryId || body.caseId;

    if (!caseEntryId) {
      return NextResponse.json(
        {
          error: "caseEntryId مطلوب لإنشاء التقرير.",
        },
        { status: 400 }
      );
    }

    const templateId = body.templateId || "official-long";

    const caseEntry = await prisma.caseEntry.findUnique({
      where: {
        id: caseEntryId,
      },
      include: {
        service: true,
        student: {
          include: {
            guardian: true,
          },
        },
        values: {
          include: {
            field: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        evidences: {
          orderBy: {
            createdAt: "asc",
          },
        },
        caseEvidences: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!caseEntry) {
      return NextResponse.json(
        {
          error: "الحالة غير موجودة.",
        },
        { status: 404 }
      );
    }

    const reportData = mapCaseEntryToReportData(caseEntry);

    const reportTitle =
      body.title?.trim() ||
      `تقرير - ${reportData.title || reportData.service.name}`;

    const initialContent = buildReportContent(reportData);

    const templateSnapshot = await createTemplateSnapshotFromDatabase(templateId);
    const reportDataSnapshot = createReportDataSnapshot(reportData);

    const report = await prisma.guidanceReport.create({
      data: {
        title: reportTitle,
        serviceSlug: reportData.service.slug,
        caseEntryId: reportData.id,
        genderMode: caseEntry.student?.gender === "FEMALE" ? "FEMALE" : "MALE",

        editableContent: initialContent,
        renderedContent: initialContent,

        templateId,
        templateSnapshot,
        reportDataSnapshot,
        generatedAt: new Date(),

        evidenceItems: {
          create: reportData.evidences.map((item, index) => ({
            fileName: item.fileName || `evidence-${index + 1}`,
            fileUrl: item.fileUrl,
            caption: item.note || item.title || item.fileName || null,
            sortOrder: index,
            visible: true,
          })),
        },
      },
      include: {
        evidenceItems: true,
      },
    });

    
    // audit-log:report-created
    await logReportCreatedEvent({
      reportId: report.id,
      caseEntryId: reportData.id,
      title: report.title,
      templateId,
      serviceSlug: reportData.service.slug,
      evidenceCount: Array.isArray(report.evidenceItems)
        ? report.evidenceItems.length
        : 0,
    });

return NextResponse.json({
      success: true,
      reportId: report.id,
      previewUrl: `/dashboard/reports/${report.id}/preview?template=${templateId}`,
    });
  } catch (error) {
    console.error("create report error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "فشل إنشاء التقرير.",
      },
      { status: 400 }
    );
  }
}