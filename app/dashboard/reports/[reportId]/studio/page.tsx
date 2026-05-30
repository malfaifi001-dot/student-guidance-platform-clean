import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportStudioEditor } from "@/components/reports/report-studio-editor";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

type SnapshotValue = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
};

export default async function ReportStudioPage({ params }: PageProps) {
  const { reportId } = await params;

  const report = await prisma.guidanceReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
      evidenceItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      caseEntry: {
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
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  const snapshotValues = extractSnapshotValues(report.reportDataSnapshot);

  const liveCaseValues = report.caseEntry.values.map((item) => ({
    fieldKey: item.field?.key || item.fieldKey || item.id,
    fieldLabel: item.field?.label || item.fieldKey || "قيمة من التقرير",
    value: stringifyValue(item.value ?? item.jsonValue),
  }));

  const reportValues = snapshotValues.length ? snapshotValues : liveCaseValues;

  const normalizedReport = {
    id: report.id,
    title: report.title,
    serviceSlug: report.serviceSlug,
    status: report.status,
    genderMode: report.genderMode,
    templateId: report.templateId,
    hasTemplateSnapshot: Boolean(report.templateSnapshot),
    hasReportDataSnapshot: Boolean(report.reportDataSnapshot),
    editableContent: report.editableContent || "",
    renderedContent: report.renderedContent || "",
    generatedAt: report.generatedAt?.toISOString() || null,
    approvedAt: report.approvedAt?.toISOString() || null,
    archivedAt: report.archivedAt?.toISOString() || null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),

    reportValues,

    evidenceItems: report.evidenceItems.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      fileUrl: item.fileUrl,
      caption: item.caption,
      mimeType: item.mimeType,
      size: item.size,
      sortOrder: item.sortOrder,
      visible: item.visible,
      createdAt: item.createdAt.toISOString(),
    })),

    caseEntry: {
      id: report.caseEntry.id,
      title: report.caseEntry.title,
      status: report.caseEntry.status,
      createdAt: report.caseEntry.createdAt.toISOString(),

      service: {
        id: report.caseEntry.service.id,
        name: report.caseEntry.service.name,
        slug: report.caseEntry.service.slug,
      },

      student: report.caseEntry.student
        ? {
            id: report.caseEntry.student.id,
            fullName: report.caseEntry.student.fullName,
            nationalId: report.caseEntry.student.nationalId,
            stage: report.caseEntry.student.stage,
            grade: report.caseEntry.student.grade,
            classroom: report.caseEntry.student.classroom,
            guardianName: report.caseEntry.student.guardian?.name || null,
            guardianPhone: report.caseEntry.student.guardian?.phone || null,
          }
        : null,
    },
  };

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">
        <div>
          <p className="text-sm font-bold text-sky-100">Report Live Studio</p>

          <h1 className="mt-3 text-4xl font-black">تحرير التقرير</h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-sky-50">
            عدّل النصوص وقيم التقرير قبل الاعتماد. التعديل هنا لا يغيّر الحالة
            الأصلية، بل يحفظ نسخة تحريرية داخل التقرير فقط.
          </p>
        </div>
      </section>

      <ReportStudioEditor report={normalizedReport} />
    </main>
  );
}

function extractSnapshotValues(value: unknown): SnapshotValue[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const snapshot = value as {
    values?: Array<{
      fieldKey?: unknown;
      fieldLabel?: unknown;
      value?: unknown;
    }>;
  };

  if (!Array.isArray(snapshot.values)) {
    return [];
  }

  return snapshot.values
    .map((item, index) => ({
      fieldKey:
        typeof item.fieldKey === "string" && item.fieldKey.trim()
          ? item.fieldKey
          : `snapshot-field-${index}`,
      fieldLabel:
        typeof item.fieldLabel === "string" && item.fieldLabel.trim()
          ? item.fieldLabel
          : `قيمة رقم ${index + 1}`,
      value: stringifyValue(item.value),
    }))
    .filter((item) => item.fieldLabel.trim());
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join("، ");
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}