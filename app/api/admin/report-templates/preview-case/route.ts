import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  RuntimePreviewCaseData,
  RuntimePreviewCaseValue,
  RuntimePreviewEvidence,
} from "@/lib/report-engine/report-template-runtime-types";

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeCaseValues(caseEntry: {
  values?: Array<{
    fieldKey: string;
    value?: string | null;
    jsonValue?: unknown;
    field?: {
      key?: string | null;
      label?: string | null;
    } | null;
  }>;
}): RuntimePreviewCaseValue[] {
  return (caseEntry.values || []).map((item) => ({
    fieldKey: item.field?.key || item.fieldKey || "unknown",
    fieldLabel: item.field?.label || item.fieldKey || "حقل بدون اسم",
    value: stringifyValue(item.value ?? item.jsonValue),
  }));
}

function normalizeEvidences(caseEntry: {
  evidences?: Array<{
    id: string;
    fileName?: string | null;
    fileUrl?: string | null;
    note?: string | null;
  }>;
  caseEvidences?: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
  }>;
}): RuntimePreviewEvidence[] {
  const normalEvidences: RuntimePreviewEvidence[] = (caseEntry.evidences || [])
    .filter((item) => Boolean(item.fileUrl))
    .map((item) => ({
      id: item.id,
      title: item.fileName || item.note || "شاهد",
      fileUrl: item.fileUrl || undefined,
      imageUrl: item.fileUrl || undefined,
      caption: item.note || undefined,
    }));

  const caseEvidences: RuntimePreviewEvidence[] = (
    caseEntry.caseEvidences || []
  )
    .filter((item) => Boolean(item.fileUrl))
    .map((item) => ({
      id: item.id,
      title: item.fileName || "شاهد",
      fileUrl: item.fileUrl,
      imageUrl: item.fileUrl,
    }));

  return [...normalEvidences, ...caseEvidences];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId")?.trim();

    if (!caseId) {
      return NextResponse.json({
        ok: true,
        mode: "sample",
        message: "لم يتم إدخال Case ID، سيتم استخدام بيانات تجريبية.",
      });
    }

    const caseEntry = await prisma.caseEntry.findUnique({
      where: {
        id: caseId,
      },
      include: {
        service: true,
        workflow: true,
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
      return NextResponse.json({
        ok: true,
        mode: "sample",
        message: "لم يتم العثور على الحالة، سيتم استخدام بيانات تجريبية.",
      });
    }

    const data: RuntimePreviewCaseData = {
      found: true,
      caseId: caseEntry.id,
      serviceSlug: caseEntry.service.slug,
      serviceName: caseEntry.service.name,
      title: caseEntry.title || caseEntry.service.name,
      status: caseEntry.status,
      createdAt: caseEntry.createdAt.toISOString(),
      updatedAt: caseEntry.updatedAt.toISOString(),

      student: caseEntry.student
        ? {
            id: caseEntry.student.id,
            name: caseEntry.student.fullName,
            nationalId: caseEntry.student.nationalId || undefined,
            grade: caseEntry.student.grade || undefined,
            classroom: caseEntry.student.classroom || undefined,
            stage: caseEntry.student.stage || undefined,
            guardianName: caseEntry.student.guardian?.name || undefined,
            guardianPhone: caseEntry.student.guardian?.phone || undefined,
          }
        : undefined,

      values: normalizeCaseValues(caseEntry),
      evidences: normalizeEvidences(caseEntry),
    };

    return NextResponse.json({
      ok: true,
      mode: "case",
      message: "تم جلب بيانات الحالة للمعاينة.",
      data,
    });
  } catch (error) {
    console.error("preview-case error:", error);

    return NextResponse.json(
      {
        ok: true,
        mode: "sample",
        message:
          "تعذر جلب بيانات الحالة بسبب خطأ مؤقت، سيتم استخدام بيانات تجريبية.",
      },
      { status: 200 }
    );
  }
}