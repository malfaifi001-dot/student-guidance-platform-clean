import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function valueToText(value: {
  fieldKey: string;
  value: string | null;
  jsonValue: unknown;
}) {
  if (value.value) return value.value;
  if (typeof value.jsonValue === "string") return value.jsonValue;
  if (value.jsonValue) return JSON.stringify(value.jsonValue);
  return "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.caseEntryId) {
      return NextResponse.json(
        { error: "caseEntryId مطلوب لإنشاء التقرير." },
        { status: 400 }
      );
    }

    const caseEntry = await prisma.caseEntry.findUnique({
      where: {
        id: body.caseEntryId,
      },
      include: {
        service: true,
        student: true,
        values: true,
        evidences: true,
      },
    });

    if (!caseEntry) {
      return NextResponse.json(
        { error: "السجل غير موجود." },
        { status: 404 }
      );
    }

    const valuesText = caseEntry.values
      .map((item) => `${item.fieldKey}: ${valueToText(item)}`)
      .join("\n");

    const initialContent = `
تقرير عن ${caseEntry.title || caseEntry.service.name}

تم تنفيذ خدمة إرشادية ضمن خدمة "${caseEntry.service.name}".

بيانات السجل:
${valuesText}

تم توثيق الإجراءات والنتائج بناءً على البيانات المسجلة في النظام.
`.trim();

    const report = await prisma.guidanceReport.create({
      data: {
        title: body.title || `تقرير - ${caseEntry.title || caseEntry.service.name}`,
        serviceSlug: caseEntry.service.slug,
        caseEntryId: caseEntry.id,
        genderMode: caseEntry.student?.gender === "FEMALE" ? "FEMALE" : "MALE",
        editableContent: initialContent,
        renderedContent: initialContent,
        evidenceItems: {
          create: caseEntry.evidences
            .filter((item) => item.fileUrl)
            .map((item, index) => ({
              fileName: item.fileName || `evidence-${index + 1}`,
              fileUrl: item.fileUrl || "",
              caption: item.note || item.fileName || null,
              sortOrder: index,
              visible: true,
            })),
        },
      },
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "فشل إنشاء التقرير.",
      },
      { status: 400 }
    );
  }
}