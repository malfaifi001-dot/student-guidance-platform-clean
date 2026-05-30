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

type ReportTemplateId = "official-long" | "visual-activity" | "executive-brief";

type EvidenceLayout =
  | "auto"
  | "single-large"
  | "two-columns"
  | "stacked"
  | "grid-2x2"
  | "one-per-page";

type ReportValue = {
  fieldKey: string;
  fieldLabel: string;
  value: string;
};

type WorkflowValueOverride = {
  fieldKey: string;
  fieldLabel: string;
  originalValue: string;
  editedValue: string;
};

type StudioReport = {
  id: string;
  title: string;
  serviceSlug: string;
  status: StudioReportStatus;
  genderMode: string;
  templateId?: string | null;
  hasTemplateSnapshot: boolean;
  hasReportDataSnapshot: boolean;
  editableContent: string;
  renderedContent: string;
  generatedAt?: string | null;
  approvedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  reportValues: ReportValue[];

  evidenceItems: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    caption?: string | null;
    mimeType?: string | null;
    size?: number | null;
    sortOrder: number;
    visible: boolean;
    createdAt: string;
  }>;

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

type EditablePageKey =
  | "intro"
  | "goals"
  | "procedures"
  | "results"
  | "recommendations"
  | "evidence"
  | "allValues";

type EditorialBlockKey =
  | "intro"
  | "goals"
  | "procedures"
  | "results"
  | "recommendations"
  | "closingNotes"
  | "evidenceNotes";

type EditorialBlocks = Record<EditorialBlockKey, string>;

type ParsedEditState = {
  blocks: EditorialBlocks;
  workflowValueOverrides: WorkflowValueOverride[];
};

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

const EDITABLE_PAGES: Array<{
  key: EditablePageKey;
  pageNumber: number;
  title: string;
  description: string;
  blockKeys: EditorialBlockKey[];
  valueKeywords: string[];
}> = [
  {
    key: "intro",
    pageNumber: 1,
    title: "مقدمة التقرير",
    description: "النص الافتتاحي والتمهيد العام للتقرير.",
    blockKeys: ["intro"],
    valueKeywords: ["مقدمة", "تمهيد", "وصف", "سبب", "نبذة"],
  },
  {
    key: "goals",
    pageNumber: 2,
    title: "أهداف البرنامج",
    description: "الأهداف المكتوبة أو القادمة من Workflow.",
    blockKeys: ["goals"],
    valueKeywords: ["هدف", "أهداف", "الهدف"],
  },
  {
    key: "procedures",
    pageNumber: 3,
    title: "الإجراءات",
    description: "الإجراءات وما تم تنفيذه أو متابعته.",
    blockKeys: ["procedures"],
    valueKeywords: ["إجراء", "إجراءات", "تنفيذ", "نفذ", "متابعة", "تم"],
  },
  {
    key: "results",
    pageNumber: 4,
    title: "النتائج",
    description: "النتائج والمخرجات النهائية.",
    blockKeys: ["results"],
    valueKeywords: ["نتيجة", "نتائج", "مخرج", "مخرجات", "أثر"],
  },
  {
    key: "recommendations",
    pageNumber: 5,
    title: "التوصيات والختام",
    description: "التوصيات والملاحظات الختامية.",
    blockKeys: ["recommendations", "closingNotes"],
    valueKeywords: ["توصية", "توصيات", "ختام", "ملاحظة", "ملاحظات"],
  },
  {
    key: "evidence",
    pageNumber: 6,
    title: "الشواهد",
    description: "ملاحظات الشواهد والصور والملفات.",
    blockKeys: ["evidenceNotes"],
    valueKeywords: ["شاهد", "شواهد", "صورة", "صور", "مرفق", "مرفقات"],
  },
  {
    key: "allValues",
    pageNumber: 7,
    title: "كل قيم التقرير",
    description: "كل القيم القادمة من Workflow في مكان واحد.",
    blockKeys: [],
    valueKeywords: [],
  },
];

const BLOCK_META: Record<
  EditorialBlockKey,
  {
    label: string;
    helper: string;
    placeholder: string;
  }
> = {
  intro: {
    label: "مقدمة التقرير",
    helper: "هذا النص يظهر كمقدمة محررة للتقرير.",
    placeholder:
      "اكتب مقدمة التقرير هنا، أو عدّل النص الموجود ليظهر بصياغة رسمية مناسبة.",
  },
  goals: {
    label: "أهداف البرنامج",
    helper: "يمكنك كتابة أهداف التقرير كما تريد اعتمادها.",
    placeholder:
      "اكتب أهداف البرنامج أو الخدمة هنا، مثل: يهدف البرنامج إلى تعزيز السلوك الإيجابي...",
  },
  procedures: {
    label: "الإجراءات",
    helper: "اكتب الإجراءات التي تم تنفيذها أو حسّن صياغتها.",
    placeholder:
      "اكتب الإجراءات هنا، مثل: تم تنفيذ لقاء إرشادي، ومتابعة الحالة، وتوثيق الشواهد...",
  },
  results: {
    label: "النتائج",
    helper: "اكتب النتائج التي تريد ظهورها في التقرير.",
    placeholder:
      "اكتب النتائج هنا، مثل: أظهرت المتابعة تحسنًا ملحوظًا مع الحاجة إلى استمرار المتابعة...",
  },
  recommendations: {
    label: "التوصيات",
    helper: "اكتب توصيات عملية ومباشرة.",
    placeholder:
      "اكتب التوصيات هنا، مثل: يوصى باستمرار المتابعة وتعزيز التواصل مع ولي الأمر...",
  },
  closingNotes: {
    label: "ملاحظات ختامية",
    helper: "ملاحظات عامة تظهر في نهاية التقرير.",
    placeholder:
      "اكتب أي ملاحظات ختامية تريد إضافتها قبل اعتماد التقرير.",
  },
  evidenceNotes: {
    label: "ملاحظات الشواهد",
    helper: "ملاحظات حول الشواهد المرفقة.",
    placeholder:
      "اكتب ملاحظات الشواهد هنا، مثل: تم إرفاق الشواهد الداعمة للتقرير لأغراض التوثيق...",
  },
};

const TEMPLATE_OPTIONS: Array<{ id: ReportTemplateId; label: string }> = [
  { id: "official-long", label: "القالب الرسمي" },
  { id: "visual-activity", label: "القالب البصري" },
  { id: "executive-brief", label: "القالب المختصر" },
];

const EVIDENCE_LAYOUT_OPTIONS: Array<{ id: EvidenceLayout; label: string }> = [
  { id: "grid-2x2", label: "شواهد 2×2" },
  { id: "two-columns", label: "صورتان بجانب بعض" },
  { id: "stacked", label: "صور تحت بعض" },
  { id: "one-per-page", label: "شاهد لكل صفحة" },
];

export function ReportStudioEditor({ report }: ReportStudioEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isLocked = report.status === "APPROVED" || report.status === "ARCHIVED";
  const isApproved = report.status === "APPROVED";
  const isArchived = report.status === "ARCHIVED";

  const parsedInitialState = useMemo(() => {
    return parseEditState(report.editableContent, report.renderedContent);
  }, [report.editableContent, report.renderedContent]);

  const initialOverrideMap = useMemo(() => {
    return buildInitialOverrideMap(
      report.reportValues,
      parsedInitialState.workflowValueOverrides
    );
  }, [report.reportValues, parsedInitialState.workflowValueOverrides]);

  const [title, setTitle] = useState(report.title);
  const [blocks, setBlocks] = useState<EditorialBlocks>(
    parsedInitialState.blocks
  );

  const [workflowOverrideMap, setWorkflowOverrideMap] =
    useState<Record<string, string>>(initialOverrideMap);

  const [activePage, setActivePage] = useState<EditablePageKey>("intro");

  const [templateId, setTemplateId] = useState<ReportTemplateId>(
    normalizeTemplateId(report.templateId)
  );

  const [evidenceLayout, setEvidenceLayout] =
    useState<EvidenceLayout>("grid-2x2");
  const [showCover, setShowCover] = useState(true);
  const [showEditorial, setShowEditorial] = useState(true);

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [previewVersion, setPreviewVersion] = useState(1);

  const activePageConfig =
    EDITABLE_PAGES.find((page) => page.key === activePage) || EDITABLE_PAGES[0];

  const workflowValueOverrides = useMemo(() => {
    return report.reportValues.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      originalValue: item.value,
      editedValue: workflowOverrideMap[item.fieldKey] ?? item.value,
    }));
  }, [report.reportValues, workflowOverrideMap]);

  const activeValues = useMemo(() => {
    if (activePage === "allValues") {
      return report.reportValues;
    }

    return filterValuesByPage(report.reportValues, activePageConfig);
  }, [activePage, activePageConfig, report.reportValues]);

  const renderedContent = useMemo(() => {
    return buildRenderedEditorialContent(blocks, workflowValueOverrides);
  }, [blocks, workflowValueOverrides]);

  const editableContentJson = useMemo(() => {
    return JSON.stringify(
      {
        version: 5,
        type: "PAGE_LINKED_REPORT_EDITORIAL_BLOCKS",
        updatedAt: new Date().toISOString(),
        meta: {
          reportId: report.id,
          caseEntryId: report.caseEntry.id,
          serviceSlug: report.serviceSlug,
        },
        pages: EDITABLE_PAGES.map((page) => ({
          key: page.key,
          pageNumber: page.pageNumber,
          title: page.title,
          blockKeys: page.blockKeys,
          valueKeywords: page.valueKeywords,
        })),
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
    report.serviceSlug,
  ]);

  const hasChanges =
    title !== report.title ||
    JSON.stringify(blocks) !== JSON.stringify(parsedInitialState.blocks) ||
    JSON.stringify(workflowOverrideMap) !== JSON.stringify(initialOverrideMap);

  const changedWorkflowValuesCount = useMemo(() => {
    return workflowValueOverrides.filter(
      (item) => item.editedValue.trim() !== item.originalValue.trim()
    ).length;
  }, [workflowValueOverrides]);

  const wordCount = useMemo(() => {
    return renderedContent
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }, [renderedContent]);

  const previewUrl = buildPreviewUrl({
    reportId: report.id,
    templateId,
    evidenceLayout,
    showCover,
    showEditorial,
    previewVersion,
  });

  function updateBlock(key: EditorialBlockKey, value: string) {
    setBlocks((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateWorkflowValue(fieldKey: string, value: string) {
    setWorkflowOverrideMap((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  async function persistReport() {
    const response = await fetch(`/api/dashboard/reports/${report.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        editableContent: editableContentJson,
        renderedContent,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "تعذر حفظ التقرير.");
    }

    return data;
  }

  async function saveReport() {
    if (isLocked) {
      setFeedback({
        type: "warning",
        title: "التقرير مغلق",
        message:
          "لا يمكن تعديل التقرير بعد الاعتماد أو الأرشفة. انسخ التقرير لإنشاء نسخة قابلة للتعديل.",
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      await persistReport();

      setFeedback({
        type: "success",
        title: "تم حفظ التعديلات",
        message:
          "تم حفظ تعديلات هذه الصفحة داخل التقرير فقط، ولم يتم تغيير بيانات الحالة الأصلية.",
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
          error instanceof Error ? error.message : "حدث خطأ أثناء حفظ التقرير.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function approveReport() {
    try {
      setApproving(true);
      setFeedback(null);

      if (hasChanges && !isLocked) {
        await persistReport();
      }

      const response = await fetch(
        `/api/dashboard/reports/${report.id}/approve`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر اعتماد التقرير.");
      }

      setShowApproveModal(false);

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

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
      <div className="min-h-[calc(100vh-220px)] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <PreviewToolbar
          templateId={templateId}
          evidenceLayout={evidenceLayout}
          showCover={showCover}
          showEditorial={showEditorial}
          onTemplateChange={setTemplateId}
          onEvidenceLayoutChange={setEvidenceLayout}
          onToggleCover={() => setShowCover((current) => !current)}
          onToggleEditorial={() => setShowEditorial((current) => !current)}
          onRefresh={() => setPreviewVersion((current) => current + 1)}
          reportId={report.id}
        />

        <iframe
          key={previewUrl}
          src={previewUrl}
          className="h-[calc(100vh-320px)] min-h-[760px] w-full bg-slate-100"
          title="معاينة التقرير"
        />
      </div>

      <aside className="space-y-4">
        <StatusBanner
          status={report.status}
          isApproved={isApproved}
          isArchived={isArchived}
        />

        {feedback ? (
          <FeedbackBox
            type={feedback.type}
            title={feedback.title}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                تعديل التقرير
              </h2>

              <p className="mt-1 text-xs leading-6 text-slate-500">
                اختر صفحة من التقرير. الاسم ثابت، والمحتوى قابل للتعديل.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {getStatusArabicName(report.status)}
            </span>
          </div>

          <div className="mt-5">
            <label className="text-sm font-black text-slate-700">
              عنوان التقرير
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isLocked}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="عنوان التقرير"
            />
          </div>

          <PageNavigator
            activePage={activePage}
            blocks={blocks}
            values={report.reportValues}
            changedWorkflowValuesCount={changedWorkflowValuesCount}
            onChange={setActivePage}
          />

          <PageContentEditor
            page={activePageConfig}
            blocks={blocks}
            values={activeValues}
            overrideMap={workflowOverrideMap}
            disabled={isLocked}
            onBlockChange={updateBlock}
            onWorkflowValueChange={updateWorkflowValue}
          />

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MiniStat label="القيم المعدلة" value={`${changedWorkflowValuesCount}`} />
            <MiniStat label="الكلمات" value={`${wordCount}`} />
            <MiniStat label="الشواهد" value={`${report.evidenceItems.length}`} />
          </div>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={saveReport}
              disabled={saving || isLocked || !hasChanges}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ..." : "حفظ وتحديث المعاينة"}
            </button>

            {!isLocked ? (
              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                اعتماد التقرير
              </button>
            ) : null}

            <Link
              href="/dashboard/reports"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              الرجوع للوحة التقارير
            </Link>
          </div>
        </section>
      </aside>

      {showApproveModal ? (
        <ApproveModal
          title={title}
          loading={approving || saving || isPending}
          hasUnsavedChanges={hasChanges}
          onCancel={() => setShowApproveModal(false)}
          onConfirm={approveReport}
        />
      ) : null}
    </section>
  );
}

function PreviewToolbar({
  templateId,
  evidenceLayout,
  showCover,
  showEditorial,
  onTemplateChange,
  onEvidenceLayoutChange,
  onToggleCover,
  onToggleEditorial,
  onRefresh,
  reportId,
}: {
  templateId: ReportTemplateId;
  evidenceLayout: EvidenceLayout;
  showCover: boolean;
  showEditorial: boolean;
  onTemplateChange: (value: ReportTemplateId) => void;
  onEvidenceLayoutChange: (value: EvidenceLayout) => void;
  onToggleCover: () => void;
  onToggleEditorial: () => void;
  onRefresh: () => void;
  reportId: string;
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-5 py-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_auto_auto_auto]">
        <select
          value={templateId}
          onChange={(event) =>
            onTemplateChange(event.target.value as ReportTemplateId)
          }
          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none"
        >
          {TEMPLATE_OPTIONS.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>

        <select
          value={evidenceLayout}
          onChange={(event) =>
            onEvidenceLayoutChange(event.target.value as EvidenceLayout)
          }
          className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none"
        >
          {EVIDENCE_LAYOUT_OPTIONS.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleCover}
          className={[
            "rounded-2xl border px-4 py-2 text-xs font-black transition",
            showCover
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
          ].join(" ")}
        >
          {showCover ? "الغلاف ظاهر" : "الغلاف مخفي"}
        </button>

        <button
          type="button"
          onClick={onToggleEditorial}
          className={[
            "rounded-2xl border px-4 py-2 text-xs font-black transition",
            showEditorial
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
          ].join(" ")}
        >
          {showEditorial ? "المحتوى ظاهر" : "المحتوى مخفي"}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            تحديث
          </button>

          <Link
            href={`/dashboard/reports/${reportId}/preview?template=${templateId}&evidenceLayout=${evidenceLayout}&cover=${showCover}&editorial=${showEditorial}`}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
          >
            فتح كامل
          </Link>
        </div>
      </div>
    </div>
  );
}

function PageNavigator({
  activePage,
  blocks,
  values,
  changedWorkflowValuesCount,
  onChange,
}: {
  activePage: EditablePageKey;
  blocks: EditorialBlocks;
  values: ReportValue[];
  changedWorkflowValuesCount: number;
  onChange: (page: EditablePageKey) => void;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-black text-slate-700">صفحات التقرير</p>
        <p className="text-xs font-bold text-slate-400">
          {EDITABLE_PAGES.length} صفحات/أقسام
        </p>
      </div>

      <div className="grid gap-2">
        {EDITABLE_PAGES.map((page) => {
          const active = activePage === page.key;

          const pageValues =
            page.key === "allValues" ? values : filterValuesByPage(values, page);

          const filledBlocks = page.blockKeys.filter((key) =>
            blocks[key].trim()
          ).length;

          const count =
            page.key === "allValues"
              ? changedWorkflowValuesCount
              : filledBlocks + pageValues.length;

          return (
            <button
              key={page.key}
              type="button"
              onClick={() => onChange(page.key)}
              className={[
                "rounded-2xl border p-3 text-right transition",
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : count
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black">
                  صفحة {page.pageNumber} — {page.title}
                </span>

                <span
                  className={[
                    "rounded-full px-2 py-1 text-[10px] font-black",
                    active ? "bg-white/15 text-white" : "bg-white text-slate-500",
                  ].join(" ")}
                >
                  {count}
                </span>
              </div>

              <p
                className={[
                  "mt-1 line-clamp-1 text-[11px]",
                  active ? "text-slate-200" : "text-slate-500",
                ].join(" ")}
              >
                {page.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PageContentEditor({
  page,
  blocks,
  values,
  overrideMap,
  disabled,
  onBlockChange,
  onWorkflowValueChange,
}: {
  page: (typeof EDITABLE_PAGES)[number];
  blocks: EditorialBlocks;
  values: ReportValue[];
  overrideMap: Record<string, string>;
  disabled: boolean;
  onBlockChange: (key: EditorialBlockKey, value: string) => void;
  onWorkflowValueChange: (fieldKey: string, value: string) => void;
}) {
  return (
    <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <h3 className="text-base font-black text-slate-900">{page.title}</h3>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          {page.description}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {page.blockKeys.map((key) => {
          const meta = BLOCK_META[key];

          return (
            <EditableTextCard
              key={key}
              label={meta.label}
              helper={meta.helper}
              value={blocks[key]}
              placeholder={meta.placeholder}
              disabled={disabled}
              onChange={(value) => onBlockChange(key, value)}
            />
          );
        })}

        {values.map((item) => {
          const currentValue = overrideMap[item.fieldKey] ?? item.value;
          const changed = currentValue.trim() !== item.value.trim();

          return (
            <WorkflowValueCard
              key={item.fieldKey}
              label={item.fieldLabel}
              originalValue={item.value}
              value={currentValue}
              changed={changed}
              disabled={disabled}
              onChange={(value) => onWorkflowValueChange(item.fieldKey, value)}
              onReset={() => onWorkflowValueChange(item.fieldKey, item.value)}
            />
          );
        })}

        {!page.blockKeys.length && !values.length ? (
          <div className="rounded-2xl bg-white px-4 py-4 text-sm leading-7 text-slate-500">
            لا توجد حقول مرتبطة بهذه الصفحة حاليًا.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EditableTextCard({
  label,
  helper,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-black text-slate-900">{label}</p>
      <p className="mt-1 text-xs leading-6 text-slate-500">{helper}</p>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={5}
        placeholder={placeholder}
        className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  );
}

function WorkflowValueCard({
  label,
  originalValue,
  value,
  changed,
  disabled,
  onChange,
  onReset,
}: {
  label: string;
  originalValue: string;
  value: string;
  changed: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-500">
            اسم القيمة من الأدمن
          </p>

          <h4 className="mt-1 text-sm font-black text-slate-900">{label}</h4>
        </div>

        {changed ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
            معدل
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-500">
            أصلي
          </span>
        )}
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={5}
        className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-8 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500"
        placeholder="اكتب النص الذي تريد ظهوره داخل التقرير..."
      />

      {changed ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            استرجاع النص الأصلي
          </button>
        </div>
      ) : null}

      {changed ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-black text-slate-500">النص الأصلي</p>
          <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">
            {originalValue || "لا يوجد نص أصلي."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusBanner({
  status,
  isApproved,
  isArchived,
}: {
  status: StudioReportStatus;
  isApproved: boolean;
  isArchived: boolean;
}) {
  if (isApproved) {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800 shadow-sm">
        <h2 className="text-lg font-black">التقرير معتمد ومغلق</h2>
        <p className="mt-2 text-sm leading-7">
          لا يمكن تعديل التقرير بعد الاعتماد. انسخ التقرير لإنشاء نسخة قابلة
          للتعديل.
        </p>
      </div>
    );
  }

  if (isArchived) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-slate-100 p-5 text-slate-700 shadow-sm">
        <h2 className="text-lg font-black">التقرير مؤرشف</h2>
        <p className="mt-2 text-sm leading-7">
          التقرير محفوظ في الأرشيف ولا يمكن تعديله.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[2rem] border border-sky-200 bg-sky-50 p-5 text-sky-800 shadow-sm">
      <h2 className="text-lg font-black">تحرير مرتبط بصفحات التقرير</h2>
      <p className="mt-2 text-sm leading-7">
        الحالة الحالية: {getStatusArabicName(status)}. اختر صفحة، وعدّل النصوص
        الخاصة بها فقط.
      </p>
    </div>
  );
}

function FeedbackBox({
  type,
  title,
  message,
  onClose,
}: {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const className =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : type === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : type === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-[2rem] border p-5 shadow-sm ${className}`}
    >
      <div>
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-1 text-sm leading-7">{message}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-xl bg-white/70 px-3 py-2 text-xs font-black"
      >
        إغلاق
      </button>
    </div>
  );
}

function ApproveModal({
  title,
  loading,
  hasUnsavedChanges,
  onCancel,
  onConfirm,
}: {
  title: string;
  loading: boolean;
  hasUnsavedChanges: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-black text-emerald-700">
          ✓
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-black text-slate-900">
            اعتماد التقرير؟
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            بعد الاعتماد سيتم إغلاق التقرير من التعديل.
          </p>

          {hasUnsavedChanges ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800">
              توجد تعديلات غير محفوظة. سيتم حفظها أولًا ثم اعتماد التقرير.
            </p>
          ) : null}

          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-900">
            {title}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {loading ? "جارٍ الاعتماد..." : "نعم، اعتمد التقرير"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function parseEditState(
  editableContent: string,
  renderedContent: string
): ParsedEditState {
  const content = editableContent?.trim();

  if (content) {
    try {
      const parsed = JSON.parse(content) as {
        blocks?: Partial<EditorialBlocks>;
        workflowValueOverrides?: WorkflowValueOverride[];
      };

      if (parsed && parsed.blocks) {
        return {
          blocks: {
            ...DEFAULT_BLOCKS,
            ...parsed.blocks,
          },
          workflowValueOverrides: Array.isArray(parsed.workflowValueOverrides)
            ? parsed.workflowValueOverrides
            : [],
        };
      }
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

  return {
    blocks: {
      ...DEFAULT_BLOCKS,
      intro: renderedContent || editableContent || "",
    },
    workflowValueOverrides: [],
  };
}

function buildInitialOverrideMap(
  values: ReportValue[],
  overrides: WorkflowValueOverride[]
) {
  const map: Record<string, string> = {};

  for (const value of values) {
    const override = overrides.find((item) => item.fieldKey === value.fieldKey);
    map[value.fieldKey] = override?.editedValue ?? value.value;
  }

  return map;
}

function filterValuesByPage(
  values: ReportValue[],
  page: (typeof EDITABLE_PAGES)[number]
) {
  if (!page.valueKeywords.length) {
    return [];
  }

  return values.filter((item) => {
    const text = `${item.fieldLabel} ${item.value}`.toLowerCase();

    return page.valueKeywords.some((keyword) =>
      text.includes(keyword.toLowerCase())
    );
  });
}

function buildRenderedEditorialContent(
  blocks: EditorialBlocks,
  workflowValueOverrides: WorkflowValueOverride[]
) {
  const changedWorkflowText = workflowValueOverrides
    .filter((item) => item.editedValue.trim() !== item.originalValue.trim())
    .map((item) => `${item.fieldLabel}\n${item.editedValue.trim()}`)
    .filter(Boolean);

  const pageText = EDITABLE_PAGES.filter((page) => page.key !== "allValues")
    .map((page) => {
      const blockText = page.blockKeys
        .map((key) => {
          const value = blocks[key].trim();

          if (!value) {
            return "";
          }

          return `${BLOCK_META[key].label}\n${value}`;
        })
        .filter(Boolean)
        .join("\n\n");

      if (!blockText) {
        return "";
      }

      return `${page.title}\n${blockText}`;
    })
    .filter(Boolean);

  if (changedWorkflowText.length) {
    pageText.unshift(`قيم التقرير المعدلة\n${changedWorkflowText.join("\n\n")}`);
  }

  return pageText.join("\n\n");
}

function buildPreviewUrl({
  reportId,
  templateId,
  evidenceLayout,
  showCover,
  showEditorial,
  previewVersion,
}: {
  reportId: string;
  templateId: ReportTemplateId;
  evidenceLayout: EvidenceLayout;
  showCover: boolean;
  showEditorial: boolean;
  previewVersion: number;
}) {
  const params = new URLSearchParams();

  params.set("template", templateId);
  params.set("evidenceLayout", evidenceLayout);
  params.set("cover", String(showCover));
  params.set("editorial", String(showEditorial));
  params.set("studio", "true");
  params.set("v", String(previewVersion));

  return `/dashboard/reports/${reportId}/preview?${params.toString()}`;
}

function normalizeTemplateId(value?: string | null): ReportTemplateId {
  if (
    value === "official-long" ||
    value === "visual-activity" ||
    value === "executive-brief"
  ) {
    return value;
  }

  return "official-long";
}

function getStatusArabicName(status: StudioReportStatus) {
  if (status === "APPROVED") return "معتمد";
  if (status === "GENERATED") return "مولّد";
  if (status === "ARCHIVED") return "مؤرشف";
  return "مسودة";
}