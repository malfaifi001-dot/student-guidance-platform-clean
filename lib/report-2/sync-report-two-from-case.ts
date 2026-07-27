import { Prisma, type ReportTwoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import {
  buildReportTwoPreviewCase,
  buildReportTwoRenderContext,
  getReportTwoSourceFields,
} from "@/lib/report-2/report-two-structured-data";

type CurrentUser = Parameters<typeof buildSmartReportPayloadForCase>[0]["current"];

function json(value: unknown, fallback: unknown) {
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return fallback as Prisma.InputJsonValue;
  }
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function mergeBoundValues(
  current: unknown,
  oldPayload: unknown,
  nextPayload: unknown,
): unknown {
  const oldFields = getReportTwoSourceFields(oldPayload);
  const nextFields = getReportTwoSourceFields(nextPayload);

  function visit(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== "object") return value;

    const record = value as Record<string, unknown>;
    const nextRecord: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      nextRecord[key] = visit(child);
    }

    const lookupKeys = [record.boundFieldKey, record.sourceKey, record.key, record.id, record.label]
      .map((item) => clean(item).toLowerCase())
      .filter(Boolean);
    const nextSource = lookupKeys.map((key) => nextFields.get(key)).find(Boolean);
    const oldSource = lookupKeys.map((key) => oldFields.get(key)).find(Boolean);
    if (!nextSource) return nextRecord;

    const explicitlyBound = Boolean(record.boundFieldKey || record.sourceKey);
    const configuredValue = clean(record.value);
    const wasSourceValue =
      !configuredValue ||
      (oldSource && configuredValue === clean(oldSource.value));

    if (explicitlyBound || wasSourceValue) {
      nextRecord.value = nextSource.value;
      if (nextSource.valueItems.length) {
        nextRecord.valueItems = nextSource.valueItems;
      } else {
        delete nextRecord.valueItems;
      }
    }

    return nextRecord;
  }

  return visit(current);
}

export type ReportTwoSyncResult =
  | { attempted: false; updated: false; reason: "NO_PERSISTED_REPORT" }
  | {
      attempted: true;
      updated: true;
      reportId: string;
      status: "DRAFT" | "APPROVED";
      approvedAt: string | null;
      message: string;
    };

export async function syncReportTwoFromCase(input: {
  caseId: string;
  schoolAccountId: string;
  actorUserId: string;
  current: CurrentUser;
  changedFieldKeys: string[];
}): Promise<ReportTwoSyncResult> {
  let active = await prisma.reportTwoActive.findFirst({
    where: { caseEntryId: input.caseId, schoolAccountId: input.schoolAccountId },
  });

  if (!active) {
    const historical = await prisma.reportSnapshot.findFirst({
      where: { caseEntryId: input.caseId, schoolAccountId: input.schoolAccountId },
      orderBy: { approvedAt: "desc" },
    });
    if (!historical) {
      return { attempted: false, updated: false, reason: "NO_PERSISTED_REPORT" };
    }

    active = await prisma.reportTwoActive.create({
      data: {
        id: historical.id,
        caseEntryId: historical.caseEntryId,
        schoolAccountId: historical.schoolAccountId || input.schoolAccountId,
        serviceSlug: historical.serviceSlug,
        serviceName: historical.serviceName,
        status: "APPROVED",
        reportTitle: historical.reportTitle,
        templateId: historical.templateId,
        templateName: historical.templateName,
        variantId: historical.variantId,
        sourcePayload: historical.snapshotPayload as Prisma.InputJsonValue,
        templateJson:
          historical.snapshotTemplateJson === null
            ? Prisma.JsonNull
            : (historical.snapshotTemplateJson as Prisma.InputJsonValue),
        pagesJson:
          historical.snapshotPagesJson === null
            ? Prisma.JsonNull
            : (historical.snapshotPagesJson as Prisma.InputJsonValue),
        renderedHtml: historical.snapshotHtml,
        pdfUrl: historical.pdfUrl,
        approvedById: historical.approvedById,
        approvedByName: historical.approvedByName,
        approvedAt: historical.approvedAt,
        savedAt: historical.createdAt,
      },
    });
  }

  const built = await buildSmartReportPayloadForCase({
    caseId: input.caseId,
    current: input.current,
  });
  if (!built.ok) throw new Error(built.message);
  if (active.serviceSlug && active.serviceSlug !== built.serviceSlug) {
    throw new Error("REPORT_TWO_SERVICE_MISMATCH");
  }

  const synchronizedAt = new Date();
  const mergedTemplate = mergeBoundValues(
    active.templateJson,
    active.sourcePayload,
    built.payload,
  );
  const mergedEditorState = mergeBoundValues(
    active.editorState,
    active.sourcePayload,
    built.payload,
  );
  const mergedPages =
    mergedTemplate && typeof mergedTemplate === "object" &&
    Array.isArray((mergedTemplate as Record<string, unknown>).pages)
      ? (mergedTemplate as Record<string, unknown>).pages
      : mergeBoundValues(active.pagesJson, active.sourcePayload, built.payload);
  const renderContext = buildReportTwoRenderContext(built.payload);
  const previewCase = buildReportTwoPreviewCase(built.payload);
  const status = active.status as ReportTwoStatus;
  const action =
    status === "APPROVED"
      ? "APPROVED_REPORT_TWO_SYNCED_FROM_CASE"
      : "REPORT_TWO_DRAFT_SYNCED_FROM_CASE";

  const updated = await prisma.$transaction(async (tx) => {
    const latest = await tx.reportTwoActive.findUnique({ where: { id: active!.id } });
    if (!latest || latest.version !== active!.version) {
      throw new Error("REPORT_TWO_STALE_VERSION");
    }

    const report = await tx.reportTwoActive.update({
      where: { id: active!.id, version: active!.version },
      data: {
        sourcePayload: json(built.payload, {}),
        editorState: json(mergedEditorState, null),
        templateJson: json(mergedTemplate, null),
        pagesJson: json(mergedPages, null),
        renderContext: json(renderContext, {}),
        previewCase: json(previewCase, {}),
        lastSyncedAt: synchronizedAt,
        syncMeta: json({
          synchronizedAt: synchronizedAt.toISOString(),
          synchronizedById: input.actorUserId,
          editedAfterApproval: status === "APPROVED",
        }, {}),
        version: { increment: 1 },
      },
    });

    if (input.changedFieldKeys.length) {
      await tx.platformActivityLog.create({
        data: {
          actorUserId: input.actorUserId,
          schoolAccountId: input.schoolAccountId,
          category: "REPORT",
          action,
          severity: "INFO",
          title:
            status === "APPROVED"
              ? "تم تحديث تقرير معتمد من بيانات الحالة"
              : "تم تحديث تقرير مسودة من بيانات الحالة",
          details: json({
            reportId: report.id,
            caseEntryId: input.caseId,
            serviceSlug: built.serviceSlug,
            reportStatus: report.status,
            actorUserId: input.actorUserId,
            changedWorkflowFieldKeys: input.changedFieldKeys,
            synchronizedSectionNames: ["sourcePayload", "workflowBoundFields", "evidenceSources"],
            approvedAt: report.approvedAt?.toISOString() || null,
            synchronizedAt: synchronizedAt.toISOString(),
          }, {}),
        },
      });
    }

    return report;
  });

  return {
    attempted: true,
    updated: true,
    reportId: updated.id,
    status: updated.status as "DRAFT" | "APPROVED",
    approvedAt: updated.approvedAt?.toISOString() || null,
    message:
      updated.status === "APPROVED"
        ? "تم تحديث التقرير المعتمد من بيانات الحالة مع بقاء حالة الاعتماد."
        : "تم تحديث تقرير المسودة من بيانات الحالة.",
  };
}
