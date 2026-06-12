"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { ReportAddBlockMenu } from "@/components/report-engine/document-editor/report-add-block-menu";
import { ReportPageCanvas } from "@/components/report-engine/document-editor/report-page-canvas";
import { ReportPageTabs } from "@/components/report-engine/document-editor/report-page-tabs";
import { ReportTableEditorModal } from "@/components/report-engine/document-editor/report-table-editor-modal";
import type {
  ReportDocumentBlock,
  ReportDocumentBlockInsertType,
  ReportDocumentDraft,
  ReportTableBlock,
} from "@/lib/report-engine/document-draft/report-document-types";
import {
  addReportDocumentBlock,
  addReportDocumentPageAfter,
  ensureReportDocumentSystemBlocks,
  moveReportDocumentBlock,
  moveReportDocumentPage,
  removeReportDocumentBlock,
  removeReportDocumentMetaField,
  removeReportDocumentPage,
  updateReportDocumentBlock,
  updateReportDocumentEvidenceConfig,
  updateReportDocumentMetaField,
  updateReportDocumentTableBlock,
  updateReportDocumentTitle,
} from "@/lib/report-engine/document-draft/report-document-operations";
import { paginateReportDocumentDraftForA4 } from "@/lib/report-engine/document-draft/report-document-a4-paginator";
import { saveReportDocumentDraft } from "@/lib/report-engine/document-draft/report-draft-storage";

type ReportDocumentEditorProps = {
  initialDraft: ReportDocumentDraft;
  onDraftChange?: (draft: ReportDocumentDraft) => void;
};

function renderFieldValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";

  if (Array.isArray(value)) {
    return value.filter(Boolean).join("، ") || "—";
  }

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  return String(value);
}

export function ReportDocumentEditor({
  initialDraft,
  onDraftChange,
}: ReportDocumentEditorProps) {
  const [draft, setDraft] = useState<ReportDocumentDraft>(() =>
    ensureReportDocumentSystemBlocks(initialDraft),
  );
  const [metaFieldsOpen, setMetaFieldsOpen] = useState(true);
  const [evidenceSettingsOpen, setEvidenceSettingsOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [activePageId, setActivePageId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<ReportTableBlock | null>(null);
  const [reportApproved, setReportApproved] = useState(false);

  const renderedPages = useMemo(
    () => paginateReportDocumentDraftForA4(draft),
    [draft],
  );

  const metaFields = useMemo(() => {
    const fields = draft.pages.flatMap((page) =>
      page.blocks.flatMap((block) =>
        block.type === "META_FIELDS" ? block.fields : [],
      ),
    );

    const seen = new Set<string>();

    return fields.filter((field) => {
      if (seen.has(field.key)) return false;

      seen.add(field.key);

      return true;
    });
  }, [draft.pages]);

  const activePage = useMemo(() => {
    return renderedPages.find((page) => page.id === activePageId) || renderedPages[0] || null;
  }, [activePageId, renderedPages]);

  useEffect(() => {
    if (!activePage && renderedPages[0]) {
      setActivePageId(renderedPages[0].id);
    }
  }, [activePage, renderedPages]);

  useEffect(() => {
    saveReportDocumentDraft(draft);
  }, [draft]);

  function commitDraft(nextDraft: ReportDocumentDraft) {
    if (reportApproved) {
      window.alert("تم حفظ واعتماد التقرير. لا يمكن التعديل بعد الاعتماد والتصدير.");
      return;
    }

    setDraft(nextDraft);
    onDraftChange?.(nextDraft);
  }

  function getSourcePageId(renderedPageId: string) {
    return (
      renderedPages.find((page) => page.id === renderedPageId)?.sourcePageId ||
      renderedPages[0]?.sourcePageId ||
      ""
    );
  }

  function handleTitleChange(title: string) {
    commitDraft(updateReportDocumentTitle(draft, title));
  }

  function handleRemoveMetaField(fieldKey: string) {
    commitDraft(removeReportDocumentMetaField(draft, fieldKey));
  }

  function handleUpdateMetaField(
    fieldKey: string,
    patch: {
      label?: string;
      value?: string;
    },
  ) {
    commitDraft(updateReportDocumentMetaField(draft, fieldKey, patch));
  }

  function handleAddPageAfter(renderedPageId: string) {
    const sourcePageId = getSourcePageId(renderedPageId);
    const nextDraft = addReportDocumentPageAfter(draft, sourcePageId);

    commitDraft(nextDraft);

    window.setTimeout(() => {
      const nextRenderedPages = paginateReportDocumentDraftForA4(nextDraft);
      const currentIndex = nextRenderedPages.findIndex(
        (page) => page.sourcePageId === sourcePageId,
      );
      const nextPage = nextRenderedPages[currentIndex + 1] || nextRenderedPages.at(-1);

      if (nextPage) setActivePageId(nextPage.id);
      setSelectedBlockId(null);
    }, 0);
  }

  function handleRemovePage(renderedPageId: string) {
    const sourcePageId = getSourcePageId(renderedPageId);
    const nextDraft = removeReportDocumentPage(draft, sourcePageId);

    commitDraft(nextDraft);

    window.setTimeout(() => {
      const nextRenderedPages = paginateReportDocumentDraftForA4(nextDraft);
      setActivePageId(nextRenderedPages[0]?.id || "");
      setSelectedBlockId(null);
    }, 0);
  }

  function handleMovePage(renderedPageId: string, direction: "previous" | "next") {
    const sourcePageId = getSourcePageId(renderedPageId);

    commitDraft(moveReportDocumentPage(draft, sourcePageId, direction));
  }

  function handleAddBlock(type: ReportDocumentBlockInsertType) {
    if (!activePage) return;

    const result = addReportDocumentBlock(
      draft,
      activePage.sourcePageId,
      type,
      selectedBlockId,
    );

    commitDraft(result.draft);
    setSelectedBlockId(result.blockId);
  }

  function handleUpdateBlock(
    blockId: string,
    patch: Partial<ReportDocumentBlock>,
  ) {
    commitDraft(updateReportDocumentBlock(draft, blockId, patch));
  }

  function handleRemoveBlock(blockId: string) {
    commitDraft(removeReportDocumentBlock(draft, blockId));

    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }

  function handleMoveBlock(blockId: string, direction: "previous" | "next") {
    if (!activePage) return;

    commitDraft(
      moveReportDocumentBlock(draft, activePage.sourcePageId, blockId, direction),
    );
  }

  function handleEvidenceConfigChange(
    patch: Partial<NonNullable<ReportDocumentDraft["evidenceConfig"]>>,
  ) {
    commitDraft(
      updateReportDocumentEvidenceConfig(draft, {
        ...draft.evidenceConfig,
        ...patch,
        showCaptions: false,
      }),
    );
  }

  function handleOpenTableEditor(table: ReportTableBlock) {
    setEditingTable(table);
    setSelectedBlockId(table.id);
  }

  function handleSaveTable(table: ReportTableBlock) {
    commitDraft(updateReportDocumentTableBlock(draft, table));
    setSelectedBlockId(table.id);
    setEditingTable(null);
  }

  function sanitizeFileName(value: string) {
    return String(value || "")
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 120);
  }

  function getReportPdfFileName() {
    const serviceName = draft.payload.service.name || draft.title || "تقرير";
    const academicYear = draft.payload.identity.academicYear || "العام الدراسي";

    return `${sanitizeFileName(serviceName)} - ${sanitizeFileName(academicYear)}`;
  }

  function handleApproveReport() {
    const confirmed = window.confirm(
      "سيتم حفظ واعتماد التقرير. بعد الاعتماد والتصدير لا يمكن التعديل على التقرير. هل تريد المتابعة؟",
    );

    if (!confirmed) return;

    saveReportDocumentDraft(draft);
    onDraftChange?.(draft);
    setReportApproved(true);

    window.alert("تم حفظ واعتماد التقرير. يمكنك الآن تحميل التقرير PDF.");
  }

  function handleDownloadReport() {
    if (!reportApproved) {
      window.alert("يجب حفظ واعتماد التقرير أولاً قبل التحميل.");
      return;
    }

    const previousTitle = document.title;
    document.title = getReportPdfFileName();

    window.setTimeout(() => {
      window.print();

      window.setTimeout(() => {
        document.title = previousTitle;
      }, 1000);
    }, 100);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="space-y-4 print:hidden">
        <div className="rounded-[2rem] border border-emerald-100 bg-white p-4 shadow-sm">
          <div className="mb-4 border-b border-emerald-50 pb-4">
            <h2 className="text-base font-black text-slate-950">لوحة التحكم والمعاينة</h2>
            <p className="mt-1 text-xs font-bold leading-6 text-slate-400">
              رتّب محتوى التقرير وعدّل البيانات والشواهد قبل تحميل التقرير PDF.
            </p>
          </div>

          <div className="space-y-4">
            <section className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4">
              <h3 className="text-sm font-black text-slate-900">١. عنوان التقرير</h3>
              <p className="mt-1 text-xs font-bold text-slate-400">
                يظهر في الترويسة وفي تبويب الصفحة الأولى.
              </p>

              <input
                value={draft.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 outline-none transition focus:border-emerald-300"
                placeholder="عنوان التقرير"
              />
            </section>

            <section className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setMetaFieldsOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 text-right"
              >
                <div>
                  <h3 className="text-sm font-black text-slate-900">٢. بيانات التقرير</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    عدّل أو احذف الحقول الظاهرة داخل التقرير.
                  </p>
                </div>

                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                  {metaFieldsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {metaFieldsOpen ? (
                <div className="max-h-[460px] space-y-2 overflow-y-auto p-3">
                  {metaFields.length === 0 ? (
                    <div className="rounded-2xl bg-white px-4 py-4 text-center text-xs font-bold text-slate-500">
                      لا توجد حقول ظاهرة في بيانات التقرير.
                    </div>
                  ) : null}

                  {metaFields.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-2xl border border-slate-100 bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[10px] font-black text-slate-400">
                          {field.key}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveMetaField(field.key)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          title="حذف الحقل من التقرير"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <label className="mb-1 block text-[10px] font-black text-slate-500">
                        اسم الحقل
                      </label>
                      <input
                        value={field.label}
                        onChange={(event) =>
                          handleUpdateMetaField(field.key, {
                            label: event.target.value,
                          })
                        }
                        className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white"
                        placeholder="اسم الحقل"
                      />

                      <label className="mb-1 block text-[10px] font-black text-slate-500">
                        القيمة
                      </label>
                      <textarea
                        value={renderFieldValue(field.value)}
                        onChange={(event) =>
                          handleUpdateMetaField(field.key, {
                            value: event.target.value,
                          })
                        }
                        rows={2}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black leading-6 text-slate-950 outline-none transition focus:border-emerald-300 focus:bg-white"
                        placeholder="قيمة الحقل"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setEvidenceSettingsOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 text-right"
              >
                <div>
                  <h3 className="text-sm font-black text-slate-900">٣. إعدادات الشواهد</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    اختر ظهور الشواهد وعددها وحجم الصورة.
                  </p>
                </div>

                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                  {evidenceSettingsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {evidenceSettingsOpen ? (
                <div className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black text-slate-700">عرض الشواهد</span>
                  <div className="inline-flex rounded-full bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => handleEvidenceConfigChange({ visible: true })}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-black",
                        draft.evidenceConfig.visible !== false
                          ? "bg-emerald-700 text-white shadow-sm"
                          : "text-slate-500",
                      ].join(" ")}
                    >
                      ظاهر
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEvidenceConfigChange({ visible: false })}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-black",
                        draft.evidenceConfig.visible === false
                          ? "bg-emerald-700 text-white shadow-sm"
                          : "text-slate-500",
                      ].join(" ")}
                    >
                      مخفي
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-black text-slate-700">
                    عدد الشواهد في الصفحة
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-full bg-slate-100 p-1">
                    {([1, 2, 4] as const).map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleEvidenceConfigChange({ itemsPerPage: count })}
                        className={[
                          "rounded-full px-3 py-2 text-xs font-black",
                          (draft.evidenceConfig.itemsPerPage ?? 2) === count
                            ? "bg-emerald-700 text-white shadow-sm"
                            : "text-slate-500",
                        ].join(" ")}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-black text-slate-700">
                    أبعاد الصورة
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["large", "كبير 160×178"],
                      ["small-squares", "عادي 82×82"],
                      ["portrait", "طولي 95×70"],
                      ["landscape", "عرضي 120×58"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          handleEvidenceConfigChange({
                            imageSize:
                              value as NonNullable<
                                ReportDocumentDraft["evidenceConfig"]
                              >["imageSize"],
                          })
                        }
                        className={[
                          "rounded-full px-3 py-2 text-xs font-black",
                          (draft.evidenceConfig.imageSize ?? "small-squares") === value
                            ? "bg-emerald-700 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setAddBlockOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 text-right"
              >
                <div>
                  <h3 className="text-sm font-black text-slate-900">٤. إضافة بلوك</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    أضف فقرة أو قائمة أو جدول داخل الصفحة الحالية.
                  </p>
                </div>

                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-slate-100">
                  {addBlockOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {addBlockOpen ? (
                <div className="p-3">
                  <ReportAddBlockMenu onAddBlock={handleAddBlock} />
                </div>
              ) : null}
            </section>

                        <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/60 p-4">
              <h3 className="text-sm font-black text-slate-900">٥. حفظ واعتماد التقرير</h3>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                احفظ واعتمد التقرير أولاً، ثم حمّله PDF من نفس الصفحة. بعد الاعتماد لا يمكن التعديل.
              </p>

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={handleApproveReport}
                  disabled={reportApproved}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reportApproved ? "تم حفظ واعتماد التقرير" : "حفظ واعتماد التقرير"}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={!reportApproved}
                  className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  تحميل التقرير PDF
                </button>
              </div>
            </section>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <ReportPageTabs
          pages={renderedPages}
          activePageId={activePage?.id || ""}
          onSelectPage={(pageId) => {
            setActivePageId(pageId);
            setSelectedBlockId(null);
          }}
          onAddPageAfter={handleAddPageAfter}
          onRemovePage={handleRemovePage}
          onMovePage={handleMovePage}
        />

        {activePage ? (
          <ReportPageCanvas
            page={activePage}
            payload={draft.payload}
            selectedBlockId={selectedBlockId}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlock={handleUpdateBlock}
            onRemoveBlock={handleRemoveBlock}
            onMoveBlock={handleMoveBlock}
            onOpenTableEditor={handleOpenTableEditor}
          />
        ) : (
          <div className="rounded-[2rem] bg-slate-100 p-10 text-center text-sm font-bold text-slate-500">
            لا توجد صفحات في التقرير.
          </div>
        )}
      </section>

      <ReportTableEditorModal
        table={editingTable}
        open={Boolean(editingTable)}
        onClose={() => setEditingTable(null)}
        onSave={handleSaveTable}
      />
    </div>
  );
}