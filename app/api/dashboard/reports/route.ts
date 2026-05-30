import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const templateSnapshot = createDefaultTemplateSnapshot(templateId);
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