import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    template?: string;
    evidenceLayout?: string;
    cover?: string;
    editorial?: string;
    studio?: string;
    v?: string;
  }>;
};

type WorkflowValueOverride = {
  fieldKey: string;
  fieldLabel: string;
  originalValue: string;
  editedValue: string;
};

type EditableContentPayload = {
  blocks?: Record<string, string>;
  workflowValueOverrides?: WorkflowValueOverride[];
};

type ReportValueItem = {
  fieldKey: string;
  fieldLabel: string;
  originalValue: string;
  displayValue: string;
  isChanged: boolean;
};

const blockLabels: Record<string, string> = {
  summaryIntro: "ملخص التقرير",
  intro: "مقدمة التقرير",
  goals: "أهداف البرنامج",
  procedures: "الإجراءات",
  results: "النتائج",
  recommendations: "التوصيات",
  closingNotes: "ملاحظات ختامية",
  evidenceNotes: "ملاحظات الشواهد",
};

const blockOrder = [
  "summaryIntro",
  "intro",
  "goals",
  "procedures",
  "results",
  "recommendations",
  "closingNotes",
  "evidenceNotes",
];

export default async function ReportRealPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const studioMode = resolvedSearchParams.studio === "true";
  const showEditorial = resolvedSearchParams.editorial !== "false";

  const report = await prisma.guidanceReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
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
          evidences: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
      evidenceItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  const parsedEditableContent = parseEditableContent(report.editableContent);
  const workflowValueOverrides =
    parsedEditableContent.workflowValueOverrides || [];

  const reportValues = buildReportValues(
    report.caseEntry.values,
    workflowValueOverrides
  );

  const editorialSections = buildEditorialSections({
    renderedContent: report.renderedContent,
    editableContent: report.editableContent,
    parsedEditableContent,
    workflowValueOverrides,
  });

  return (
    <main
      dir="rtl"
      className={
        studioMode
          ? "min-h-screen bg-slate-100 px-4 py-5"
          : "min-h-screen bg-slate-100 px-8 py-8"
      }
    >
      {!studioMode ? (
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-black text-sky-700">معاينة التقرير</p>

            <h1 className="mt-2 text-2xl font-black text-slate-900">
              {report.title}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {report.caseEntry.service.name}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/dashboard/reports/${report.id}/studio`}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              تعديل التقرير
            </Link>

            <Link
              href="/dashboard/reports"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
            >
              الرجوع للتقارير
            </Link>
          </div>
        </div>
      ) : null}

      <section className="mx-auto min-h-[297mm] w-[210mm] max-w-full overflow-hidden rounded-3xl bg-white shadow-sm">
        <ReportHeader
          title={report.title}
          serviceName={report.caseEntry.service.name}
          templateId={report.templateId}
          status={report.status}
        />

        <div className="space-y-8 p-12">
          <ReportSummary
            serviceName={report.caseEntry.service.name}
            studentName={report.caseEntry.student?.fullName || "غير مرتبط"}
            nationalId={report.caseEntry.student?.nationalId || "غير متوفر"}
            grade={report.caseEntry.student?.grade || "غير محدد"}
            classroom={report.caseEntry.student?.classroom || "غير محدد"}
            guardianName={
              report.caseEntry.student?.guardian?.name || "غير متوفر"
            }
            guardianPhone={
              report.caseEntry.student?.guardian?.phone || "غير متوفر"
            }
            reportStatus={getReportStatusName(report.status)}
            templateId={report.templateId || "غير محدد"}
            createdAt={report.createdAt.toISOString()}
          />

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  بيانات الحالة
                </h3>

                <p className="mt-1 text-sm leading-7 text-slate-500">
                  القيم التالية مصدرها Workflow. اسم القيمة ثابت، والمحتوى قد
                  يكون أصليًا أو معدلًا داخل التقرير.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                {reportValues.length} قيمة
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {reportValues.map((item) => (
                <ReportValueBox key={item.fieldKey} item={item} />
              ))}
            </div>

            {!reportValues.length ? (
              <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
                لا توجد قيم محفوظة في هذه الحالة.
              </p>
            ) : null}
          </section>

          {showEditorial ? (
            <section className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-emerald-950">
                    المحتوى التحريري
                  </h3>

                  <p className="mt-1 text-sm leading-7 text-emerald-800">
                    هذا المحتوى قابل للتعديل من Studio، ويظهر في التقرير بدون
                    التأثير على الحالة الأصلية.
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">
                  محفوظ داخل التقرير
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {editorialSections.length ? (
                  editorialSections.map((section) => (
                    <EditorialSection
                      key={section.title}
                      title={section.title}
                      content={section.content}
                    />
                  ))
                ) : (
                  <p className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-500">
                    لا يوجد محتوى تحريري محفوظ بعد.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-black text-slate-900">الشواهد</h3>

                <p className="mt-1 text-sm leading-7 text-slate-500">
                  الشواهد المرتبطة بالتقرير.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                {report.evidenceItems.length} شاهد
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {report.evidenceItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-black text-slate-900">
                    {item.caption || item.fileName}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.mimeType || "ملف"} —{" "}
                    {item.visible ? "ظاهر" : "مخفي"}
                  </p>
                </div>
              ))}
            </div>

            {!report.evidenceItems.length ? (
              <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                لا توجد شواهد مرتبطة بهذا التقرير.
              </p>
            ) : null}
          </section>
        </div>

        <ReportFooter />
      </section>
    </main>
  );
}

function ReportHeader({
  title,
  serviceName,
  templateId,
  status,
}: {
  title: string;
  serviceName: string;
  templateId?: string | null;
  status: string;
}) {
  return (
    <header className="border-b border-slate-200 bg-gradient-to-br from-white to-slate-50 px-12 py-10 text-center">
      <p className="text-sm font-black text-slate-500">تقرير محفوظ</p>

      <h2 className="mt-4 text-4xl font-black leading-[1.7] text-emerald-950">
        {title}
      </h2>

      <p className="mt-2 text-sm font-bold text-slate-500">{serviceName}</p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          {getReportStatusName(status)}
        </span>

        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
          {getTemplateName(templateId)}
        </span>
      </div>
    </header>
  );
}

function ReportSummary({
  serviceName,
  studentName,
  nationalId,
  grade,
  classroom,
  guardianName,
  guardianPhone,
  reportStatus,
  templateId,
  createdAt,
}: {
  serviceName: string;
  studentName: string;
  nationalId: string;
  grade: string;
  classroom: string;
  guardianName: string;
  guardianPhone: string;
  reportStatus: string;
  templateId: string;
  createdAt: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <h3 className="text-xl font-black text-slate-900">ملخص التقرير</h3>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoRow label="الخدمة" value={serviceName} />
        <InfoRow label="الطالب/الطالبة" value={studentName} />
        <InfoRow label="رقم الهوية" value={nationalId} />
        <InfoRow label="الصف" value={grade} />
        <InfoRow label="الفصل" value={classroom} />
        <InfoRow label="ولي الأمر" value={guardianName} />
        <InfoRow label="جوال ولي الأمر" value={guardianPhone} />
        <InfoRow label="حالة التقرير" value={reportStatus} />
        <InfoRow label="القالب" value={getTemplateName(templateId)} />
        <InfoRow label="تاريخ الإنشاء" value={formatDate(createdAt)} />
      </div>
    </section>
  );
}

function ReportValueBox({ item }: { item: ReportValueItem }) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        item.isChanged
          ? "border-emerald-200 bg-white"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-500">اسم القيمة</p>

          <h4 className="mt-1 text-sm font-black text-slate-900">
            {item.fieldLabel}
          </h4>
        </div>

        {item.isChanged ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
            معدل
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
            أصلي
          </span>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-800">
        {item.displayValue || "—"}
      </p>
    </div>
  );
}

function EditorialSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5">
      <h4 className="text-base font-black text-emerald-950">{title}</h4>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-slate-800">
        {content}
      </p>
    </div>
  );
}

function ReportFooter() {
  return (
    <footer className="border-t border-slate-200 px-12 py-5">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
        <span>منصة التوجيه الطلابي</span>
        <span>تقرير محفوظ</span>
      </div>
    </footer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-black leading-7 text-slate-900">
        {value || "—"}
      </p>
    </div>
  );
}

function buildReportValues(
  values: Array<{
    id: string;
    fieldKey?: string | null;
    value?: string | null;
    jsonValue?: unknown;
    field?: {
      key?: string | null;
      label?: string | null;
    } | null;
  }>,
  overrides: WorkflowValueOverride[]
): ReportValueItem[] {
  const overrideMap = new Map<string, WorkflowValueOverride>();

  for (const override of overrides) {
    if (override.fieldKey) {
      overrideMap.set(override.fieldKey, override);
    }

    if (override.fieldLabel) {
      overrideMap.set(override.fieldLabel, override);
    }
  }

  return values.map((item, index) => {
    const fieldKey = item.field?.key || item.fieldKey || item.id;
    const fieldLabel =
      item.field?.label || item.fieldKey || `قيمة رقم ${index + 1}`;

    const originalValue = stringifyValue(item.value ?? item.jsonValue);

    const override =
      overrideMap.get(fieldKey) ||
      overrideMap.get(fieldLabel) ||
      overrideMap.get(item.fieldKey || "");

    const displayValue = override?.editedValue ?? originalValue;

    return {
      fieldKey,
      fieldLabel,
      originalValue,
      displayValue,
      isChanged: Boolean(
        override && override.editedValue.trim() !== originalValue.trim()
      ),
    };
  });
}

function parseEditableContent(value?: string | null): EditableContentPayload {
  const content = value?.trim();

  if (!content) {
    return {};
  }

  try {
    const parsed = JSON.parse(content) as EditableContentPayload;

    if (parsed && typeof parsed === "object") {
      return parsed;
    }

    return {};
  } catch {
    return {};
  }
}

function buildEditorialSections({
  renderedContent,
  editableContent,
  parsedEditableContent,
  workflowValueOverrides,
}: {
  renderedContent?: string | null;
  editableContent?: string | null;
  parsedEditableContent: EditableContentPayload;
  workflowValueOverrides: WorkflowValueOverride[];
}) {
  const sections: Array<{ title: string; content: string }> = [];

  const changedWorkflowValues = workflowValueOverrides.filter(
    (item) => item.editedValue.trim() !== item.originalValue.trim()
  );

  if (changedWorkflowValues.length) {
    sections.push({
      title: "قيم التقرير المعدلة",
      content: changedWorkflowValues
        .map((item) => `${item.fieldLabel}\n${item.editedValue.trim()}`)
        .join("\n\n"),
    });
  }

  if (parsedEditableContent.blocks) {
    for (const key of blockOrder) {
      const content = parsedEditableContent.blocks[key]?.trim();

      if (content) {
        sections.push({
          title: blockLabels[key] || key,
          content,
        });
      }
    }

    return sections;
  }

  const rendered = renderedContent?.trim();

  if (rendered && !looksLikeJson(rendered)) {
    sections.push({
      title: "المحتوى التحريري",
      content: rendered,
    });

    return sections;
  }

  const editable = editableContent?.trim();

  if (editable && !looksLikeJson(editable)) {
    sections.push({
      title: "المحتوى التحريري",
      content: editable,
    });
  }

  return sections;
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

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getReportStatusName(status: string) {
  if (status === "APPROVED") return "معتمد";
  if (status === "GENERATED") return "مولّد";
  if (status === "ARCHIVED") return "مؤرشف";
  return "مسودة";
}

function getTemplateName(templateId?: string | null) {
  if (templateId === "visual-activity") return "القالب البصري";
  if (templateId === "executive-brief") return "القالب المختصر";
  if (templateId === "official-long") return "القالب الرسمي";
  return "غير محدد";
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return value;
  }
}