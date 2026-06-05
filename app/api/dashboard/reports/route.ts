import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveSubscriptionApi, requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";
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
        "Ù‚Ø§Ù„Ø¨ ØªÙ‚Ø±ÙŠØ± Ù…Ø­ÙÙˆØ¸ Ù…Ù† ØµØ§Ù†Ø¹ Ø§Ù„Ù‚ÙˆØ§Ù„Ø¨.",
      serviceSlug:
        builderTemplate.serviceSlug || safeTemplateJson.serviceSlug || null,
      status: "PUBLISHED",
    },
  };
}

function buildReportContent(reportData: ReportMappedCase) {
  const studentLines = reportData.student
    ? [
        `Ø§Ø³Ù… Ø§Ù„Ø·Ø§Ù„Ø¨/Ø§Ù„Ø·Ø§Ù„Ø¨Ø©: ${reportData.student.fullName}`,
        `Ø±Ù‚Ù… Ø§Ù„Ù‡ÙˆÙŠØ©: ${reportData.student.nationalId || "ØºÙŠØ± Ù…ØªÙˆÙØ±"}`,
        `Ø§Ù„Ù…Ø±Ø­Ù„Ø©: ${reportData.student.stage || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}`,
        `Ø§Ù„ØµÙ: ${reportData.student.grade || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}`,
        `Ø§Ù„ÙØµÙ„: ${reportData.student.classroom || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}`,
        `ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±: ${reportData.student.guardianName || "ØºÙŠØ± Ù…ØªÙˆÙØ±"}`,
        `Ø¬ÙˆØ§Ù„ ÙˆÙ„ÙŠ Ø§Ù„Ø£Ù…Ø±: ${reportData.student.guardianPhone || "ØºÙŠØ± Ù…ØªÙˆÙØ±"}`,
      ].join("\n")
    : "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·Ø§Ù„Ø¨/Ø·Ø§Ù„Ø¨Ø© Ù…Ø±ØªØ¨Ø· Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø­Ø§Ù„Ø©.";

  const valuesLines = reportData.values.length
    ? reportData.values
        .map((item: any, index: any) => {
          return `${index + 1}. ${item.fieldLabel}: ${item.value || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"}`;
        })
        .join("\n")
    : "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚ÙŠÙ… Ù…Ø­ÙÙˆØ¸Ø© ÙÙŠ Ø§Ù„Ø­Ø§Ù„Ø©.";

  const evidencesLines = reportData.evidences.length
    ? reportData.evidences
        .map((item: any, index: any) => {
          return `${index + 1}. ${item.title || item.fileName || "Ø´Ø§Ù‡Ø¯"}`;
        })
        .join("\n")
    : "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø´ÙˆØ§Ù‡Ø¯ Ù…Ø±ÙÙ‚Ø©.";

  return `
ØªÙ‚Ø±ÙŠØ±: ${reportData.title}

Ø§Ù„Ø®Ø¯Ù…Ø©:
${reportData.service.name}

Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨/Ø§Ù„Ø·Ø§Ù„Ø¨Ø©:
${studentLines}

Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø­Ø§Ù„Ø©:
Ø±Ù‚Ù… Ø§Ù„Ø­Ø§Ù„Ø©: ${reportData.id}
Ø­Ø§Ù„Ø© Ø§Ù„Ø³Ø¬Ù„: ${reportData.status}
ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡: ${new Date(reportData.createdAt).toLocaleDateString("ar-SA")}

Ø§Ù„Ù‚ÙŠÙ… Ø§Ù„Ù…Ø³Ø¬Ù„Ø©:
${valuesLines}

Ø§Ù„Ø´ÙˆØ§Ù‡Ø¯:
${evidencesLines}

Ù…Ù„Ø®Øµ Ø§Ù„ØªÙ‚Ø±ÙŠØ±:
ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù‡Ø°Ø§ Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø¨Ù†Ø§Ø¡Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø³Ø¬Ù„Ø© ÙÙŠ Ù…Ù†ØµØ© Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ø·Ù„Ø§Ø¨ÙŠØŒ ÙˆÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„Ø®Ø¯Ù…Ø©ØŒ ÙˆØ¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨/Ø§Ù„Ø·Ø§Ù„Ø¨Ø©ØŒ ÙˆØ§Ù„Ù‚ÙŠÙ… Ø§Ù„Ù…Ø¯Ø®Ù„Ø©ØŒ ÙˆØ§Ù„Ø´ÙˆØ§Ù‡Ø¯ Ø§Ù„Ù…Ø±ÙÙ‚Ø©.
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
          error: "caseEntryId Ù…Ø·Ù„ÙˆØ¨ Ù„Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ØªÙ‚Ø±ÙŠØ±.",
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
          error: "Ø§Ù„Ø­Ø§Ù„Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©.",
        },
        { status: 404 }
      );
    }

    const serviceGuard = await requireServiceAccessApi(caseEntry.service.slug);
    if (serviceGuard) return serviceGuard;

    const reportData = mapCaseEntryToReportData(caseEntry);

    const reportTitle =
      body.title?.trim() ||
      `ØªÙ‚Ø±ÙŠØ± - ${reportData.title || reportData.service.name}`;

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
          create: reportData.evidences.map((item: any, index: any) => ({
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
        error: error instanceof Error ? error.message : "ÙØ´Ù„ Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ØªÙ‚Ø±ÙŠØ±.",
      },
      { status: 400 }
    );
  }
}
