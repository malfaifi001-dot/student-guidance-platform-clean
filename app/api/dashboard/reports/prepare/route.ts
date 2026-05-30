import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapCaseEntryToReportData } from "@/lib/report-engine/report-case-data-mapper";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId")?.trim();

    if (!caseId) {
      return NextResponse.json(
        {
          ok: false,
          error: "caseId مطلوب لتجهيز بيانات التقرير.",
        },
        { status: 400 }
      );
    }

    const caseEntry = await prisma.caseEntry.findUnique({
      where: {
        id: caseId,
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
          ok: false,
          error: "الحالة غير موجودة.",
        },
        { status: 404 }
      );
    }

    const reportData = mapCaseEntryToReportData(caseEntry);

    return NextResponse.json({
      ok: true,
      reportData,
    });
  } catch (error) {
    console.error("prepare report error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "تعذر تجهيز بيانات التقرير.",
      },
      { status: 500 }
    );
  }
}