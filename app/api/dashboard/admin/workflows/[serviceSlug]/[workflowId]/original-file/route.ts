import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import {
  getWorkflowExcelExtension,
  readWorkflowOriginalFile,
  workflowOriginalFileExists,
} from "@/lib/storage/workflow-original-file-storage";

type RouteContext = {
  params: Promise<{ serviceSlug: string; workflowId: string }>;
};

function safeDownloadName(value: string, extension: string) {
  const cleaned = value
    .replace(/[\r\n]/g, " ")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim()
    .slice(0, 240);
  const name = cleaned || `workflow.${extension}`;
  return getWorkflowExcelExtension(name) ? name : `${name}.${extension}`;
}

function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "workflow.xlsx";
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(_request: Request, context: RouteContext) {
  const adminError = await requireAdminApi();
  if (adminError) return adminError;

  const { serviceSlug, workflowId } = await context.params;
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, service: { slug: serviceSlug } },
    select: {
      originalFileName: true,
      originalFileStorageKey: true,
    },
  });

  if (!workflow?.originalFileStorageKey) {
    return NextResponse.json(
      { error: "ملف Excel الأصلي غير محفوظ لهذه النسخة القديمة." },
      { status: 404 },
    );
  }

  const extension = getWorkflowExcelExtension(workflow.originalFileStorageKey);
  if (!extension || !(await workflowOriginalFileExists(workflow.originalFileStorageKey))) {
    return NextResponse.json({ error: "ملف Excel الأصلي غير موجود." }, { status: 404 });
  }

  const buffer = await readWorkflowOriginalFile(workflow.originalFileStorageKey);
  const fileName = safeDownloadName(
    workflow.originalFileName || `workflow-${workflowId}.${extension}`,
    extension,
  );
  const allowedMimeType =
    extension === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/vnd.ms-excel";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": allowedMimeType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": contentDisposition(fileName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
