import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import {
  requireActiveSubscriptionApi,
  requireServiceAccessApi,
} from "@/lib/subscription/subscription-api-guard";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}

function parseTemplateJson(value: unknown) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return null;
}

function getPayloadEvidences(payload: Record<string, any>) {
  const candidates = [
    payload.evidence?.items,
    payload.evidence?.evidences,
    payload.evidences,
    payload.evidenceItems,
    payload.attachments,
    payload.files,
    payload.caseInfo?.evidence?.items,
    payload.caseInfo?.evidences,
    payload.caseInfo?.evidenceItems,
    payload.caseInfo?.attachments,
  ];

  const collected: any[] = [];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      collected.push(...candidate);
      continue;
    }

    if (candidate && typeof candidate === "object") {
      if (Array.isArray(candidate.items)) {
        collected.push(...candidate.items);
      }

      if (Array.isArray(candidate.evidences)) {
        collected.push(...candidate.evidences);
      }
    }
  }

  const seen = new Set<string>();

  return collected.filter((item, index) => {
    const fileUrl =
      item.fileUrl ||
      item.url ||
      item.imageUrl ||
      item.publicUrl ||
      item.path ||
      "";

    const signature = `${item.id || index}-${fileUrl}`;

    if (!fileUrl || seen.has(signature)) return false;

    seen.add(signature);
    return true;
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const current = await getCurrentSessionUser();

    if (!current) {
      return NextResponse.json(
        {
          success: false,
          error: "يلزم تسجيل الدخول.",
        },
        { status: 401 },
      );
    }

    if (current.user.role !== "ADMIN") {
      const subscriptionGuard = await requireActiveSubscriptionApi();
      if (subscriptionGuard) return subscriptionGuard;
    }

    const { caseId } = await context.params;
    const body = toRecord(await request.json().catch(() => ({})));

    const result = await buildSmartReportPayloadForCase({
      caseId: String(caseId || "").trim(),
      current,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: result.status },
      );
    }

    if (current.user.role !== "ADMIN") {
      const serviceGuard = await requireServiceAccessApi(result.serviceSlug);
      if (serviceGuard) return serviceGuard;
    }

    const caseEntry = await prisma.caseEntry.findUnique({
      where: {
        id: result.caseEntryId,
      },
      select: {
        id: true,
        schoolAccountId: true,
      },
    });

    if (!caseEntry) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على الحالة.",
        },
        { status: 404 },
      );
    }

    const templateId = String(body.templateId || "").trim();
    const payload = toRecord(body.payload) || result.payload;
    const documentDraft = toRecord(body.documentDraft);

    const template = templateId
      ? await prisma.reportTemplate.findFirst({
          where: {
            id: templateId,
            isActive: true,
          },
        })
      : null;

    const templateJson =
      parseTemplateJson(template?.templateJson) ||
      parseTemplateJson(template?.content);

    const templateSnapshot = {
      kind: "REPORT_ONE_ADMIN_TEMPLATE",
      engine: "report-1",
      version: 1,
      capturedAt: new Date().toISOString(),
      templateId: template?.id || templateId || null,
      templateName: template?.name || body.templateName || "قالب report-1",
      serviceSlug: template?.serviceSlug || null,
      templateJson,
    };

    const reportDataSnapshot = {
      kind: "REPORT_ONE_DRAFT",
      engine: "report-1",
      version: 1,
      caseId: result.caseEntryId,
      serviceSlug: result.serviceSlug,
      payload,
      documentDraft,
      selectedTemplateId: template?.id || templateId || null,
      savedAt: new Date().toISOString(),
    };

    const evidenceItems = getPayloadEvidences(payload);

    const report = await prisma.guidanceReport.create({
      data: {
        title:
          String(documentDraft.title || payload.title || payload.caseInfo?.title || "").trim() ||
          "تقرير حالة",
        serviceSlug: result.serviceSlug,
        caseEntryId: result.caseEntryId,
        status: "GENERATED",
        genderMode: "MALE",
        editableContent: JSON.stringify(documentDraft),
        renderedContent: JSON.stringify(documentDraft),
        templateId: template?.id || null,
        templateSnapshot,
        reportDataSnapshot,
        evidenceEnabled: true,
        generatedAt: new Date(),
        evidenceItems: {
          create: evidenceItems
            .map((item: any, index: number) => ({
              fileName:
                item.fileName ||
                item.title ||
                `evidence-${index + 1}`,
              fileUrl: item.fileUrl || item.url || item.imageUrl || "",
              caption: item.caption || item.note || item.title || null,
              sortOrder: index,
              visible: true,
            }))
            .filter((item: any) => item.fileUrl),
        },
      },
      select: {
        id: true,
      },
    });

    await prisma.platformActivityLog
      .create({
        data: {
          actorUserId: current.user.id,
          schoolAccountId: caseEntry.schoolAccountId,
          category: "REPORTS",
          action: "CREATE_REPORT_ONE",
          severity: "INFO",
          title: "إنشاء تقرير report-1",
          details: {
            reportId: report.id,
            caseEntryId: result.caseEntryId,
            serviceSlug: result.serviceSlug,
            templateId: template?.id || templateId || null,
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      reportId: report.id,
      studioUrl: `/dashboard/report-1/${report.id}/studio`,
    });
  } catch (error) {
    console.error("REPORT_ONE_GENERATE_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "تعذر حفظ التقرير.",
      },
      { status: 500 },
    );
  }
}