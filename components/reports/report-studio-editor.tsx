"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EvidencePreviewGrid } from "@/components/evidence/evidence-preview-grid";
import {
  DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
  FinalReportDesignRenderer,
} from "@/components/report-engine/design-renderers/report-design-renderer";

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

type EditableContentPayload = {
  version?: number;
  type?: string;
  blocks?: Record<string, string>;
  pageOverrides?: Record<
    string,
    Record<
      string,
      {
        content?: string;
        title?: string;
        hidden?: boolean;
      }
    >
  >;
  workflowValueOverrides?: WorkflowValueOverride[];
  evidenceLayoutMode?: EvidenceLayoutMode;
  editorialMeta?: {
    editedAfterApproval?: boolean;
    lastEditedAfterApprovalAt?: string;
    lastEditedAfterApprovalById?: string;
  };
  [key: string]: unknown;
};

type StudioReport = {
  id: string;
  title: string;
  serviceSlug: string;
  status: StudioReportStatus;
  genderMode: string;
  templateId?: string | null;
  hasTemplateSnapshot?: boolean;
  hasReportDataSnapshot?: boolean;
  templateSnapshot?: any;
  reportDataSnapshot?: any;
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

type TemplatePage = {
  id: string;
  title: string;
  kind?: string;
  blocks: TemplateBlock[];
};

type TemplateBlock = {
  id?: string;
  kind?: string;
  title?: string;
  content?: string;
  defaultContent?: string;
  customContent?: string;
  variant?: string;
  align?: string;
  settings?: Record<string, any>;
  [key: string]: any;
};

type SuggestionItem = {
  id: string;
  title: string;
  body: string;
  helper: string;
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
    helper: "يعرض الشواهد بشكل مضغوط داخل التقارير.",
  },
];

export function ReportStudioEditor({ report }: ReportStudioEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isArchived = report.status === "ARCHIVED";
  const isApproved = report.status === "APPROVED";

  const parsed = useMemo(
    () => parseEditableContent(report.editableContent, report.renderedContent),
    [report.editableContent, report.renderedContent],
  );

  const template = useMemo(() => mergeSignatureOnlyStudioPagesIntoPrevious(ensureDefaultStudioSignatureBlock(normalizeTemplateSnapshot(report))), [report]);
  const pages = template.pages as TemplatePage[];

  const [activePageId, setActivePageId] = useState(
    pages[0]?.id || "missing-template-pages",
  );
  const [title, setTitle] = useState(report.title);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [approvedEditingConfirmed, setApprovedEditingConfirmed] = useState(false);
  const [approvedEditModalOpen, setApprovedEditModalOpen] = useState(false);
  const [editedAfterApprovalInSession, setEditedAfterApprovalInSession] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(1);
  const [blockOverrides, setBlockOverrides] = useState<Record<string, string>>(() =>
    sanitizeInitialBlockOverrides(pages, parsed.blocks || {}),
  );
  const [suggestionBlock, setSuggestionBlock] = useState<{
    page: TemplatePage;
    block: TemplateBlock;
    blockKey: string;
  } | null>(null);
  const [suggestionIndexes, setSuggestionIndexes] = useState<
    Record<string, number>
  >({});
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    report.evidenceItems,
  );
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceLayoutMode, setEvidenceLayoutMode] =
    useState<EvidenceLayoutMode>(parsed.evidenceLayoutMode || "two-per-page");
  const canEdit = !isArchived && (!isApproved || approvedEditingConfirmed);
  const editorLocked = !canEdit;
  const wasEditedAfterApproval = Boolean(
    parsed.editorialMeta?.editedAfterApproval || editedAfterApprovalInSession,
  );

  const runtimeContext = useMemo(() => buildRuntimeContext(report), [report]);

  const activePage =
    pages.find((page: TemplatePage) => page.id === activePageId) || pages[0];

  const editableBlocks = useMemo(() => {
    return (activePage?.blocks || []).filter(isEditableTextBlock);
  }, [activePage]);

  const activePageHasEvidence = useMemo(() => {
    const pageHasEvidenceBlock = (activePage?.blocks || []).some(
      (block) => normalizeBlockKind(block) === "evidence-gallery",
    );

    return pageHasEvidenceBlock || report.evidenceItems.length > 0;
  }, [activePage, report.evidenceItems.length]);

  const evidenceChanged =
    JSON.stringify(
      evidenceItems.map((item) => ({
        id: item.id,
        caption: item.caption || "",
        visible: item.visible,
        sortOrder: item.sortOrder,
      })),
    ) !==
    JSON.stringify(
      report.evidenceItems.map((item) => ({
        id: item.id,
        caption: item.caption || "",
        visible: item.visible,
        sortOrder: item.sortOrder,
      })),
    );

  const cleanBlockOverrides = useMemo(() => {
    const sanitized = sanitizeInitialBlockOverrides(pages, blockOverrides);
    const clean: Record<string, string> = {};

    for (const [key, value] of Object.entries(sanitized)) {
      const text = value.trim();

      if (text && !isLegacyRenderedReportDump(text)) {
        clean[key] = value;
      }
    }

    return clean;
  }, [pages, blockOverrides]);

  const hasChanges =
    title !== report.title ||
    JSON.stringify(cleanBlockOverrides) !==
      JSON.stringify(parsed.blocks || {}) ||
    evidenceLayoutMode !== (parsed.evidenceLayoutMode || "two-per-page") ||
    evidenceChanged;

  const filledTextsCount = Object.keys(cleanBlockOverrides).length;
  const visibleEvidenceCount = evidenceItems.filter((item) => item.visible).length;

  const previewUrl = `/dashboard/report/${report.id}/preview?template=${encodeURIComponent(
    report.templateId || "",
  )}&studio=true&v=${previewVersion}`;

  const pdfPreviewUrl = `/api/dashboard/reports/${report.id}/export/pdf?template=${encodeURIComponent(
    report.templateId || "",
  )}&inline=true&v=${previewVersion}`;

  const pdfDownloadUrl = `/api/dashboard/reports/${report.id}/export/pdf?template=${encodeURIComponent(
    report.templateId || "",
  )}&v=${previewVersion}`;

  const livePreviewTemplate = useMemo(() => {
    const livePage = buildLivePreviewPage({
      page: activePage,
      blocks: cleanBlockOverrides,
      context: runtimeContext,
      evidenceLayoutMode,
    });

    return {
      ...template,
      pages: livePage ? [livePage] : [],
    };
  }, [activePage, cleanBlockOverrides, evidenceLayoutMode, runtimeContext, template]);

  const livePreviewCaseData = useMemo(
    () => buildPreviewCaseDataForRenderer(report),
    [report],
  );

  const editableContent = useMemo(() => {
    return JSON.stringify(
      {
        ...parsed,
        version: 20,
        type: "FINAL_REPORT_PAGE_EDITOR",
        updatedAt: new Date().toISOString(),
        reportId: report.id,
        caseEntryId: report.caseEntry.id,
        serviceSlug: report.caseEntry.service.slug,
        templateId: report.templateId,
        evidenceLayoutMode,
        blocks: cleanBlockOverrides,
        pageOverrides: buildPageOverrides(pages, cleanBlockOverrides),
        workflowValueOverrides: parsed.workflowValueOverrides || [],
      },
      null,
      2,
    );
  }, [
    cleanBlockOverrides,
    evidenceLayoutMode,
    pages,
    parsed.workflowValueOverrides,
    report.caseEntry.id,
    report.caseEntry.service.slug,
    report.id,
    report.templateId,
  ]);

  const renderedContent = useMemo(() => {
    return buildRenderedContentFromPages({
      pages,
      blocks: cleanBlockOverrides,
      context: runtimeContext,
    });
  }, [pages, cleanBlockOverrides, runtimeContext]);

  async function saveEvidenceItems() {
    if (!evidenceChanged) return;

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
        "مسار حفظ الشواهد رجع HTML بدل JSON. أعد تشغيل السيرفر وتأكد من route الشواهد.",
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
        })),
      );
    }
  }

  async function saveReport() {
    if (isArchived) {
      setFeedback({
        type: "warning",
        title: "التقرير مؤرشف",
        message: "التقرير مؤرشف ولا يمكن تعديله قبل استعادته.",
      });
      return;
    }

    if (isApproved && !approvedEditingConfirmed) {
      setApprovedEditModalOpen(true);
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
        throw new Error(data.error || "تعذر حفظ التقارير.");
      }

      if (evidenceChanged) {
        setSavingEvidence(true);
        await saveEvidenceItems();
        setSavingEvidence(false);
      }

      setFeedback({
        type: "success",
        title: isApproved
          ? "تم حفظ تعديلات التقرير المعتمد"
          : "تم حفظ التعديلات",
        message:
          "تم حفظ تعديلات التقارير فقط. بيانات الحالة الأصلية لم تتغير.",
      });
      if (isApproved) setEditedAfterApprovalInSession(true);

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
            : "حدث خطأ أثناء حفظ التقارير.",
      });
    } finally {
      setSaving(false);
      setSavingEvidence(false);
    }
  }

  async function approveReport() {
    if (isArchived || isApproved) return;

    try {
      setApproving(true);
      setFeedback(null);

      if (hasChanges) {
        await saveReport();
      }

      const response = await fetch(
        `/api/dashboard/reports/${report.id}/approve`,
        { method: "POST" },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر اعتماد التقارير.");
      }

      setFeedback({
        type: "success",
        title: "تم اعتماد التقارير",
        message: "تم اعتماد التقارير وإغلاقه من التعديل.",
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
            : "حدث خطأ أثناء اعتماد التقارير.",
      });
    } finally {
      setApproving(false);
    }
  }

  function updateBlock(blockKey: string, value: string) {
    setBlockOverrides((current) => ({
      ...current,
      [blockKey]: value,
    }));
  }

  function resetBlock(blockKey: string) {
    setBlockOverrides((current) => {
      const next = { ...current };
      delete next[blockKey];
      return next;
    });
  }

  function rotateSuggestion(page: TemplatePage, block: TemplateBlock) {
    const blockIndex = page.blocks.findIndex((item) => item === block);
    const blockKey = getBlockKey(page, block, blockIndex >= 0 ? blockIndex : 0);
    const suggestions = buildSuggestionsForBlock({
      block,
      context: runtimeContext,
    });

    if (!suggestions.length) return;

    const nextIndex =
      ((suggestionIndexes[blockKey] ?? -1) + 1) % suggestions.length;

    setSuggestionIndexes((current) => ({
      ...current,
      [blockKey]: nextIndex,
    }));

    updateBlock(blockKey, suggestions[nextIndex].body);
  }

  function updateEvidenceItem(
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>,
  ) {
    setEvidenceItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function moveEvidenceItem(id: string, direction: "up" | "down") {
    setEvidenceItems((current) => {
      const index = current.findIndex((item) => item.id === id);

      if (index === -1) return current;

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
                محرر التقارير
              </p>

              <h1 className="mt-3 text-3xl font-black text-slate-950">
                {report.title}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                عدّل النصوص الظاهرة داخل صفحات القالب فقط. التعديل لا يغير
                بيانات الحالة الأصلية.
              </p>
              <p className="mt-2 text-xs font-bold text-slate-400">
                آخر تحديث للتقرير: {formatDate(report.updatedAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/report/${report.id}/preview?template=${encodeURIComponent(
                  report.templateId || "",
                )}&v=${previewVersion}`}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                فتح المعاينة
              </Link>

              <a
                href={pdfPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800"
              >
                معاينة PDF
              </a>

              <a
                href={pdfDownloadUrl}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                تحميل PDF
              </a>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-5 p-5 xl:grid-cols-[420px_minmax(0,1fr)] 2xl:grid-cols-[460px_minmax(0,1fr)]">
          <aside className="space-y-3 self-start">
{feedback ? <FeedbackCard feedback={feedback} /> : null}

            {isApproved ? (
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-black text-emerald-900">
                  هذا التقرير معتمد. يمكنك تعديل صياغة التقرير وعرض الشواهد دون تغيير بيانات الحالة الأصلية.
                </p>
                <p className="mt-2 text-xs font-bold leading-6 text-emerald-700">
                  سيظل التقرير بحالة معتمد، ولن تتغير النسخ المحفوظة أو تاريخ الاعتماد.
                </p>
                {!approvedEditingConfirmed ? (
                  <button
                    type="button"
                    onClick={() => setApprovedEditModalOpen(true)}
                    className="mt-3 w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"
                  >
                    تحرير التقرير المعتمد
                  </button>
                ) : (
                  <span className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                    وضع التحرير بعد الاعتماد مفعّل
                  </span>
                )}
              </section>
            ) : null}

            {isArchived ? (
              <section className="rounded-3xl border border-slate-200 bg-slate-100 p-4 text-sm font-black text-slate-600">
                التقرير مؤرشف ولا يمكن تعديله قبل استعادته.
              </section>
            ) : null}

            {wasEditedAfterApproval ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-900">تم تعديل التقرير بعد الاعتماد</p>
                <p className="mt-2 text-xs font-bold leading-6 text-amber-700">
                  تم تعديل صياغة التقرير بعد اعتماده، بينما بقيت بيانات الحالة الأصلية والنسخ المحفوظة دون تغيير.
                </p>
              </section>
            ) : null}

                        {/* REPORT_STUDIO_SIDE_TEXT_EDITOR */}
            <details open className="rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-slate-100">
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    تعديل نصوص الصفحة الحالية
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    هذا هو المدخل الأساسي للتعديل. عدّل النصوص هنا وسترى أثرها مباشرة في المعاينة المجاورة.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                    {activePage?.title || "صفحة التقارير"}
                  </span>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    {editableBlocks.length} بلوك نصي
                  </span>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                    فتح / إخفاء
                  </span>
                </div>
              </summary>

              <div className="mt-3 space-y-3">
                {editableBlocks.length ? (
                  editableBlocks.map((block, index) => {
                    const blockKey = getBlockKey(activePage, block, index);
                    const automaticText = getAutomaticBlockText(block, runtimeContext);
                    const overrideText = blockOverrides[blockKey];
                    const currentText =
                      overrideText !== undefined && !isLegacyRenderedReportDump(overrideText)
                        ? overrideText
                        : automaticText;

                    return (
                      <article
                        key={blockKey}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {getBlockTitle(block)}
                            </p>

                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                              {getFriendlyBlockKind(block)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSuggestionBlock({
                                  page: activePage,
                                  block,
                                  blockKey,
                                })
                              }
                              disabled={editorLocked}
                              className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-50"
                            >
                              نصوص مقترحة
                            </button>

                            <button
                              type="button"
                              onClick={() => rotateSuggestion(activePage, block)}
                              disabled={editorLocked}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              تدوير النص
                            </button>

                            <button
                              type="button"
                              onClick={() => resetBlock(blockKey)}
                              disabled={editorLocked}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              رجوع للتلقائي
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={currentText}
                          onChange={(event) =>
                            updateBlock(blockKey, event.target.value)
                          }
                          disabled={editorLocked}
                          rows={7}
                          className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold leading-7 text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100"
                        />

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 text-[11px] font-bold leading-6 text-slate-500">
                          <span>
                            يتم عرض هذا النص داخل البلوك المحدد فقط.
                          </span>

                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                            {currentText.trim() ? "جاهز للمعاينة" : "يستخدم النص التلقائي"}
                          </span>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-black text-slate-600">
                      لا توجد نصوص قابلة للتعديل في هذه الصفحة.
                    </p>
                  </div>
                )}
              </div>
            </details>

<section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black text-slate-900">
                عنوان التقارير
              </h2>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={editorLocked}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100"
              />
            </section>

                                    <div className="grid gap-2">
              <button
                type="button"
                onClick={saveReport}
                disabled={editorLocked || saving || (!hasChanges && !evidenceChanged)}
                className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {saving || savingEvidence
                  ? "جاري الحفظ..."
                  : isApproved
                    ? "حفظ تعديلات التقرير المعتمد"
                    : "حفظ التعديلات وتحديث المعاينة"}
              </button>

              {!isApproved && !isArchived ? (
                <button
                  type="button"
                  onClick={approveReport}
                  disabled={approving}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {approving ? "جاري الاعتماد..." : "اعتماد التقارير"}
                </button>
              ) : null}
            </div>
          </aside>

          <section className="flex min-w-0 flex-col gap-4">
            

            {activePageHasEvidence ? (
              <details className="order-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      الشواهد والمرفقات
                    </h2>

                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      مغلقة افتراضيًا لتبسيط الصفحة. افتحها فقط إذا أردت تعديل ترتيب الشواهد أو التعليقات أو الإظهار.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                      {evidenceItems.filter((item) => item.visible).length} ظاهر من {evidenceItems.length}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      فتح / إخفاء
                    </span>
                  </div>
                </summary>

                <div className="mt-4 space-y-4">
                  <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                    <h3 className="text-sm font-black text-emerald-950">
                      إعدادات عرض الشواهد داخل التقارير
                    </h3>

                    <p className="mt-1 text-xs font-bold leading-6 text-emerald-800">
                      هذا الخيار يحفظ داخل التقارير فقط، ومحرك الشواهد سيحافظ على كل شاهد داخل إطار الصفحة وينشئ صفحات إضافية عند الحاجة.
                    </p>

                    <select
                      value={evidenceLayoutMode}
                      onChange={(event) =>
                        setEvidenceLayoutMode(event.target.value as EvidenceLayoutMode)
                      }
                      disabled={editorLocked}
                      className="mt-3 w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-600 disabled:bg-slate-100"
                    >
                      {EVIDENCE_LAYOUT_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </section>

                  <EvidenceEditor
                    locked={editorLocked}
                    items={evidenceItems}
                    onUpdate={updateEvidenceItem}
                    onMove={moveEvidenceItem}
                  />
                </div>
              </details>
            ) : null}

            <section className="order-first rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    المعاينة الرسمية للصفحة الحالية
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                    المعاينة هي الأساس هنا. اختر الصفحة من الأعلى، ثم افتح تحرير النصوص فقط عند الحاجة.
                  </p>
                </div>

                <div className="grid gap-2 text-right">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    تحديث مباشر قبل الحفظ
                  </span>

                  <div className="flex flex-wrap items-center gap-2" aria-label="حالة مختصرة للتقرير">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      الحالة: {getStatusName(report.status)}
                    </span>

                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-black",
                        editorLocked
                          ? "bg-slate-200 text-slate-700"
                          : hasChanges
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800",
                      ].join(" ")}
                    >
                      {editorLocked ? "مغلق" : hasChanges ? "غير محفوظ" : "محفوظ"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                      {filledTextsCount} نص معدل · {visibleEvidenceCount} شاهد ظاهر
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {pages.map((page, index) => {
                  const active = page.id === activePageId;

                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setActivePageId(page.id)}
                      className={[
                        "rounded-2xl border px-4 py-2 text-xs font-black transition",
                        active
                          ? "border-emerald-600 bg-emerald-700 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white",
                      ].join(" ")}
                    >
                      {index + 1}. {page.title}
                    </button>
                  );
                })}
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-4">
                {livePreviewTemplate.pages.length ? (
                  <FinalReportDesignRenderer
                    template={livePreviewTemplate}
                    previewCaseData={livePreviewCaseData as any}
                    editorialBlocks={cleanBlockOverrides}
                    identity={{}}
                  />
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">
                    لا توجد صفحة نشطة للمعاينة.
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      </section>

      {suggestionBlock ? (
        <SuggestionsModal
          block={suggestionBlock.block}
          context={runtimeContext}
          onClose={() => setSuggestionBlock(null)}
          onUse={(text) => {
            updateBlock(suggestionBlock.blockKey, text);
            setSuggestionBlock(null);
          }}
        />
      ) : null}

      {approvedEditModalOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4" dir="rtl">
          <section className="w-full max-w-lg rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">تحرير تقرير معتمد</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
              سيتم تعديل محتوى التقرير فقط، بينما تبقى بيانات الحالة والنسخ المحفوظة كما هي. سيظل التقرير بحالة معتمد.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApprovedEditModalOpen(false)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setApprovedEditingConfirmed(true);
                  setApprovedEditModalOpen(false);
                }}
                className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-800"
              >
                بدء التحرير
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function StatusPanel({
  locked,
  status,
  hasChanges,
  textCount,
  evidenceCount,
}: {
  locked: boolean;
  status: string;
  hasChanges: boolean;
  textCount: number;
  evidenceCount: number;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-500">حالة التقارير</p>
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="النصوص المعدلة" value={`${textCount}`} />
        <MiniStat label="الشواهد الظاهرة" value={`${evidenceCount}`} />
      </div>
    </section>
  );
}

function FeedbackCard({ feedback }: { feedback: NonNullable<FeedbackState> }) {
  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-sky-200 bg-sky-50 text-sky-800",
  };

  return (
    <section className={["rounded-3xl border p-4", classes[feedback.type]].join(" ")}>
      <p className="text-sm font-black">{feedback.title}</p>
      <p className="mt-1 text-xs font-bold leading-6">{feedback.message}</p>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function SuggestionsModal({
  block,
  context,
  onClose,
  onUse,
}: {
  block: TemplateBlock;
  context: Record<string, string>;
  onClose: () => void;
  onUse: (text: string) => void;
}) {
  const suggestions = buildSuggestionsForBlock({ block, context });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section className="max-h-[86vh] w-full max-w-3xl overflow-auto rounded-[2rem] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-emerald-700">
              نصوص مقترحة بالقيم الحقيقية
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              {getBlockTitle(block)}
            </h2>
            <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
              اختر صياغة جاهزة. يمكنك تعديلها بعد الإدراج.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50"
          >
            إغلاق
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {suggestions.map((suggestion) => (
            <article
              key={suggestion.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    {suggestion.title}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">
                    {suggestion.helper}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onUse(suggestion.body)}
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                >
                  استخدام هذا النص
                </button>
              </div>

              <p className="mt-3 whitespace-pre-line rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-8 text-slate-700">
                {suggestion.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function EvidenceEditor({
  locked,
  items,
  onUpdate,
  onMove,
}: {
  locked: boolean;
  items: EvidenceItem[];
  onUpdate: (
    id: string,
    patch: Partial<Pick<EvidenceItem, "caption" | "visible">>,
  ) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            الشواهد في هذه الصفحة
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-500">
            إدارة ظهور الشواهد داخل التقرير فقط. حذف الشاهد الأصلي يتم من صفحة الحالة.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {items.filter((item) => item.visible).length} ظاهر
        </span>
      </div>

      <div className="mt-4">
        {items.length ? (
          <EvidencePreviewGrid
            items={items}
            compact
            actionsForItem={(item) => {
              const index = items.findIndex((entry) => entry.id === item.id);

              return (
                <>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      onUpdate(item.id, { visible: !Boolean(item.visible) })
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {item.visible ? "إخفاء" : "إظهار"}
                  </button>

                  <button
                    type="button"
                    disabled={locked || index <= 0}
                    onClick={() => onMove(item.id, "up")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    أعلى
                  </button>

                  <button
                    type="button"
                    disabled={locked || index === items.length - 1}
                    onClick={() => onMove(item.id, "down")}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    أسفل
                  </button>
                </>
              );
            }}
            footerForItem={(item) => {
              const index = items.findIndex((entry) => entry.id === item.id);

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-black text-slate-500">
                    <span>شاهد رقم {index + 1}</span>
                    <span>{item.visible ? "ظاهر في التقرير" : "مخفي من التقرير"}</span>
                  </div>

                  <input
                    value={item.caption || ""}
                    disabled={locked}
                    onChange={(event) =>
                      onUpdate(item.id, { caption: event.target.value })
                    }
                    placeholder="تعليق الشاهد داخل التقرير..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>
              );
            }}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
            لا توجد شواهد مرتبطة بهذا التقرير.
          </div>
        )}
      </div>
    </section>
  );
}

export function ReportStudioSavedPreview({ report }: ReportStudioEditorProps) {
  const parsed = parseEditableContent(report.editableContent, report.renderedContent);
  const template = mergeSignatureOnlyStudioPagesIntoPrevious(
    ensureDefaultStudioSignatureBlock(normalizeTemplateSnapshot(report)),
  );
  const pages = template.pages as TemplatePage[];
  const blocks = sanitizeInitialBlockOverrides(pages, parsed.blocks || {});
  const context = buildRuntimeContext(report);
  const previewTemplate = {
    ...template,
    pages: pages
      .map((page) =>
        buildLivePreviewPage({
          page,
          blocks,
          context,
          evidenceLayoutMode: parsed.evidenceLayoutMode || "two-per-page",
        }),
      )
      .filter(Boolean),
  };
  const editedAfterApproval = Boolean(parsed.editorialMeta?.editedAfterApproval);

  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-6" dir="rtl">
      <section className="mx-auto mb-5 flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm print:hidden">
        <div>
          <p className="text-sm font-black text-emerald-700">معاينة التقرير</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{report.title}</h1>
          <p className="mt-2 text-xs font-bold text-slate-500">
            الحالة: {getStatusName(report.status)} · آخر تحديث: {formatDate(report.updatedAt)}
          </p>
          {editedAfterApproval ? (
            <p className="mt-2 text-xs font-black text-amber-700">
              تم تعديل التقرير بعد الاعتماد — بقيت بيانات الحالة الأصلية والنسخ المحفوظة دون تغيير.
            </p>
          ) : null}
        </div>
        <Link href={`/dashboard/report/${report.id}/studio`} className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white">
          فتح المحرر
        </Link>
      </section>
      <section className="mx-auto max-w-7xl">
        <FinalReportDesignRenderer
          template={previewTemplate}
          previewCaseData={buildPreviewCaseDataForRenderer(report) as any}
          editorialBlocks={blocks}
          identity={{}}
        />
      </section>
    </main>
  );
}

function pickReportTemplateSnapshot(source: any) {
  if (!source) {
    return null;
  }

  if (Array.isArray(source.pages)) {
    return source;
  }

  if (Array.isArray(source.smartStudio?.pages)) {
    return source.smartStudio;
  }

  if (Array.isArray(source.templateJson?.pages)) {
    return source.templateJson;
  }

  if (Array.isArray(source.templateJson?.smartStudio?.pages)) {
    return source.templateJson.smartStudio;
  }

  if (Array.isArray(source.builderTemplate?.pages)) {
    return source.builderTemplate;
  }

  if (Array.isArray(source.snapshot?.pages)) {
    return source.snapshot;
  }

  return source;
}

function extractReportTemplatePages(snapshot: any): TemplatePage[] {
  const candidates = [
    snapshot?.pages,
    snapshot?.smartStudio?.pages,
    snapshot?.templateJson?.pages,
    snapshot?.templateJson?.smartStudio?.pages,
    snapshot?.builderTemplate?.pages,
    snapshot?.snapshot?.pages,
  ];

  const pagesCandidate = candidates.find((item) => Array.isArray(item));

  if (!Array.isArray(pagesCandidate)) {
    return [];
  }

  return pagesCandidate.map((page: any, index: number) => ({
    ...page,
    id: String(page?.id || "page-" + (index + 1)),
    title: String(page?.title || "صفحة " + (index + 1)),
    kind: page?.kind || "content",
    blocks: Array.isArray(page?.blocks) ? page.blocks : [],
  }));
}


function isStudioSignatureBlock(block: any) {
  const kind = String(
    block?.settings?.smartBlockKind ||
      block?.smartBlockKind ||
      block?.kind ||
      "",
  ).trim();

  const title = String(block?.title || block?.settings?.title || "").trim();

  return (
    kind === "signature-grid" ||
    kind === "signatures" ||
    kind === "approval-signatures" ||
    kind === "approval-signature" ||
    kind === "closing-note" ||
    title.includes("توقيع") ||
    title.includes("تواقيع") ||
    title.includes("اعتماد") ||
    Array.isArray(block?.signatures)
  );
}

function createDefaultStudioSignatureBlock() {
  return {
    id: "auto-default-signatures",
    kind: "signature-grid",
    title: "تواقيع الاعتماد",
    content: "",
    variant: "minimal",
    align: "center",
    showTitle: false,
    placement: "bottom",
    visible: true,
    autoDefaultSignature: true,
    signatures: [
      {
        key: "counselor",
        label: "الموجه الطلابي",
        signerName: "{{identity.counselorName}}",
        signerTitle: "موجه طلابي",
        imageUrl: "{{identity.counselorSignatureUrl}}",
        required: false,
      },
      {
        key: "principal",
        label: "مدير المدرسة",
        signerName: "{{identity.principalName}}",
        signerTitle: "مدير المدرسة",
        imageUrl: "{{identity.principalSignatureUrl}}",
        required: false,
      },
    ],
  };
}

function ensureDefaultStudioSignatureBlock(template: any) {
  const pages = Array.isArray(template?.pages) ? template.pages : [];

  if (!pages.length) {
    return template;
  }

  const hasSignature = pages.some((page: any) => {
    const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
    return blocks.some((block: any) => isStudioSignatureBlock(block));
  });

  if (hasSignature) {
    return template;
  }

  const lastPageIndex = pages.length - 1;

  return {
    ...template,
    pages: pages.map((page: any, pageIndex: number) => {
      if (pageIndex !== lastPageIndex) {
        return page;
      }

      const blocks = Array.isArray(page?.blocks) ? page.blocks : [];

      return {
        ...page,
        blocks: [...blocks, createDefaultStudioSignatureBlock()],
      };
    }),
  };
}

function isSignatureOnlyStudioPage(page: any) {
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  const pageKind = String(page?.kind || "").trim();

  if (!blocks.length) {
    return false;
  }

  if (pageKind === "approval") {
    return true;
  }

  return blocks.every((block: any) => isStudioSignatureBlock(block));
}

function mergeSignatureOnlyStudioPagesIntoPrevious(template: any) {
  const pages = Array.isArray(template?.pages) ? template.pages : [];

  if (pages.length <= 1) {
    return template;
  }

  const mergedPages: any[] = [];

  for (const page of pages) {
    const blocks = Array.isArray(page?.blocks) ? page.blocks : [];

    if (isSignatureOnlyStudioPage(page) && mergedPages.length > 0) {
      const previousPage = mergedPages[mergedPages.length - 1];
      const previousBlocks = Array.isArray(previousPage?.blocks) ? previousPage.blocks : [];

      mergedPages[mergedPages.length - 1] = {
        ...previousPage,
        blocks: [
          ...previousBlocks,
          ...blocks.map((block: any, index: number) => ({
            ...block,
            id: block?.id || `merged-signature-${mergedPages.length}-${index + 1}`,
            placement: block?.placement || "bottom",
          })),
        ],
      };

      continue;
    }

    mergedPages.push(page);
  }

  return {
    ...template,
    pages: mergedPages,
  };
}
function normalizeTemplateSnapshot(report: StudioReport) {
  const source =
    report.templateSnapshot?.builderTemplate ||
    report.templateSnapshot?.templateJson ||
    report.templateSnapshot?.smartStudio ||
    report.templateSnapshot ||
    null;

  const snapshot = pickReportTemplateSnapshot(source);
  const pages = extractReportTemplatePages(snapshot);

  if (pages.length) {
    return {
      ...(snapshot || {}),
      pages,
    };
  }

  return {
    id: "missing-template-pages",
    name: report.title,
    designTemplateId: DEFAULT_SELECTABLE_REPORT_DESIGN_ID,
    pages: [
      {
        id: "missing-template-pages",
        title: "لم يتم العثور على صفحات القالب",
        kind: "content",
        blocks: [],
      },
    ],
  };
}

function parseEditableContent(
  editableContent?: string | null,
  _renderedContent?: string | null,
): EditableContentPayload {
  const content = editableContent?.trim();

  if (!content) {
    return {
      blocks: {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };
  }

  try {
    const parsed = JSON.parse(content) as EditableContentPayload;
    const pageBlocks = flattenEditablePageOverrides(parsed.pageOverrides || {});
    const rawBlocks = parsed.blocks || {};

    return {
      ...parsed,
      blocks: {
        ...rawBlocks,
        ...pageBlocks,
      },
      pageOverrides: parsed.pageOverrides || {},
      workflowValueOverrides: Array.isArray(parsed.workflowValueOverrides)
        ? parsed.workflowValueOverrides
        : [],
      evidenceLayoutMode: parsed.evidenceLayoutMode || "two-per-page",
    };
  } catch {
    return {
      version: 1,
      type: "LEGACY_EDITORIAL_CONTENT",
      legacyContent: content,
      blocks: {},
      workflowValueOverrides: [],
      evidenceLayoutMode: "two-per-page",
    };
  }
}

function buildRuntimeContext(report: StudioReport) {
  const data = report.reportDataSnapshot || {};
  const student = report.caseEntry.student;

  const context: Record<string, string> = {
    "case.id": report.caseEntry.id,
    "case.title": report.caseEntry.title || report.title,
    "case.status": report.caseEntry.status,
    "case.createdAt": formatDate(report.caseEntry.createdAt),
    "report.title": report.title,
    reportTitle: report.title,
    caseTitle: report.caseEntry.title || report.title,

    "service.name": report.caseEntry.service.name,
    "service.slug": report.caseEntry.service.slug,
    serviceName: report.caseEntry.service.name,
    serviceSlug: report.caseEntry.service.slug,

    "student.name": student?.fullName || "",
    "student.grade": student?.grade || "",
    "student.classroom": student?.classroom || "",
    "student.stage": student?.stage || "",
    "student.guardianName": student?.guardianName || "",
    "student.guardianPhone": student?.guardianPhone || "",
    studentName: student?.fullName || "",
    studentGrade: student?.grade || "",
    studentClassroom: student?.classroom || "",
    studentStage: student?.stage || "",
    guardianName: student?.guardianName || "",
    guardianPhone: student?.guardianPhone || "",

    "evidence.count": String(report.evidenceItems.length),
    evidenceCount: String(report.evidenceItems.length),
  };

  for (const item of report.reportValues) {
    if (item.fieldKey) {
      context[item.fieldKey] = item.value;
      context[`field.${item.fieldKey}`] = item.value;
    }

    if (item.fieldLabel) {
      context[item.fieldLabel] = item.value;
      context[`field.${item.fieldLabel}`] = item.value;
    }
  }

  if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(flattenObject(data))) {
      if (context[key] === undefined) {
        context[key] = String(value ?? "");
      }
    }
  }

  context.programTitle =
    context.programTitle ||
    context.program_name ||
    context["field.program_name"] ||
    context["عنوان البرنامج"] ||
    report.title;

  context.executionDate =
    context.executionDate ||
    context.gregorian_date ||
    context.execution_date ||
    context["field.gregorian_date"] ||
    context["case.createdAt"];

  context.week =
    context.week || context["field.week"] || context["الأسبوع"] || "";

  context.day =
    context.day || context["field.day"] || context["اليوم"] || "";

  context.targetGroup =
    context.targetGroup ||
    context.beneficiaries ||
    context.target_group ||
    context["field.beneficiaries"] ||
    context["student.grade"] ||
    "";

  return context;
}

function flattenObject(
  value: unknown,
  prefix = "",
  result: Record<string, string> = {},
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return result;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenObject(child, nextKey, result);
    } else {
      result[nextKey] = String(child ?? "");
    }
  }

  return result;
}

function isEditableTextBlock(block: TemplateBlock) {
  const kind = normalizeBlockKind(block);

  if (
    kind === "evidence-gallery" ||
    kind === "dynamic-fields" ||
    kind === "field-list" ||
    kind === "meta-strip" ||
    kind === "case-meta" ||
    kind === "student-summary" ||
    kind === "service-summary"
  ) {
    return false;
  }

  return (
    kind === "hero-title" ||
    kind === "cover-title" ||
    kind === "section-text" ||
    kind === "multi-paragraph" ||
    kind === "paragraph" ||
    kind === "custom-paragraph" ||
    kind === "text-library" ||
    kind === "bullet-list" ||
    kind === "closing-note" ||
    Boolean(block.content || block.defaultContent || block.settings?.content)
  );
}

function normalizeBlockKind(block: TemplateBlock) {
  return (
    block.settings?.smartBlockKind ||
    block.smartBlockKind ||
    block.kind ||
    "section-text"
  );
}

function getBlockKey(page: TemplatePage, block: TemplateBlock, index: number) {
  if (block.id) {
    return String(block.id);
  }

  const title = getBlockTitle(block)
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_\u0600-\u06FF-]/g, "");

  const kind = normalizeBlockKind(block);

  return String(`${page.id}__${kind}__${title || index + 1}`);
}

function getBlockTitle(block: TemplateBlock) {
  return String(
    block.customTitle ||
      block.title ||
      block.settings?.title ||
      getFriendlyBlockKind(block),
  );
}

function getFriendlyBlockKind(block: TemplateBlock) {
  const kind = normalizeBlockKind(block);

  if (kind === "hero-title" || kind === "cover-title") return "عنوان رئيسي";
  if (kind === "text-library") return "نص من مكتبة النصوص";
  if (kind === "custom-paragraph") return "فقرة مخصصة";
  if (kind === "multi-paragraph") return "نص متعدد الفقرات";
  if (kind === "bullet-list") return "قائمة نقاط";
  if (kind === "closing-note") return "خاتمة واعتماد";
  if (kind === "signature-grid" || kind === "signatures" || kind === "approval-signatures") return "توقيع واعتماد";

  return "نص قابل للتعديل";
}

function getAutomaticBlockText(block: TemplateBlock, context: Record<string, string>) {
  const kind = normalizeBlockKind(block);
  const settings = block.settings || {};

  if (kind === "cover-title" || kind === "hero-title") {
    return renderText(
      repairArabicMojibake(block.content || settings.content || "{{case.title}}"),
      context,
    );
  }

  if (kind === "text-library") {
    return renderText(repairArabicMojibake(resolveTextLibraryFallback(block)), context);
  }

  const content =
    block.content ||
    block.customContent ||
    settings.content ||
    block.defaultContent ||
    "";

  return renderText(repairArabicMojibake(content), context);
}

function resolveTextLibraryFallback(block: TemplateBlock) {
  const category =
    block.settings?.textLibrary?.category ||
    block.settings?.category ||
    block.category ||
    getBlockTitle(block);

  if (String(category).includes("هدف")) {
    return "يهدف هذا التقارير إلى توثيق {serviceName} وبيان أبرز البيانات والإجراءات المرتبطة بالحالة {caseTitle}.";
  }

  if (String(category).includes("إجراء")) {
    return "تم تنفيذ الإجراءات المرتبطة بخدمة {serviceName} وفق البيانات المعتمدة في الحالة، مع توثيق ما يلزم من شواهد.";
  }

  if (String(category).includes("نتيجة")) {
    return "توضح البيانات الحالية أن خدمة {serviceName} تم التعامل معها وفق ما ورد في الحالة، مع حفظ النتائج داخل التقارير.";
  }

  if (String(category).includes("توصية")) {
    return "يوصى بمتابعة الحالة عند الحاجة وتحديث السجل عند وجود مستجدات، مع الاستفادة من الشواهد المرتبطة بالتقارير.";
  }

  if (String(category).includes("خاتمة")) {
    return "تم إعداد هذا التقارير من منصة التوجيه الطلابي اعتمادًا على بيانات الحالة والشواهد المرتبطة بها.";
  }

  return "تم إعداد هذا التقارير لخدمة {serviceName} بناءً على بيانات الحالة {caseTitle} والشواهد المرتبطة بها.";
}

function buildSuggestionsForBlock({
  block,
  context,
}: {
  block: TemplateBlock;
  context: Record<string, string>;
}): SuggestionItem[] {
  const serviceName = safeValue(context.serviceName, "الخدمة الإرشادية");
  const caseTitle = safeValue(context.caseTitle, "الحالة");
  const studentName = safeValue(context.studentName, "الطالب/الطالبة");
  const programTitle = safeValue(context.programTitle, caseTitle);
  const executionDate = safeValue(context.executionDate, "التاريخ المحدد");
  const week = safeValue(context.week, "الأسبوع المحدد");
  const targetGroup = safeValue(context.targetGroup, "الفئة المستهدفة");
  const evidenceCount = safeValue(context.evidenceCount, "0");

  const title = getBlockTitle(block);
  const kind = normalizeBlockKind(block);
  const purpose = detectSuggestionPurpose(title, kind);

  if (purpose === "goals") {
    return [
      {
        id: "goals-1",
        title: "هدف رسمي مختصر",
        helper: "مناسب للتقارير المختصرة.",
        body: `يهدف هذا التقارير إلى توثيق ${serviceName} المرتبطة بـ ${caseTitle}، وبيان أبرز البيانات والإجراءات والشواهد التي تم تسجيلها في المنصة.`,
      },
      {
        id: "goals-2",
        title: "هدف تربوي",
        helper: "صياغة تربوية مناسبة للإدارة.",
        body: `يسعى التقارير إلى إبراز الجهود التربوية والإرشادية المقدمة ضمن ${serviceName}، ومتابعة أثرها على ${studentName} أو الفئة المستهدفة، وفق البيانات المعتمدة.`,
      },
      {
        id: "goals-3",
        title: "هدف تفصيلي",
        helper: "مناسب للتقارير الطويلة.",
        body: `يهدف التقارير إلى جمع بيانات ${caseTitle} في صورة منظمة، تشمل الخدمة المقدمة، القيم المسجلة، الشواهد الداعمة، والتوصيات المناسبة لضمان جودة المتابعة.`,
      },
    ];
  }

  if (purpose === "procedures") {
    return [
      {
        id: "procedures-1",
        title: "إجراء رسمي",
        helper: "صياغة مباشرة وواضحة.",
        body: `تم تنفيذ ${serviceName} خلال ${week} بتاريخ ${executionDate}، وفق الإجراءات المعتمدة في الخطة، مع توثيق البيانات والشواهد ذات العلاقة.`,
      },
      {
        id: "procedures-2",
        title: "إجراء منظم",
        helper: "يركز على التوثيق.",
        body: `تمت مراجعة بيانات ${caseTitle}، وتنظيم القيم المرتبطة بالخدمة، وربط الشواهد الداعمة وعددها ${evidenceCount}، تمهيدًا لإصدار التقارير الرسمي.`,
      },
      {
        id: "procedures-3",
        title: "إجراء تربوي",
        helper: "مناسب للبرامج والمتابعات.",
        body: `جرى التعامل مع ${caseTitle} بما يتناسب مع طبيعة ${serviceName}، مع مراعاة احتياج ${studentName} أو ${targetGroup}، وتوثيق ما تم تنفيذه داخل التقارير.`,
      },
    ];
  }

  if (purpose === "results") {
    return [
      {
        id: "results-1",
        title: "نتيجة مختصرة",
        helper: "تصلح للنتائج العامة.",
        body: `أظهرت البيانات المسجلة أن ${serviceName} تم تنفيذها وتوثيقها بنجاح، مع توفر الشواهد والبيانات اللازمة لدعم التقارير.`,
      },
      {
        id: "results-2",
        title: "نتيجة تحليلية",
        helper: "تعطي التقارير طابعًا أكثر مهنية.",
        body: `تشير المعطيات المرتبطة بـ ${caseTitle} إلى اكتمال عناصر التقارير الأساسية، بما في ذلك البيانات، القيم، والشواهد، مما يعزز موثوقية التقارير النهائي.`,
      },
      {
        id: "results-3",
        title: "نتيجة متابعة",
        helper: "مناسب للحالات التي تحتاج استمرار.",
        body: `توضح نتائج المتابعة أن الحالة تتطلب الاستمرار في الرصد عند الحاجة، مع تحديث السجل والشواهد عند ظهور أي مستجدات مرتبطة بـ ${serviceName}.`,
      },
    ];
  }

  if (purpose === "recommendations") {
    return [
      {
        id: "recommendations-1",
        title: "توصيات عملية",
        helper: "مختصرة وقابلة للتنفيذ.",
        body: `يوصى بمتابعة ${caseTitle} وفق الحاجة، وتحديث البيانات في المنصة عند وجود مستجدات، مع الاستمرار في توثيق الشواهد المرتبطة بـ ${serviceName}.`,
      },
      {
        id: "recommendations-2",
        title: "توصيات للإدارة",
        helper: "مناسبة للرفع الرسمي.",
        body: `يوصى بالاطلاع على هذا التقارير واعتماد ما ورد فيه من بيانات وشواهد، مع دعم الإجراءات التي تعزز جودة تنفيذ ${serviceName}.`,
      },
      {
        id: "recommendations-3",
        title: "توصيات تربوية",
        helper: "صياغة تربوية مرنة.",
        body: `يوصى بتعزيز التواصل والمتابعة بما يخدم مصلحة ${studentName} أو ${targetGroup}، والاستفادة من نتائج التقارير في تحسين التدخلات اللاحقة.`,
      },
    ];
  }

  if (purpose === "closing") {
    return [
      {
        id: "closing-1",
        title: "خاتمة رسمية",
        helper: "مناسبة للتقارير الرسمية.",
        body: `وبذلك تم إعداد هذا التقارير لخدمة ${serviceName} اعتمادًا على البيانات المسجلة والشواهد المرتبطة بالحالة، ليكون مرجعًا رسميًا عند الحاجة.`,
      },
      {
        id: "closing-2",
        title: "خاتمة مختصرة",
        helper: "مناسبة لتقرير سريع.",
        body: `تم توثيق بيانات ${caseTitle} وشواهدها في هذا التقارير، مع حفظ نسخة قابلة للمراجعة والاعتماد.`,
      },
      {
        id: "closing-3",
        title: "خاتمة تربوية",
        helper: "مناسبة للموجهين.",
        body: `يعكس هذا التقارير الجهود المبذولة في متابعة ${caseTitle} ضمن ${serviceName}، ويؤكد أهمية استمرار التوثيق والمتابعة عند الحاجة.`,
      },
    ];
  }

  return [
    {
      id: "intro-1",
      title: "مقدمة رسمية",
      helper: "صياغة مناسبة لمعظم التقارير.",
      body: `بناءً على بيانات ${caseTitle} المرتبطة بخدمة ${serviceName}، تم إعداد هذا التقارير لعرض أبرز المعلومات والقيم والشواهد المسجلة في المنصة.`,
    },
    {
      id: "intro-2",
      title: "مقدمة تربوية",
      helper: "صياغة إنسانية للموجه.",
      body: `يأتي هذا التقارير ضمن جهود التوجيه الطلابي في متابعة ${caseTitle}، وتوثيق ما يرتبط بها من إجراءات ونتائج تخدم ${studentName} أو ${targetGroup}.`,
    },
    {
      id: "intro-3",
      title: "مقدمة مختصرة",
      helper: "مناسبة للتقارير السريعة.",
      body: `يوثق هذا التقارير خدمة ${serviceName} للحالة ${caseTitle}، مع عرض البيانات والشواهد الداعمة بصورة منظمة.`,
    },
    {
      id: "intro-4",
      title: "مقدمة تفصيلية",
      helper: "تضيف سياقًا أكثر للتقرير.",
      body: `تم إنشاء هذا التقارير بعد مراجعة بيانات الحالة وربطها بالقيم والشواهد المتاحة، بهدف تقديم صورة واضحة عن ${serviceName} وما تم توثيقه بشأن ${caseTitle}.`,
    },
  ];
}

function detectSuggestionPurpose(title: string, kind: string) {
  const text = `${title} ${kind}`;

  if (text.includes("هدف") || text.includes("أهداف")) return "goals";
  if (text.includes("إجراء") || text.includes("تنفيذ")) return "procedures";
  if (text.includes("نتيجة") || text.includes("نتائج")) return "results";
  if (text.includes("توصية") || text.includes("توصيات")) return "recommendations";
  if (text.includes("خاتمة") || text.includes("اعتماد")) return "closing";

  return "intro";
}

function safeValue(value: string | undefined, fallback: string) {
  const clean = String(value || "").trim();

  return clean || fallback;
}

function renderText(text: string, context: Record<string, string>) {
  return repairArabicMojibake(String(text || ""))
    .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) =>
      resolveContextVariable(key, context),
    )
    .replace(/\{([A-Za-z0-9_.\-\u0600-\u06FF ]+)\}/g, (_match, key: string) =>
      resolveContextVariable(key, context),
    );
}

function resolveContextVariable(key: string, context: Record<string, string>) {
  const cleanKey = String(key || "").trim();

  const aliases: Record<string, string[]> = {
    reportTitle: ["reportTitle", "report.title", "case.title", "caseTitle"],
    caseTitle: ["case.title", "caseTitle", "reportTitle"],
    serviceName: ["service.name", "serviceName"],
    studentName: ["student.name", "studentName"],
    studentGrade: ["student.grade", "studentGrade"],
    studentClassroom: ["student.classroom", "studentClassroom"],
    guardianName: ["student.guardianName", "guardianName"],
    guardianPhone: ["student.guardianPhone", "guardianPhone"],
  };

  const keys = [
    cleanKey,
    ...(aliases[cleanKey] || []),
    cleanKey.startsWith("field.") ? cleanKey : `field.${cleanKey}`,
  ];

  for (const lookupKey of keys) {
    const value = context[lookupKey];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return "";
}

function buildPageOverrides(
  pages: TemplatePage[],
  blocks: Record<string, string>,
) {
  const pageOverrides: EditableContentPayload["pageOverrides"] = {};

  for (const page of pages) {
    page.blocks.forEach((block, index) => {
      const blockKey = getBlockKey(page, block, index);
      const content = blocks[blockKey];

      if (!content?.trim() || isLegacyRenderedReportDump(content)) {
        return;
      }

      pageOverrides[page.id] ||= {};
      pageOverrides[page.id][blockKey] = {
        content,
      };
    });
  }

  return pageOverrides;
}

function buildRenderedContentFromPages({
  pages,
  blocks,
  context,
}: {
  pages: TemplatePage[];
  blocks: Record<string, string>;
  context: Record<string, string>;
}) {
  return pages
    .map((page) => {
      const blockText = page.blocks
        .map((block, index) => {
          const blockKey = getBlockKey(page, block, index);
          const value = blocks[blockKey]?.trim();

          if (!value || isLegacyRenderedReportDump(value)) {
            return "";
          }

          return `${page.title} - ${getBlockTitle(block)}\n${renderText(
            value,
            context,
          )}`;
        })
        .filter(Boolean)
        .join("\n\n");

      return blockText;
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildLivePreviewPage({
  page,
  blocks,
  context,
  evidenceLayoutMode,
}: {
  page?: TemplatePage;
  blocks: Record<string, string>;
  context: Record<string, string>;
  evidenceLayoutMode: EvidenceLayoutMode;
}) {
  if (!page) {
    return null;
  }

  return {
    ...page,
    blocks: page.blocks.map((block, index) => {
      const blockKey = getBlockKey(page, block, index);
      const override = blocks[blockKey];
      const automaticText = getAutomaticBlockText(block, context);
      const content =
        override !== undefined
          ? repairArabicMojibake(override)
          : automaticText;

      return {
        ...block,
        ...(normalizeBlockKind(block) === "evidence-gallery"
          ? { evidenceLayout: toRendererEvidenceLayout(evidenceLayoutMode) }
          : {}),
        content,
        customContent: content,
        settings: {
          ...(block.settings || {}),
          content,
        },
      };
    }),
  };
}

function toRendererEvidenceLayout(mode: EvidenceLayoutMode) {
  if (mode === "one-per-page") return "ONE_PER_PAGE";
  if (mode === "grid-2x2") return "GRID_2X2";
  if (mode === "compact") return "ATTACHMENT_LIST";
  return "TWO_PER_PAGE";
}

function buildPreviewCaseDataForRenderer(report: StudioReport) {
  const student = report.caseEntry.student;
  const snapshot = report.reportDataSnapshot || {};

  return {
    caseId: report.caseEntry.id,
    id: report.caseEntry.id,
    title: report.caseEntry.title || report.title,
    status: report.caseEntry.status,
    createdAt: report.caseEntry.createdAt,
    updatedAt: report.updatedAt,
    serviceName: report.caseEntry.service.name,
    serviceSlug: report.caseEntry.service.slug,
    student: {
      name: student?.fullName || "",
      fullName: student?.fullName || "",
      grade: student?.grade || "",
      classroom: student?.classroom || "",
      stage: student?.stage || "",
      guardianName: student?.guardianName || "",
      guardianPhone: student?.guardianPhone || "",
    },
    values: report.reportValues.map((item) => ({
      fieldKey: item.fieldKey,
      fieldLabel: item.fieldLabel,
      value: item.value,
    })),
    evidences: report.evidenceItems
      .filter((item) => item.visible)
      .map((item) => ({
        id: item.id,
        title: item.caption || item.fileName,
        caption: item.caption || item.fileName,
        fileUrl: item.fileUrl,
        imageUrl: item.fileUrl,
      })),
    snapshot,
  };
}

function repairArabicMojibake(value: string) {
  const text = String(value || "");

  if (!/[ØÙÃ]/.test(text)) {
    return text;
  }

  try {
    const bytes = new Uint8Array(
      Array.from(text).map((char) => char.charCodeAt(0) & 255),
    );

    const decoded = new TextDecoder("utf-8").decode(bytes);
    const originalArabic = (text.match(/[\\u0600-\\u06FF]/g) || []).length;
    const decodedArabic = (decoded.match(/[\\u0600-\\u06FF]/g) || []).length;

    return decodedArabic > originalArabic ? decoded : text;
  } catch {
    return text;
  }
}



function sanitizeInitialBlockOverrides(
  pages: TemplatePage[],
  blocks: Record<string, string>,
) {
  const allowedKeys = new Set<string>();

  for (const page of pages) {
    page.blocks.forEach((block, index) => {
      if (!isEditableTextBlock(block)) {
        return;
      }

      allowedKeys.add(getBlockKey(page, block, index));

      if (block.id) {
        allowedKeys.add(String(block.id));
      }
    });
  }

  const clean: Record<string, string> = {};

  for (const [key, value] of Object.entries(blocks || {})) {
    if (!allowedKeys.has(key)) {
      continue;
    }

    if (isLegacyRenderedReportDump(value)) {
      continue;
    }

    clean[key] = repairArabicMojibake(value);
  }

  return clean;
}

function flattenEditablePageOverrides(
  pageOverrides: EditableContentPayload["pageOverrides"],
) {
  const blocks: Record<string, string> = {};

  for (const page of Object.values(pageOverrides || {})) {
    for (const [blockKey, override] of Object.entries(page || {})) {
      const content = override?.content || "";

      if (!content.trim() || isLegacyRenderedReportDump(content)) {
        continue;
      }

      blocks[blockKey] = repairArabicMojibake(content);
    }
  }

  return blocks;
}

function isLegacyRenderedReportDump(value: string) {
  const text = String(value || "");

  if (!text.trim()) {
    return false;
  }

  const hasReplacementChars = /�/.test(text);
  const hasMojibakeMarks = /[ØÙÃ]/.test(text);
  const hasReportDumpLabels =
    /program_name\s*:|semester\s*:|gregorian_date\s*:|beneficiaries\s*:|execution_action\s*:|execution_mechanism\s*:|performance_indicator\s*:|selectedStudent\s*:/.test(
      text,
    );

  const hasOldArabicDump =
    text.includes("ملخص التقارير") ||
    text.includes("بيانات الحالة") ||
    text.includes("القيم المسجلة") ||
    text.includes("الشواهد:") ||
    text.includes("تقرير:");

  const tooLongForBlock = text.length > 1800;

  return (
    hasReplacementChars ||
    hasMojibakeMarks ||
    hasReportDumpLabels ||
    (hasOldArabicDump && tooLongForBlock)
  );
}


function formatDate(value: string | null | undefined) {
  if (!value) return new Date().toLocaleDateString("ar-SA");

  try {
    return new Date(value).toLocaleDateString("ar-SA");
  } catch {
    return String(value);
  }
}

function getStatusName(status: string) {
  if (status === "APPROVED") return "معتمد";
  if (status === "ARCHIVED") return "مؤرشف";
  if (status === "GENERATED") return "مولد";
  return "مسودة";
}
