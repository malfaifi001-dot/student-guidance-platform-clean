import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth/require-auth";
import { buildSmartReportPayloadForCase } from "@/lib/report-engine/smart-report-payload-builder";
import {
  REPORT_ATTACHED_CERTIFICATES_FIELD_KEY,
  renderLinkedCertificatesAttachmentHtml,
} from "@/lib/certificates/report-certificate-attachments";
import { renderLinkedAssessmentAttachmentsHtml } from "@/lib/report-2/report-linked-assessment-attachments";
import { renderLinkedSurveyAttachmentsHtml } from "@/lib/report-2/report-linked-survey-attachments";
import { roleHasReportTwoCapability } from "@/lib/report-2/report-two-access";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { getActivityProgramsBillingServiceSlug } from "@/lib/activity-programs/activity-program-catalog";
import { prisma } from "@/lib/prisma";
import { generatePdfFromUrlWithCloudflare } from "@/lib/pdf-export/cloudflare-browser-run-pdf";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

type ExportPdfBody = {
  fileName?: string;
  snapshot?: unknown;
};

function getReportTwoExportSnapshotDir() {
  return path.join(process.cwd(), ".tmp", "report-2-export");
}

function safeDownloadFileName(value: unknown) {
  const name = String(value || "report.pdf")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);

  return name.endsWith(".pdf") ? name : `${name || "report"}.pdf`;
}

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    url.protocol.replace(":", "") ||
    "http";

  return `${proto}://${host}`;
}

function getPdfContentDisposition(fileName: string) {
  const asciiFallback = fileName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/["\\]/g, "-")
    .replace(/-+/g, "-") || "report.pdf";
  const encodedFileName = encodeURIComponent(fileName).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`;
}

function isPrivateReportFieldObject(value: Record<string, unknown>) {
  const directKeys = [
    "fieldKey",
    "key",
    "name",
    "id",
    "code",
    "slug",
    "fieldName",
    "technicalName",
  ];

  for (const key of directKeys) {
    if (String(value[key] || "").trim() === REPORT_ATTACHED_CERTIFICATES_FIELD_KEY) {
      return true;
    }
  }

  const textKeys = ["label", "title", "text", "content"];

  for (const key of textKeys) {
    const text = String(value[key] || "").trim();

    if (text === REPORT_ATTACHED_CERTIFICATES_FIELD_KEY) {
      return true;
    }
  }

  return false;
}

function sanitizeReportTwoSnapshot(value: unknown, depth = 0): unknown {
  if (depth > 80) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeReportTwoSnapshot(item, depth + 1))
      .filter((item) => item !== null && item !== undefined);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (isPrivateReportFieldObject(record)) {
      return null;
    }

    const output: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(record)) {
      if (key === REPORT_ATTACHED_CERTIFICATES_FIELD_KEY) {
        continue;
      }

      const cleaned = sanitizeReportTwoSnapshot(item, depth + 1);

      if (cleaned !== null && cleaned !== undefined) {
        output[key] = cleaned;
      }
    }

    return output;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === REPORT_ATTACHED_CERTIFICATES_FIELD_KEY) {
      return "";
    }
  }

  return value;
}

async function cleanupStaleSnapshots(ttlMs = 60 * 60 * 1000) {
  const dir = getReportTwoExportSnapshotDir();

  try {
    const files = await fs.readdir(dir);
    const now = Date.now();

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(dir, file);

      try {
        const stat = await fs.stat(filePath);

        if (now - stat.mtimeMs > ttlMs) {
          await fs.unlink(filePath);
        }
      } catch {
        /* race condition with concurrent delete; skip */
      }
    }
  } catch {
    /* dir doesn't exist yet; nothing to clean */
  }
}

async function readBody(request: Request): Promise<ExportPdfBody> {
  try {
    return (await request.json()) as ExportPdfBody;
  } catch {
    return {};
  }
}

export async function POST(request: Request, context: RouteContext) {
  const current = await requireDashboardUser();
  const { caseId } = await context.params;

  if (!roleHasReportTwoCapability(current.user.role, "REPORT_EXPORT")) {
    return NextResponse.json({ error: "لا تملك صلاحية تصدير التقرير." }, { status: 403 });
  }

  const access = await buildSmartReportPayloadForCase({
    caseId,
    current,
  });

  if (!access.ok) {
    return NextResponse.json(
      {
        error:
          "لا تملك صلاحية تصدير هذا التقرير أو أن الحالة غير موجودة.",
      },
      {
        status: access.status || 404,
      },
    );
  }

  const officialReport = await prisma.reportTwoActive.findFirst({
    where: {
      caseEntryId: caseId,
      status: "APPROVED",
      ...(current.user.role === "ADMIN"
        ? {}
        : { schoolAccountId: current.user.schoolAccountId || "__missing__" }),
    },
    select: { id: true },
  });
  if (!officialReport) {
    return NextResponse.json(
      { error: "يجب اعتماد التقرير قبل الطباعة أو التصدير." },
      { status: 409 },
    );
  }

  const serviceGuard = await requireServiceAccessApi(
    getActivityProgramsBillingServiceSlug(access.serviceSlug),
  );
  if (serviceGuard) return serviceGuard;

  const body = await readBody(request);
  const snapshot = sanitizeReportTwoSnapshot(body.snapshot) as any;

  if (!snapshot?.template?.pages?.length) {
    return NextResponse.json(
      {
        error: "بيانات التقرير غير جاهزة للتصدير.",
      },
      {
        status: 400,
      },
    );
  }

  const token = crypto.randomUUID();
  const snapshotDir = getReportTwoExportSnapshotDir();
  const snapshotPath = path.join(snapshotDir, `${token}.json`);
  const origin = getRequestOrigin(request);
  const previewUrl = `${origin}/report-2-export-preview/${token}`;
  const fileName = safeDownloadFileName(body.fileName || "report.pdf");
  const linkedCertificatesHtml = await renderLinkedCertificatesAttachmentHtml(
    caseId,
    {
      baseUrl: origin,
      role: current.user.role,
      fallbackIssuerName:
        current.user.officialName || current.user.name || "المستخدم",
    },
  );
  const linkedAssessmentsHtml = await renderLinkedAssessmentAttachmentsHtml(
    caseId,
    {
      baseUrl: origin,
    },
  );
  const linkedSurveysHtml = await renderLinkedSurveyAttachmentsHtml(
    caseId,
    {
      baseUrl: origin,
      cookie: request.headers.get("cookie") || "",
    },
  );
  const linkedAttachmentsHtml = `${linkedCertificatesHtml}${linkedAssessmentsHtml}${linkedSurveysHtml}`;

  await fs.mkdir(snapshotDir, {
    recursive: true,
  });

  const exportSnapshot = {
    ...snapshot,
    __linkedAttachmentsHtml: linkedAttachmentsHtml,
  };

  await fs.writeFile(snapshotPath, JSON.stringify(exportSnapshot), "utf8");

  cleanupStaleSnapshots().catch(() => null);

  try {
      const pdfRenderUrl = `${previewUrl}?pdf=1`;

      console.log("REPORT_TWO_PDF_RENDER_URL", {
        url: pdfRenderUrl,
      });

      const pdfBytes = await generatePdfFromUrlWithCloudflare({
        request,
        url: pdfRenderUrl,
        waitForSelector: ".pdf-report-page",
      });
      const pdfBody = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      ) as ArrayBuffer;

      return new Response(pdfBody, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": getPdfContentDisposition(fileName),
          "Cache-Control": "private, no-store",
        },
      });
  } catch (error) {
    console.error("Report 2 local PDF generation failed.", {
      message: error instanceof Error ? error.message : "Unknown local PDF error",
    });
  }

  return NextResponse.json(
    { error: "تعذر إنشاء ملف PDF حقيقي لهذا التقرير. حاول مرة أخرى." },
    { status: 503 },
  );
}
