"use client";

import { useMemo, useRef, useState } from "react";
import type { SmartReportField, SmartReportPayload } from "@/lib/report-engine/smart-report-types";
import { ReportOneTemplatePreview } from "./report-one-template-preview";
import { ReportOneControlPanel } from "./report-one-control-panel";
import type {
  ReportOneDocumentDraft,
  ReportOneEditableBlock,
  ReportOneEditableField,
  ReportOneEditorPage,
  ReportOneEvidenceSettings,
  ReportOneTemplateInfo,
} from "./report-one-editor-types";

type ReportOneEditorProps = {
  template: ReportOneTemplateInfo | null;
  payload: SmartReportPayload;
  reportId?: string;
  status?: string;
  initialDraft?: ReportOneDocumentDraft | null;
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeFieldId(field: SmartReportField, index: number) {
  return `${cleanText(field.key) || "field"}-${index}`;
}

function getTemplatePages(template: ReportOneTemplateInfo | null): ReportOneEditorPage[] {
  const templateJson = asRecord(template?.templateJson);
  const smartStudio = asRecord(templateJson.smartStudio);
  const source = Object.keys(smartStudio).length ? smartStudio : templateJson;
  const pages = asArray(source.pages);

  if (!pages.length) {
    return [
      {
        id: "report-one-page-1",
        title: "1. صفحة العنوان والمحتوى",
        kind: "content",
        sourceTemplatePageId: null,
      },
    ];
  }

  return pages.map((page: any, index: number) => {
    const id = cleanText(page.id) || `report-one-template-page-${index + 1}`;

    return {
      id,
      title: cleanText(page.title) || `صفحة ${index + 1}`,
      kind: "admin",
      sourceTemplatePageId: id,
    };
  });
}

function getInitialFields(payload: SmartReportPayload): ReportOneEditableField[] {
  const seen = new Set<string>();

  return [...payload.primaryFields, ...payload.detailFields]
    .filter((field, index) => {
      const signature = [
        cleanText(field.key),
        cleanText(field.label),
        cleanText(field.value),
        index,
      ].join("::");

      if (seen.has(signature)) return false;
      seen.add(signature);

      return cleanText(field.label) && cleanText(field.value);
    })
    .map((field, index) => ({
      ...field,
      id: makeFieldId(field, index),
      visible: true,
    }));
}

function normalizeBlocksPage(
  blocks: ReportOneEditableBlock[],
  fallbackPageId: string,
) {
  return blocks.map((block) => ({
    ...block,
    pageId: block.pageId || fallbackPageId,
  }));
}

function createInitialBlocks(
  payload: SmartReportPayload,
  pageId: string,
): ReportOneEditableBlock[] {
  return [
    {
      id: "narrative",
      pageId,
      type: "PARAGRAPH",
      title: "وصف التنفيذ",
      body:
        payload.narrative?.body ||
        "اكتب وصف التقرير هنا. يمكن تعديله مباشرة من لوحة التحكم.",
    },
    {
      id: "default-table",
      pageId,
      type: "TABLE",
      title: "جدول",
      columns: ["المجال", "الإجراء", "ملاحظات"],
      rows: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      tableSettings: {
        highlightHeader: true,
        highlightFirstColumn: true,
        stripedRows: true,
        rounded: true,
        compact: false,
        repeatHeader: true,
      },
    },
  ];
}


function createDefaultEvidenceSettings(): ReportOneEvidenceSettings {
  return {
    enabled: true,
    perPage: 2,
    showCaptions: false,
    fit: "contain",
    aspectRatio: "SQUARE_1_1",
    sizePreset: "NORMAL_82_82",
    imageWidthMm: 82,
    imageHeightMm: 82,
    gapMm: 4,
  };
}
function createBlock(
  type: ReportOneEditableBlock["type"],
  pageId: string,
): ReportOneEditableBlock {
  if (type === "TABLE") {
    return {
      id: makeId("table"),
      pageId,
      type,
      title: "جدول",
      columns: ["المجال", "الإجراء", "ملاحظات"],
      rows: [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
      ],
      tableSettings: {
        highlightHeader: true,
        highlightFirstColumn: true,
        stripedRows: true,
        rounded: true,
        compact: false,
        repeatHeader: true,
      },
    };
  }

  if (type === "BULLET_LIST") {
    return {
      id: makeId("list"),
      pageId,
      type,
      title: "قائمة نقاط",
      body: "النقطة الأولى\nالنقطة الثانية\nالنقطة الثالثة",
    };
  }

  if (type === "EVIDENCE") {
    return {
      id: makeId("evidence"),
      pageId,
      type,
      title: "الشواهد والمرفقات",
      body: "",
    };
  }

  return {
    id: makeId("paragraph"),
    pageId,
    type,
    title: "فقرة جديدة",
    body: "",
  };
}

export function ReportOneEditor({
  template,
  payload,
  reportId,
  status = "GENERATED",
  initialDraft,
}: ReportOneEditorProps) {
  const templatePages = useMemo(() => getTemplatePages(template), [template]);
  const firstPageId = initialDraft?.pages?.[0]?.id || templatePages[0]?.id || "report-one-page-1";
  const initialFields = useMemo(() => getInitialFields(payload), [payload]);
  const approved = status === "APPROVED";
  const overflowMovedBlockIds = useRef(new Set<string>());

  const [pages, setPages] = useState<ReportOneEditorPage[]>(
    initialDraft?.pages?.length ? initialDraft.pages : templatePages,
  );

  const [activePageId, setActivePageId] = useState(
    initialDraft?.activePageId ||
      initialDraft?.pages?.[0]?.id ||
      templatePages[0]?.id ||
      "report-one-page-1",
  );

  const [title, setTitle] = useState(
    initialDraft?.title ||
      payload.title ||
      payload.caseInfo.title ||
      "تقرير",
  );

  const [fields, setFields] = useState<ReportOneEditableField[]>(
    initialDraft?.fields?.length ? initialDraft.fields : initialFields,
  );

  const [blocks, setBlocks] = useState<ReportOneEditableBlock[]>(
    initialDraft?.blocks?.length
      ? normalizeBlocksPage(initialDraft.blocks, firstPageId)
      : [],
  );

  const [activeBlockId, setActiveBlockId] = useState(
    blocks[0]?.id || "",
  );

  const [evidenceSettings, setEvidenceSettings] =
    useState<ReportOneEvidenceSettings>(
      initialDraft?.evidenceSettings || createDefaultEvidenceSettings(),
    );

  const [currentReportId, setCurrentReportId] = useState(reportId || "");
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState("");

  const visibleFields = fields.filter((field) => field.visible);

  function getWritableActivePageId() {
    const directPage = pages.find((page) => page.id === activePageId);

    if (directPage) {
      return directPage.id;
    }

    const evidenceParentId = activePageId.includes("-report-one-evidence-")
      ? activePageId.split("-report-one-evidence-")[0]
      : "";

    if (evidenceParentId) {
      const parentPage = pages.find(
        (page) =>
          page.id === evidenceParentId ||
          page.sourceTemplatePageId === evidenceParentId,
      );

      if (parentPage) {
        return parentPage.id;
      }
    }

    const firstWritablePage = pages[0];

    return firstWritablePage?.id || firstPageId;
  }
  function buildDraft(): ReportOneDocumentDraft {
    return {
      title,
      template,
      fields,
      blocks,
      pages,
      activePageId,
      evidenceSettings,
      payload,
    };
  }

  function addPageAfter(pageId = activePageId) {
    const newPage: ReportOneEditorPage = {
      id: makeId("report-one-page"),
      title: `صفحة محتوى ${pages.length + 1}`,
      kind: "manual",
      sourceTemplatePageId: null,
    };

    setPages((current) => {
      const index = current.findIndex((page) => page.id === pageId);
      const insertAt = index >= 0 ? index + 1 : current.length;
      const next = [...current];

      next.splice(insertAt, 0, {
        ...newPage,
        title: `صفحة محتوى ${next.length + 1}`,
      });

      return next;
    });

    setActivePageId(newPage.id);
    setMessage("تمت إضافة صفحة جديدة. أضف المحتوى داخلها من لوحة التحكم.");

    return newPage.id;
  }

  function getNextPageId(pageId: string) {
    const index = pages.findIndex((page) => page.id === pageId);
    const nextPage = index >= 0 ? pages[index + 1] : null;

    if (nextPage) {
      return nextPage.id;
    }

    return addPageAfter(pageId);
  }

  function handlePageOverflow(_pageId: string) {
    // مؤقتًا: لا ننقل أي بلوك تلقائيًا.
    // النقل التلقائي يحتاج محرك قياس مستقل حتى لا يفتح صفحات جديدة بالخطأ.
    return;
  }


  function deleteManualPage(pageId: string) {
    if (approved) return;

    const page = pages.find((item) => item.id === pageId);

    if (!page || page.kind === "admin" || page.sourceTemplatePageId) {
      setMessage("لا يمكن حذف صفحة قادمة من قالب الاستديو.");
      return;
    }

    const pageBlocks = blocks.filter((block) => block.pageId === pageId);

    if (pageBlocks.length) {
      const ok = window.confirm(
        "هذه الصفحة تحتوي محتوى أضفته. حذف الصفحة سيحذف محتواها أيضًا. هل تريد المتابعة؟",
      );

      if (!ok) return;
    }

    setPages((current) => {
      const next = current.filter((item) => item.id !== pageId);
      const fallbackPage = next[0];

      if (activePageId === pageId && fallbackPage) {
        setActivePageId(fallbackPage.id);
      }

      return next.length ? next : current;
    });

    setBlocks((current) => current.filter((block) => block.pageId !== pageId));
    setMessage("تم حذف الصفحة المضافة.");
  }
  function updateField(fieldId: string, patch: Partial<ReportOneEditableField>) {
    if (approved) return;

    setFields((current) =>
      current.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              ...patch,
            }
          : field,
      ),
    );
  }

  function toggleField(fieldId: string) {
    if (approved) return;

    setFields((current) =>
      current.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              visible: !field.visible,
            }
          : field,
      ),
    );
  }

  function updateBlock(nextBlock: ReportOneEditableBlock) {
    if (approved) return;

    setBlocks((current) =>
      current.map((block) => (block.id === nextBlock.id ? nextBlock : block)),
    );
  }

  function addBlock(type: ReportOneEditableBlock["type"]) {
    if (approved) return;

    const pageId = getWritableActivePageId();
    const block = createBlock(type, pageId);

    overflowMovedBlockIds.current.delete(block.id);

    setBlocks((current) => [...current, block]);
    setActiveBlockId(block.id);
    setActivePageId(pageId);
    setMessage("تمت إضافة البلوك داخل الصفحة الحالية من قالب الاستديو.");
  }

  function removeBlock(blockId: string) {
    if (approved) return;

    setBlocks((current) => {
      const next = current.filter((block) => block.id !== blockId);

      if (activeBlockId === blockId) {
        setActiveBlockId(next[0]?.id || "");
      }

      return next;
    });
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    if (approved) return;

    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === blockId);

      if (index < 0) return current;

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);

      return next;
    });
  }

  async function saveReport() {
    if (approved) {
      setMessage("تم اعتماد التقرير. لا يمكن التعديل بعد الاعتماد.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const draft = buildDraft();

      const endpoint = currentReportId
        ? `/api/dashboard/report-1/${currentReportId}`
        : `/api/dashboard/report-1/cases/${payload.caseInfo.id}/generate`;

      const response = await fetch(endpoint, {
        method: currentReportId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          templateId: template?.id || "",
          templateName: template?.name || "",
          payload,
          documentDraft: draft,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ التقرير.");
      }

      if (!currentReportId && data.reportId) {
        setCurrentReportId(data.reportId);
        window.history.replaceState(
          null,
          "",
          `/dashboard/report-1/${data.reportId}/studio`,
        );
      }

      setMessage("تم حفظ التقرير بنجاح.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "تعذر حفظ التقرير.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function approveReport() {
    if (!currentReportId) {
      setMessage("احفظ التقرير أولًا قبل الاعتماد.");
      return;
    }

    try {
      setApproving(true);
      setMessage("");

      await saveReport();

      const response = await fetch(
        `/api/dashboard/report-1/${currentReportId}/approve`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر اعتماد التقرير.");
      }

      window.location.href = `/dashboard/report-1/${currentReportId}/preview`;
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "تعذر اعتماد التقرير.",
      );
    } finally {
      setApproving(false);
    }
  }

  function openPreview() {
    if (!currentReportId) {
      setMessage("احفظ التقرير أولًا قبل المعاينة.");
      return;
    }

    window.open(`/dashboard/report-1/${currentReportId}/preview`, "_blank");
  }

  function downloadPdf() {
    if (!currentReportId) {
      setMessage("احفظ التقرير أولًا قبل تحميل PDF.");
      return;
    }

    window.location.href = `/api/dashboard/report-1/${currentReportId}/export/pdf`;
  }

  return (
    <main className="min-h-screen bg-[#eef3ef] px-6 py-6" dir="rtl">
      <div className="mx-auto grid max-w-[1600px] gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-4">
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm print:hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-700">
                  محرر report-1
                </p>

                <h1 className="mt-2 text-2xl font-black text-slate-950">
                  {title}
                </h1>

                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  أضف الصفحات من أعلى المعاينة. إذا لمس البلوك حد الصفحة ينتقل للصفحة التالية تلقائيًا.
                </p>

                {message ? (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
                    {message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={saveReport}
                  disabled={saving || approved}
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "جار الحفظ..." : "حفظ التقرير"}
                </button>

                <button
                  type="button"
                  onClick={approveReport}
                  disabled={approving || approved}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {approving ? "جار الاعتماد..." : "حفظ واعتماد"}
                </button>

                <button
                  type="button"
                  onClick={openPreview}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  معاينة
                </button>

                <button
                  type="button"
                  onClick={downloadPdf}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
                >
                  تحميل PDF
                </button>
              </div>
            </div>
          </section>

          <ReportOneTemplatePreview
            title={title}
            template={template}
            payload={payload}
            fields={visibleFields}
            blocks={blocks}
            pages={pages}
            evidenceSettings={evidenceSettings}
            activePageId={activePageId}
            activeBlockId={activeBlockId}
            onActivePageChange={setActivePageId}
            onAddPage={() => addPageAfter(activePageId)}
            onDeletePage={deleteManualPage}
            onPageOverflow={handlePageOverflow}
            onActiveBlockChange={setActiveBlockId}
          />
        </section>

        <ReportOneControlPanel
          disabled={approved}
          title={title}
          onTitleChange={setTitle}
          template={template}
          fields={fields}
          blocks={blocks}
          activeBlockId={activeBlockId}
          onFieldChange={updateField}
          onToggleField={toggleField}
          onActiveBlockChange={setActiveBlockId}
          onBlockChange={updateBlock}
          onAddBlock={addBlock}
          onRemoveBlock={removeBlock}
          onMoveBlock={moveBlock}
          evidenceSettings={evidenceSettings}
          onEvidenceSettingsChange={setEvidenceSettings}
        />
      </div>
    </main>
  );
}