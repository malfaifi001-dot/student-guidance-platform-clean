"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type StudioReportStatus =
  | "DRAFT"
  | "GENERATED"
  | "APPROVED"
  | "ARCHIVED"
  | string;

type ReportValue = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
};

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  caption?: string | null;
  mimeType?: string | null;
  size?: number | null;
  sortOrder: number;
  visible: boolean;
  createdAt: string;
};

type WorkflowValueOverride = {
  fieldKey: string;
  fieldLabel: string;
  originalValue: string;
  editedValue: string;
};

type EditorialBlocks = {
  intro: string;
  goals: string;
  procedures: string;
  results: string;
  recommendations: string;
  closingNotes: string;
  evidenceNotes: string;
};

type StudioReport = {
  id: string;
  title: string;
  serviceSlug: string;
  status: StudioReportStatus;
  genderMode: string;
  templateId?: string | null;
  editableContent: string;
  renderedContent: string;
  createdAt: string;
  updatedAt: string;
  generatedAt?: string | null;
  approvedAt?: string | null;
  archivedAt?: string | null;

  reportValues: ReportValue[];
  evidenceItems: EvidenceItem[];

  caseEntry: {
    id: string;
    title?: string | null;
    status: string;
    createdAt: string;
    service: {
      id: string;
      name: string;
      slug: string;
    };
    student?: {
      id: string;
      fullName: string;
      nationalId?: string | null;
      stage?: string | null;
      grade?: string | null;
      classroom?: string | null;
      guardianName?: string | null;
      guardianPhone?: string | null;
    } | null;
  };
};

type ReportStudioEditorProps = {
  report: StudioReport;
};

type EditorTab = "overview" | "texts" | "values" | "evidence" | "final";

type EvidenceLayoutMode =
  | "auto"
  | "one-per-page"
  | "two-per-page"
  | "grid-2x2"
  | "compact";

type FeedbackState =
  | {
      type: "success" | "error" | "warning" | "info";
      title: string;
      message: string;
    }
  | null;

const DEFAULT_BLOCKS: EditorialBlocks = {
  intro: "",
  goals: "",
  procedures: "",
  results: "",
  recommendations: "",
  closingNotes: "",
  evidenceNotes: "",
};

const EVIDENCE_LAYOUT_OPTIONS: Array<{
  id: EvidenceLayoutMode;
  label: string;
  helper: string;
}> = [
  {
    id: "auto",
    label: "تلقائي",
    helper: "النظام يختار الأنسب حسب عدد الشواهد.",
  },
  {
    id: "one-per-page",
    label: "شاهد لكل صفحة",
    helper: "مناسب للشواهد المهمة أو الصور الكبيرة.",
  },
  {
    id: "two-per-page",
    label: "شاهدان في كل صفحة",
    helper: "توازن جيد بين الوضوح وتقليل الصفحات.",
  },
  {
    id: "grid-2x2",
    label: "أربعة شواهد 2×2",
    helper: "مناسب للصور الصغيرة أو الشواهد المتعددة.",
  },
  {
    id: "compact",
    label: "مختصر",
    helper: "يعرض الشواهد بشكل مضغوط داخل التقرير.",
  },
];

const TEXT_BLOCKS: Array<{
  key: keyof EditorialBlocks;
  title: string;
  helper: string;
  placeholder: string;
}> = [
  {
    key: "intro",
    title: "مقدمة التقرير",
    helper: "صياغة افتتاحية مختصرة تظهر في بداية التقرير عند الحاجة.",
    placeholder:
      "مثال: بناءً على تنفيذ الخدمة الإرشادية وتوثيق بيانات الحالة، تم إعداد هذا التقرير لعرض أبرز الإجراءات والنتائج...",
  },
  {
    key: "goals",
    title: "الأهداف",
    helper: "أهداف التقرير أو البرنامج بصياغة رسمية.",
    placeholder:
      "مثال: يهدف التقرير إلى توثيق الإجراءات الإرشادية، وقياس أثر البرنامج، وتحديد التوصيات المناسبة...",
  },
  {
    key: "procedures",
    title: "الإجراءات",
    helper: "ما تم تنفيذه أو متابعته داخل الحالة أو الخدمة.",
    placeholder:
      "مثال: تم تنفيذ لقاء إرشادي، وتوثيق الشواهد، ومراجعة البيانات المرتبطة بالحالة...",
  },
  {
    key: "results",
    title: "النتائج",
    helper: "أهم المخرجات التي ترغب في إظهارها في التقرير.",
    placeholder:
      "مثال: أظهرت المتابعة تحسنًا في المؤشرات المستهدفة مع الحاجة إلى استمرار المتابعة...",
  },
  {
    key: "recommendations",
    title: "التوصيات",
    helper: "توصيات عملية مختصرة قابلة للتنفيذ.",
    placeholder:
      "مثال: يوصى باستمرار المتابعة، وتعزيز التواصل مع الأسرة، وتوثيق المستجدات في سجل الحالة...",
  },
  {
    key: "closingNotes",
    title: "ملاحظات ختامية",
    helper: "ملاحظات عامة قبل الاعتماد النهائي.",
    placeholder: "اكتب أي ملاحظات ختامية مناسبة للتقرير...",
  },
  {
    key: "evidenceNotes",
    title: "ملاحظات الشواهد",
    helper: "ملاحظات مرتبطة بالمرفقات والصور.",
    placeholder:
      "مثال: تم إرفاق الشواهد الداعمة للتقرير لأغراض التوثيق والمتابعة...",
  },
];

export function ReportStudioEditor({ report }: ReportStudioEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const locked = report.status === "APPROVED" || report.status === "ARCHIVED";
  const [activeTab, setActiveTab] = useState<EditorTab>("overview");
  const [title, setTitle] = useState(report.title);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(1);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    report.evidenceItems
  );
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceLayoutMode, setEvidenceLayoutMode] =
    useState<EvidenceLayoutMode>("two-per-page");

  const parsed = useMemo(
    () => parseEditableContent(report.editableContent, report.renderedContent),
    [report.editableContent, report.renderedContent]
  );

  const [blocks, setBlocks] = useState<EditorialBlocks>(parsed.blocks);

  const initialOverrideMap = useMemo(() => {
    const map: Record<string, string> = {};

    for (const item of report.reportValues) {
      const override = parsed.workflowValueOverrides.find(
        (entry) =>
          entry.fieldKey === item.fieldKey || entry.fieldLabel === item.fieldLabel
      );

      map[item.fieldKey] = override?.editedValue ?? item.value;
    }

    return map;
  }, [parsed.workflowValueOverrides, report.reportValues]);

  const [valueMap, setValueMap] =
    useState<Record<string, string>>(initialOverrideMap);

  const workflowValueOverrides = useMemo(() => {
    return report.reportValues.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      originalValue: item.value,
      editedValue: valueMap[item.fieldKey] ?? item.value,
    }));
  }, [report.reportValues, valueMap]);

  const changedValuesCount = workflowValueOverrides.filter(
    (item) => item.editedValue.trim() !== item.originalValue.trim()
  ).length;

  const filledTextsCount = TEXT_BLOCKS.filter((item) =>
    blocks[item.key].trim()
  ).length;

  const visibleEvidenceCount = evidenceItems.filter((item) => item.visible).length;

  const evidenceChanged =
    JSON.stringify(
      evidenceItems.map((item) => ({
        id: item.id,
        caption: item.caption || "",
        visible: item.visible,
        sortOrder: item.sortOrder,
      }))
    ) !==
    JSON.stringify(
      report.evidenceItems.map((item) => ({
        id: item.id,
        caption: item.caption || "",
        visible: item.visible,
        sortOrder: item.sortOrder,
      }))
    );

  const renderedContent = useMemo(() => {
    return buildRenderedContent(blocks, workflowValueOverrides);
  }, [blocks, workflowValueOverrides]);

  const editableContent = useMemo(() => {
    return JSON.stringify(
      {
        version: 10,
        type: "COUNSELOR_REPORT_STUDIO",
        updatedAt: new Date().toISOString(),
        reportId: report.id,
        caseEntryId: report.caseEntry.id,
        serviceSlug: report.caseEntry.service.slug,
        templateId: report.templateId,
        evidenceLayoutMode,
        blocks,
        workflowValueOverrides,
      },
      null,
      2
    );
  }, [
    blocks,
    workflowValueOverrides,
    report.id,
    report.caseEntry.id,
    report.caseEntry.service.slug,
    report.templateId,
    evidenceLayoutMode,
  ]);

  const hasChanges =
    title !== report.title ||
    JSON.stringify(blocks) !== JSON.stringify(parsed.blocks) ||
    JSON.stringify(valueMap) !== JSON.stringify(initialOverrideMap) ||
    evidenceChanged;

  const previewUrl = `/dashboard/reports/${report.id}/preview?template=${encodeURIComponent(
    report.templateId || ""
  )}&studio=true&v=${previewVersion}`;

  const pdfPreviewUrl = `/api/dashboard/reports/${report.id}/export/pdf?template=${encodeURIComponent(
    report.templateId || ""
  )}&inline=true&v=${previewVersion}`;

  const pdfDownloadUrl = `/api/dashboard/reports/${report.id}/export/pdf?template=${encodeURIComponent(
    report.templateId || ""
  )}&v=${previewVersion}`;

  async function saveEvidenceItems() {
    if (!evidenceChanged) {
      return;
    }

    const response = await fetch(`/api/dashboard/reports/${report.id}/evidence`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: evidenceItems.map((item, index) => ({
          id: item.id,
          caption: item.caption || "",
          visible: item.visible,
          sortOrder: index,
        })),
      }),
    });

    const raw = await response.text();
    let data: any = null;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "مسار حفظ الشواهد رجع HTML بدل JSON. تأكد أن app/api/dashboard/reports/[reportId]/evidence/route.ts موجود ثم أعد تشغيل السيرفر."
      );
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || "تعذر حفظ الشواهد.");
    }

    if (Array.isArray(data.evidenceItems)) {
      setEvidenceItems(
        data.evidenceItems.map((item: EvidenceItem, index: number) => ({
          ...item,
          sortOrder: index,
        }))
      );
    }
  }

  async function saveReport() {
    if (locked) {
      setFeedback({
        type: "warning",
        title: "التقرير مغلق",
        message: "لا يمكن تعديل التقرير بعد الاعتماد أو الأرشفة.",
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const response = await fetch(`/api/dashboard/reports/${report.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          editableContent,
          renderedContent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ التقرير.");
      }

      if (evidenceChanged) {
        setSavingEvidence(true);
        await saveEvidenceItems();
        setSavingEvidence(false);
      }

      setFeedback({
        type: "success",
        title: "تم حفظ التعديلات",
        message:
          "تم حفظ النصوص والقيم والشواهد داخل التقرير فقط دون تغيير بيانات الحالة الأصلية.",
      });

      setPreviewVersion((current) => current + 1);

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setFeedback({
        type: "error",
        title: "تعذر الحفظ",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء حفظ التقرير.",
      });
    } finally {
      setSaving(false);
      setSavingEvidence(false);
    }
  }

  async function approveReport() {
    if (locked) return;

    try {
      setApproving(true);
      setFeedback(null);

      if (hasChanges) {
        await saveReport();
      }

      const response = await fetch(
        `/api/dashboard/reports/${report.id}/approve`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر اعتماد التقرير.");
      }

      setFeedback({
        type: "success",
        title: "تم اعتماد التقرير",
        message: "تم اعتماد التقرير وإغلاقه من التعديل.",
      });

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setFeedback({
        type: "error",
        title: "تعذر الاعتماد",
        message:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء اعتماد التقرير.",
      });
    } finally {
      setApproving(false);
    }
  }

  function updateBlock(key: keyof EditorialBlocks, value: string) {
    setBlocks((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateValue(fieldKey: string, value: string) {
    setValueMap((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function updateEvidenceItem(
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) {
    setEvidenceItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function moveEvidenceItem(id: string, direction: "up" | "down") {
    setEvidenceItems((current) => {
      const index = current.findIndex((item) => item.id === id);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const currentItem = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = currentItem;

      return next.map((item, order) => ({
        ...item,
        sortOrder: order,
      }));
    });
  }

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                محرر التقرير
              </p>

              <h1 className="mt-3 text-3xl font-black text-slate-950">
                {report.title}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                حرر النصوص والقيم والشواهد الخاصة بالتقرير قبل معاينة PDF أو
                تحميل النسخة الرسمية. التقرير تابع لخدمة{" "}
                <span className="font-black text-slate-900">
                  {report.caseEntry.service.name}
                </span>
                .
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/reports/${report.id}/preview`}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                الرجوع للمعاينة
              </Link>

              <a
                href={pdfPreviewUrl}
                target="_blank"
                className="rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-800"
              >
                معاينة PDF
              </a>

              <a
                href={pdfDownloadUrl}
                className="rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                تحميل PDF
              </a>
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="border-l border-slate-100 bg-white p-5">
            <StatusPanel
              locked={locked}
              status={report.status}
              hasChanges={hasChanges}
              changedValuesCount={changedValuesCount}
              filledTextsCount={filledTextsCount}
              visibleEvidenceCount={visibleEvidenceCount}
            />

            <Tabs activeTab={activeTab} onChange={setActiveTab} />

            <EditorPanel
              activeTab={activeTab}
              report={report}
              title={title}
              blocks={blocks}
              valueMap={valueMap}
              evidenceItems={evidenceItems}
              evidenceLayoutMode={evidenceLayoutMode}
              locked={locked}
              onTitleChange={setTitle}
              onBlockChange={updateBlock}
              onValueChange={updateValue}
              onEvidenceChange={updateEvidenceItem}
              onEvidenceMove={moveEvidenceItem}
              onEvidenceLayoutChange={setEvidenceLayoutMode}
              changedValuesCount={changedValuesCount}
              filledTextsCount={filledTextsCount}
              visibleEvidenceCount={visibleEvidenceCount}
            />

            {feedback ? (
              <FeedbackBox
                feedback={feedback}
                onClose={() => setFeedback(null)}
              />
            ) : null}

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={saveReport}
                disabled={saving || locked || !hasChanges}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving || savingEvidence ? "جاري الحفظ..." : "حفظ التعديلات"}
              </button>

              <button
                type="button"
                onClick={() => setPreviewVersion((current) => current + 1)}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                تحديث المعاينة
              </button>

              {!locked ? (
                <button
                  type="button"
                  onClick={approveReport}
                  disabled={approving || isPending}
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  {approving ? "جاري الاعتماد..." : "اعتماد التقرير"}
                </button>
              ) : null}
            </div>
          </aside>

          <section className="bg-slate-100 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-500">
                  المعاينة الحية
                </p>
                <h2 className="text-lg font-black text-slate-950">
                  شكل التقرير كما سيظهر للموجه/الموجهة
                </h2>
              </div>

              <p className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                يتم التحديث بعد الحفظ أو الضغط على تحديث المعاينة
              </p>
            </div>

            <iframe
              key={previewUrl}
              src={previewUrl}
              className="h-[calc(100vh-280px)] min-h-[760px] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
              title="معاينة التقرير"
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function StatusPanel({
  locked,
  status,
  hasChanges,
  changedValuesCount,
  filledTextsCount,
  visibleEvidenceCount,
}: {
  locked: boolean;
  status: string;
  hasChanges: boolean;
  changedValuesCount: number;
  filledTextsCount: number;
  visibleEvidenceCount: number;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-500">حالة التقرير</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            {getStatusName(status)}
          </h2>
        </div>

        <span
          className={[
            "rounded-full px-3 py-1 text-xs font-black",
            locked
              ? "bg-slate-200 text-slate-700"
              : hasChanges
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800",
          ].join(" ")}
        >
          {locked ? "مغلق" : hasChanges ? "غير محفوظ" : "محفوظ"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="النصوص" value={`${filledTextsCount}`} />
        <MiniStat label="القيم" value={`${changedValuesCount}`} />
        <MiniStat label="الشواهد" value={`${visibleEvidenceCount}`} />
      </div>
    </section>
  );
}

function Tabs({
  activeTab,
  onChange,
}: {
  activeTab: EditorTab;
  onChange: (tab: EditorTab) => void;
}) {
  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: "overview", label: "الأساسيات" },
    { id: "texts", label: "النصوص" },
    { id: "values", label: "القيم" },
    { id: "evidence", label: "الشواهد" },
    { id: "final", label: "الاعتماد" },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            "rounded-2xl border px-4 py-3 text-sm font-black transition",
            activeTab === tab.id
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function EditorPanel({
  activeTab,
  report,
  title,
  blocks,
  valueMap,
  evidenceItems,
  evidenceLayoutMode,
  locked,
  onTitleChange,
  onBlockChange,
  onValueChange,
  onEvidenceChange,
  onEvidenceMove,
  onEvidenceLayoutChange,
  changedValuesCount,
  filledTextsCount,
  visibleEvidenceCount,
}: {
  activeTab: EditorTab;
  report: StudioReport;
  title: string;
  blocks: EditorialBlocks;
  valueMap: Record<string, string>;
  evidenceItems: EvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;
  onTitleChange: (value: string) => void;
  onBlockChange: (key: keyof EditorialBlocks, value: string) => void;
  onValueChange: (fieldKey: string, value: string) => void;
  onEvidenceChange: (
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) => void;
  onEvidenceMove: (id: string, direction: "up" | "down") => void;
  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
  changedValuesCount: number;
  filledTextsCount: number;
  visibleEvidenceCount: number;
}) {
  if (activeTab === "overview") {
    return (
      <div className="mt-4 space-y-4">
        <FieldCard title="عنوان التقرير" helper="العنوان الظاهر في المعاينة وملف PDF.">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={locked}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </FieldCard>

        <FieldCard title="بيانات الحالة" helper="هذه البيانات للقراءة فقط من الحالة الأصلية.">
          <InfoRow label="الخدمة" value={report.caseEntry.service.name} />
          <InfoRow label="الحالة" value={report.caseEntry.title || "بدون عنوان"} />
          <InfoRow
            label="الطالب/الطالبة"
            value={report.caseEntry.student?.fullName || "غير مرتبط"}
          />
          <InfoRow
            label="الصف والفصل"
            value={[
              report.caseEntry.student?.grade,
              report.caseEntry.student?.classroom,
            ]
              .filter(Boolean)
              .join(" - ") || "غير محدد"}
          />
        </FieldCard>
      </div>
    );
  }

  if (activeTab === "texts") {
    return (
      <div className="mt-4 space-y-4">
        {TEXT_BLOCKS.map((item) => (
          <FieldCard key={item.key} title={item.title} helper={item.helper}>
            <textarea
              value={blocks[item.key]}
              onChange={(event) => onBlockChange(item.key, event.target.value)}
              disabled={locked}
              rows={5}
              placeholder={item.placeholder}
              className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />
          </FieldCard>
        ))}
      </div>
    );
  }

  if (activeTab === "values") {
    return (
      <div className="mt-4 space-y-4">
        {report.reportValues.map((item) => {
          const current = valueMap[item.fieldKey] ?? item.value;
          const changed = current.trim() !== item.value.trim();

          return (
            <FieldCard
              key={item.fieldKey}
              title={item.fieldLabel}
              helper={changed ? "تم تعديل هذه القيمة داخل التقرير فقط." : "قيمة قادمة من الحالة."}
            >
              <textarea
                value={current}
                onChange={(event) => onValueChange(item.fieldKey, event.target.value)}
                disabled={locked}
                rows={4}
                className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-8 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />

              {changed ? (
                <button
                  type="button"
                  onClick={() => onValueChange(item.fieldKey, item.value)}
                  className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                >
                  استرجاع القيمة الأصلية
                </button>
              ) : null}
            </FieldCard>
          );
        })}
      </div>
    );
  }

  if (activeTab === "evidence") {
    return (
      <EvidenceManager
        evidenceItems={evidenceItems}
        evidenceLayoutMode={evidenceLayoutMode}
        locked={locked}
        onEvidenceChange={onEvidenceChange}
        onEvidenceMove={onEvidenceMove}
        onEvidenceLayoutChange={onEvidenceLayoutChange}
      />
    );
  }

  return (
    <ApprovalReadinessPanel
      report={report}
      title={title}
      filledTextsCount={filledTextsCount}
      changedValuesCount={changedValuesCount}
      visibleEvidenceCount={visibleEvidenceCount}
      evidenceLayoutMode={evidenceLayoutMode}
      locked={locked}
    />
  );
}

function ApprovalReadinessPanel({
  report,
  title,
  filledTextsCount,
  changedValuesCount,
  visibleEvidenceCount,
  evidenceLayoutMode,
  locked,
}: {
  report: StudioReport;
  title: string;
  filledTextsCount: number;
  changedValuesCount: number;
  visibleEvidenceCount: number;
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;
}) {
  const checks = [
    {
      label: "عنوان التقرير",
      ok: Boolean(title.trim()),
      helper: title.trim()
        ? "العنوان موجود وجاهز للظهور في التقرير."
        : "أضف عنوانًا واضحًا للتقرير قبل الاعتماد.",
    },
    {
      label: "النصوص التحريرية",
      ok: filledTextsCount > 0,
      helper:
        filledTextsCount > 0
          ? `تمت تعبئة ${filledTextsCount} قسم نصي.`
          : "يفضل إضافة مقدمة أو نتائج أو توصيات قبل الاعتماد.",
    },
    {
      label: "قيم الحالة",
      ok: report.reportValues.length > 0,
      helper:
        report.reportValues.length > 0
          ? `يوجد ${report.reportValues.length} قيمة قادمة من الحالة.`
          : "لا توجد قيم حالة ظاهرة في التقرير.",
    },
    {
      label: "الشواهد الظاهرة",
      ok: visibleEvidenceCount > 0,
      helper:
        visibleEvidenceCount > 0
          ? `يوجد ${visibleEvidenceCount} شاهد ظاهر في التقرير.`
          : "لا توجد شواهد ظاهرة. يمكن الاعتماد بدون شواهد إذا كان ذلك مقصودًا.",
      warningOnly: true,
    },
    {
      label: "توزيع الشواهد",
      ok: Boolean(evidenceLayoutMode),
      helper: `التوزيع الحالي: ${getEvidenceLayoutName(evidenceLayoutMode)}.`,
    },
  ];

  const blockingIssues = checks.filter((check) => !check.ok && !check.warningOnly);
  const warnings = checks.filter((check) => !check.ok && check.warningOnly);
  const ready = blockingIssues.length === 0;

  return (
    <div className="mt-4 space-y-4">
      <section
        className={[
          "rounded-3xl border p-5",
          ready
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50",
        ].join(" ")}
      >
        <p
          className={[
            "text-xs font-black",
            ready ? "text-emerald-700" : "text-amber-700",
          ].join(" ")}
        >
          فحص جاهزية التقرير
        </p>

        <h3
          className={[
            "mt-2 text-xl font-black",
            ready ? "text-emerald-950" : "text-amber-950",
          ].join(" ")}
        >
          {ready ? "التقرير جاهز للاعتماد" : "التقرير يحتاج مراجعة قبل الاعتماد"}
        </h3>

        <p
          className={[
            "mt-2 text-sm leading-7",
            ready ? "text-emerald-800" : "text-amber-800",
          ].join(" ")}
        >
          {ready
            ? "يمكنك الآن فتح معاينة PDF ثم اعتماد التقرير بثقة."
            : "راجع العناصر التالية قبل الاعتماد حتى يظهر التقرير بشكل رسمي ومكتمل."}
        </p>
      </section>

      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {check.label}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  {check.helper}
                </p>
              </div>

              <span
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-black",
                  check.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : check.warningOnly
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700",
                ].join(" ")}
              >
                {check.ok ? "مكتمل" : check.warningOnly ? "تنبيه" : "مطلوب"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {locked ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold leading-7 text-slate-600">
          هذا التقرير مغلق لأنه معتمد أو مؤرشف.
        </div>
      ) : warnings.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-800">
          يوجد تنبيه غير مانع. تستطيع الاعتماد إذا كان التقرير لا يحتاج شواهد.
        </div>
      ) : null}
    </div>
  );
}

function getEvidenceLayoutName(value: EvidenceLayoutMode) {
  if (value === "one-per-page") return "شاهد لكل صفحة";
  if (value === "two-per-page") return "شاهدان في كل صفحة";
  if (value === "grid-2x2") return "أربعة شواهد 2×2";
  if (value === "compact") return "مختصر";
  return "تلقائي";
}

function EvidenceManager({
  evidenceItems,
  evidenceLayoutMode,
  locked,
  onEvidenceChange,
  onEvidenceMove,
  onEvidenceLayoutChange,
}: {
  evidenceItems: EvidenceItem[];
  evidenceLayoutMode: EvidenceLayoutMode;
  locked: boolean;
  onEvidenceChange: (
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) => void;
  onEvidenceMove: (id: string, direction: "up" | "down") => void;
  onEvidenceLayoutChange: (value: EvidenceLayoutMode) => void;
}) {
  const visibleCount = evidenceItems.filter((item) => item.visible).length;

  return (
    <div className="mt-4 space-y-4">
      <FieldCard
        title="إدارة الشواهد"
        helper="رتّب الشواهد، اكتب عنوانًا مناسبًا لكل شاهد، وحدد ما يظهر في التقرير الرسمي."
      >
        <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-black text-slate-950">
            توزيع الشواهد داخل PDF
          </p>
          <p className="mt-1 text-xs leading-6 text-slate-500">
            اختر طريقة توزيع الصور والمرفقات داخل التقرير الرسمي.
          </p>

          <div className="mt-4 grid gap-2">
            {EVIDENCE_LAYOUT_OPTIONS.map((option) => {
              const active = evidenceLayoutMode === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onEvidenceLayoutChange(option.id)}
                  disabled={locked}
                  className={[
                    "rounded-2xl border px-4 py-3 text-right transition disabled:opacity-60",
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white",
                  ].join(" ")}
                >
                  <span className="block text-sm font-black">
                    {option.label}
                  </span>
                  <span
                    className={[
                      "mt-1 block text-xs leading-5",
                      active ? "text-slate-200" : "text-slate-500",
                    ].join(" ")}
                  >
                    {option.helper}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-bold leading-6 text-blue-700">
            اختر مثلًا: شاهدان في كل صفحة، ثم اضغط حفظ التعديلات، بعدها افتح معاينة PDF.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs font-bold text-slate-500">كل الشواهد</p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {evidenceItems.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-bold text-emerald-700">الظاهر في التقرير</p>
            <p className="mt-1 text-lg font-black text-emerald-800">
              {visibleCount}
            </p>
          </div>
        </div>

        {evidenceItems.length ? (
          <div className="space-y-3">
            {evidenceItems.map((item, index) => (
              <EvidenceEditorCard
                key={item.id}
                item={item}
                index={index}
                total={evidenceItems.length}
                locked={locked}
                onChange={onEvidenceChange}
                onMove={onEvidenceMove}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
            <p className="text-sm font-black text-slate-700">
              لا توجد شواهد مرتبطة بهذا التقرير.
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              أضف الشواهد من الحالة أو الخدمة، ثم أعد إنشاء التقرير أو اربطها بالتقرير.
            </p>
          </div>
        )}
      </FieldCard>
    </div>
  );
}

function EvidenceEditorCard({
  item,
  index,
  total,
  locked,
  onChange,
  onMove,
}: {
  item: EvidenceItem;
  index: number;
  total: number;
  locked: boolean;
  onChange: (
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>
  ) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const image = isImageEvidence(item);

  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border bg-white",
        item.visible ? "border-slate-200" : "border-slate-200 opacity-70",
      ].join(" ")}
    >
      <div className="grid gap-0 sm:grid-cols-[140px_minmax(0,1fr)]">
        <div className="flex h-36 items-center justify-center bg-slate-100">
          {image && item.fileUrl ? (
            <img
              src={item.fileUrl}
              alt={item.caption || item.fileName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="px-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl">
                📎
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-bold text-slate-500">
                {item.fileName || "ملف"}
              </p>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-black text-slate-400">
                شاهد رقم {index + 1}
              </p>
              <p className="mt-1 line-clamp-1 text-sm font-black text-slate-900">
                {item.caption || item.fileName}
              </p>
            </div>

            <span
              className={[
                "rounded-full px-3 py-1 text-[11px] font-black",
                item.visible
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              ].join(" ")}
            >
              {item.visible ? "ظاهر" : "مخفي"}
            </span>
          </div>

          <input
            value={item.caption || ""}
            onChange={(event) =>
              onChange(item.id, {
                caption: event.target.value,
              })
            }
            disabled={locked}
            placeholder="عنوان الشاهد داخل التقرير..."
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onChange(item.id, {
                  visible: !item.visible,
                })
              }
              disabled={locked}
              className={[
                "rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-50",
                item.visible
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-emerald-600 text-white hover:bg-emerald-700",
              ].join(" ")}
            >
              {item.visible ? "إخفاء من التقرير" : "إظهار في التقرير"}
            </button>

            <button
              type="button"
              onClick={() => onMove(item.id, "up")}
              disabled={locked || index === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              رفع
            </button>

            <button
              type="button"
              onClick={() => onMove(item.id, "down")}
              disabled={locked || index === total - 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              خفض
            </button>

            {item.fileUrl ? (
              <a
                href={item.fileUrl}
                target="_blank"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
              >
                فتح الملف
              </a>
            ) : (
              <span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                لا يوجد رابط للملف
              </span>
            )}
          </div>

          <p className="mt-3 text-[11px] leading-5 text-slate-400">
            {item.mimeType || "نوع غير محدد"}
            {item.size ? ` · ${formatFileSize(item.size)}` : ""}
          </p>
        </div>
      </div>
    </article>
  );
}

function isImageEvidence(item: EvidenceItem) {
  return (
    item.mimeType?.startsWith("image/") ||
    /\.(png|jpg|jpeg|webp|gif)$/i.test(item.fileName || item.fileUrl || "")
  );
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "حجم غير معروف";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-xs leading-6 text-slate-500">{helper}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-3 py-3 text-center">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function FeedbackBox({
  feedback,
  onClose,
}: {
  feedback: NonNullable<FeedbackState>;
  onClose: () => void;
}) {
  const styles =
    feedback.type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : feedback.type === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : feedback.type === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`mt-4 rounded-3xl border p-4 ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black">{feedback.title}</h3>
          <p className="mt-1 text-xs leading-6">{feedback.message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white/70 px-3 py-1 text-xs font-black"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

function parseEditableContent(
  editableContent: string,
  renderedContent: string
): {
  blocks: EditorialBlocks;
  workflowValueOverrides: WorkflowValueOverride[];
} {
  if (!editableContent?.trim()) {
    return {
      blocks: {
        ...DEFAULT_BLOCKS,
        intro: renderedContent || "",
      },
      workflowValueOverrides: [],
    };
  }

  try {
    const parsed = JSON.parse(editableContent) as {
      blocks?: Partial<EditorialBlocks>;
      workflowValueOverrides?: WorkflowValueOverride[];
    };

    return {
      blocks: {
        ...DEFAULT_BLOCKS,
        ...(parsed.blocks || {}),
      },
      workflowValueOverrides: Array.isArray(parsed.workflowValueOverrides)
        ? parsed.workflowValueOverrides
        : [],
    };
  } catch {
    return {
      blocks: {
        ...DEFAULT_BLOCKS,
        intro: renderedContent || editableContent || "",
      },
      workflowValueOverrides: [],
    };
  }
}

function buildRenderedContent(
  blocks: EditorialBlocks,
  workflowValueOverrides: WorkflowValueOverride[]
) {
  const blockText = TEXT_BLOCKS.map((item) => {
    const value = blocks[item.key].trim();

    if (!value) return "";

    return `${item.title}\n${value}`;
  })
    .filter(Boolean)
    .join("\n\n");

  const changedValues = workflowValueOverrides
    .filter((item) => item.editedValue.trim() !== item.originalValue.trim())
    .map((item) => `${item.fieldLabel}\n${item.editedValue}`)
    .join("\n\n");

  return [blockText, changedValues ? `القيم المعدلة\n${changedValues}` : ""]
    .filter(Boolean)
    .join("\n\n");
}

function getStatusName(status: string) {
  if (status === "APPROVED") return "معتمد";
  if (status === "ARCHIVED") return "مؤرشف";
  if (status === "GENERATED") return "مولد";
  return "مسودة";
}
