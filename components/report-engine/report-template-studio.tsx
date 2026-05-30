"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_REPORT_IDENTITY_SETTINGS,
  REPORT_BLOCK_LIBRARY,
  REPORT_SERVICE_OPTIONS,
  REPORT_WORKFLOW_FIELD_OPTIONS,
  type GeneratedReportSnapshot,
  type ReportBlockKind,
  type ReportIdentitySettings,
  type ReportPageKind,
  type ReportTemplateBlock,
  type ReportTemplateBuilderModel,
  type ReportTemplatePage,
  type ReportTemplateStatus,
  type ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";
import type {
  RuntimePreviewCaseData,
  RuntimeWorkflowFieldOption,
} from "@/lib/report-engine/report-template-runtime-types";
import {
  initialReportTemplateBuilderPresets,
  initialReportTextSnippets,
} from "@/lib/report-engine/report-template-builder-presets";
import { ReportTemplateAdminTools } from "@/components/report-engine/report-template-admin-tools";
import { ReportTemplatePublishTools } from "@/components/report-engine/report-template-publish-tools";
import { ReportTemplateLivePreview } from "@/components/report-engine/report-template-live-preview";

const statusLabels: Record<ReportTemplateStatus, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

const pageKindLabels: Record<ReportPageKind, string> = {
  cover: "غلاف",
  summary: "ملخص",
  narrative: "محتوى",
  results: "نتائج",
  evidence: "شواهد",
  approval: "اعتماد",
};

const blockKindLabels: Record<ReportBlockKind, string> = {
  "identity-header": "هوية",
  "cover-title": "عنوان",
  "case-meta": "بيانات",
  "student-summary": "طالب",
  "service-summary": "خدمة",
  paragraph: "نص",
  "field-list": "حقول",
  "text-library": "مكتبة نصوص",
  "custom-paragraph": "فقرة مخصصة",
  "evidence-gallery": "شواهد",
  "approval-signature": "اعتماد",
};

const pagePresets: {
  kind: ReportPageKind;
  title: string;
  description: string;
  defaultBlockKinds: ReportBlockKind[];
}[] = [
  {
    kind: "cover",
    title: "صفحة الغلاف",
    description: "غلاف رسمي يعرض هوية المدرسة وعنوان التقرير دون تفاصيل كثيرة.",
    defaultBlockKinds: ["identity-header", "cover-title"],
  },
  {
    kind: "summary",
    title: "ملخص التقرير",
    description: "صفحة مختصرة تعرض أهم بيانات التقرير والحالة.",
    defaultBlockKinds: ["case-meta"],
  },
  {
    kind: "narrative",
    title: "تفاصيل التنفيذ",
    description: "صفحة محتوى تعرض المقدمة أو الإجراءات أو النصوص الأساسية.",
    defaultBlockKinds: ["paragraph"],
  },
  {
    kind: "results",
    title: "النتائج والتوصيات",
    description: "صفحة مخصصة للنتائج والتوصيات أو الحقول المختصرة.",
    defaultBlockKinds: ["field-list", "text-library"],
  },
  {
    kind: "evidence",
    title: "الشواهد والمرفقات",
    description: "صفحة مستقلة لعرض الشواهد حتى تبقى حدود A4 واضحة.",
    defaultBlockKinds: ["evidence-gallery"],
  },
  {
    kind: "approval",
    title: "الاعتماد والتوقيع",
    description: "صفحة ختامية للتوقيع والختم واعتماد التقرير.",
    defaultBlockKinds: ["approval-signature"],
  },
];

export function ReportTemplateStudio() {
  const [templates, setTemplates] = useState<ReportTemplateBuilderModel[]>(
    initialReportTemplateBuilderPresets
  );

  const [activeTemplateId, setActiveTemplateId] = useState(
    initialReportTemplateBuilderPresets[0]?.id || ""
  );

  const [templatePendingDelete, setTemplatePendingDelete] =
    useState<ReportTemplateBuilderModel | null>(null);

  const [pagePendingDelete, setPagePendingDelete] =
    useState<ReportTemplatePage | null>(null);

  const [reportIdentity, setReportIdentity] =
    useState<ReportIdentitySettings>(DEFAULT_REPORT_IDENTITY_SETTINGS);

  const [reportTextSnippets, setReportTextSnippets] =
    useState<ReportTextSnippet[]>(initialReportTextSnippets);

  const [generatedSnapshots, setGeneratedSnapshots] = useState<
    GeneratedReportSnapshot[]
  >([]);

  const [runtimeWorkflowFields, setRuntimeWorkflowFields] = useState<
    RuntimeWorkflowFieldOption[]
  >([]);

  const [runtimeWorkflowMessage, setRuntimeWorkflowMessage] = useState("");

  const [runtimePreviewCase, setRuntimePreviewCase] =
    useState<RuntimePreviewCaseData | null>(null);

  const [runtimePreviewMessage, setRuntimePreviewMessage] = useState("");

  const activeTemplate = useMemo(() => {
    return templates.find((template) => template.id === activeTemplateId);
  }, [templates, activeTemplateId]);

  useEffect(() => {
    if (!activeTemplate) {
      return;
    }

    const serviceSlug =
      activeTemplate.scope === "SERVICE" ? activeTemplate.serviceSlug : "";

    async function loadWorkflowFields() {
      try {
        const response = await fetch(
          `/api/admin/report-templates/workflow-fields?serviceSlug=${encodeURIComponent(
            serviceSlug || ""
          )}`
        );

        const result = await response.json();

        setRuntimeWorkflowFields(result.fields || []);
        setRuntimeWorkflowMessage(result.message || "");
      } catch {
        setRuntimeWorkflowFields([]);
        setRuntimeWorkflowMessage(
          "تعذر جلب حقول الـ Workflow، سيتم استخدام الحقول الافتراضية."
        );
      }
    }

    loadWorkflowFields();
  }, [activeTemplate?.scope, activeTemplate?.serviceSlug, activeTemplate?.id]);

  useEffect(() => {
    if (!activeTemplate) {
      return;
    }

    async function loadPreviewCase() {
      const caseId = activeTemplate?.previewCaseId?.trim();

      if (!caseId) {
        setRuntimePreviewCase(null);
        setRuntimePreviewMessage(
          "لم يتم إدخال Case ID، سيتم استخدام بيانات تجريبية."
        );
        return;
      }

      try {
        const response = await fetch(
          `/api/admin/report-templates/preview-case?caseId=${encodeURIComponent(
            caseId
          )}`
        );

        const result = await response.json();

        setRuntimePreviewCase(result.data || null);
        setRuntimePreviewMessage(result.message || "");
      } catch {
        setRuntimePreviewCase(null);
        setRuntimePreviewMessage(
          "تعذر جلب بيانات الحالة، سيتم استخدام بيانات تجريبية."
        );
      }
    }

    loadPreviewCase();
  }, [activeTemplate?.previewCaseId, activeTemplate?.id]);

  function updateActiveTemplate(
    updater: (
      template: ReportTemplateBuilderModel
    ) => ReportTemplateBuilderModel
  ) {
    setTemplates((currentTemplates) =>
      currentTemplates.map((template) =>
        template.id === activeTemplateId ? updater(template) : template
      )
    );
  }

  function requestDeleteTemplate(template: ReportTemplateBuilderModel) {
    if (templates.length <= 1) {
      return;
    }

    setTemplatePendingDelete(template);
  }

  function confirmDeleteTemplate() {
    if (!templatePendingDelete) {
      return;
    }

    const remainingTemplates = templates.filter(
      (template) => template.id !== templatePendingDelete.id
    );

    setTemplates(remainingTemplates);

    if (activeTemplateId === templatePendingDelete.id) {
      setActiveTemplateId(remainingTemplates[0]?.id || "");
    }

    setTemplatePendingDelete(null);
  }

  function requestDeletePage(page: ReportTemplatePage) {
    if (!activeTemplate || activeTemplate.pages.length <= 1) {
      return;
    }

    setPagePendingDelete(page);
  }

  function confirmDeletePage() {
    if (!pagePendingDelete) {
      return;
    }

    updateActiveTemplate((template) => ({
      ...template,
      pages: template.pages.filter((page) => page.id !== pagePendingDelete.id),
      updatedAt: new Date().toISOString().slice(0, 10),
    }));

    setPagePendingDelete(null);
  }

  function createNewTemplate() {
    const newTemplate: ReportTemplateBuilderModel = {
      id: `custom-template-${Date.now()}`,
      name: "قالب جديد",
      description: "قالب مخصص يتم بناؤه من Case ID وبيانات الحالة.",
      scope: "GLOBAL",
      status: "DRAFT",
      updatedAt: new Date().toISOString().slice(0, 10),
      previewCaseId: "",
      pages: [
        createPageFromPreset("cover"),
        createPageFromPreset("summary"),
        createPageFromPreset("evidence"),
        createPageFromPreset("approval"),
      ],
    };

    setTemplates((currentTemplates) => [newTemplate, ...currentTemplates]);
    setActiveTemplateId(newTemplate.id);
  }

  function duplicateTemplate(template: ReportTemplateBuilderModel) {
    const copiedTemplate: ReportTemplateBuilderModel = {
      ...template,
      id: `copy-${template.id}-${Date.now()}`,
      name: `${template.name} - نسخة`,
      status: "DRAFT",
      updatedAt: new Date().toISOString().slice(0, 10),
      pages: template.pages.map((page) => ({
        ...page,
        id: `${page.id}-copy-${Date.now()}`,
        blocks: page.blocks.map((block) => ({
          ...block,
          id: `${block.id}-copy-${Date.now()}`,
        })),
      })),
    };

    setTemplates((currentTemplates) => [copiedTemplate, ...currentTemplates]);
    setActiveTemplateId(copiedTemplate.id);
  }

  function movePage(pageId: string, direction: "up" | "down") {
    updateActiveTemplate((template) => {
      const index = template.pages.findIndex((page) => page.id === pageId);

      if (index === -1) {
        return template;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= template.pages.length) {
        return template;
      }

      const pages = [...template.pages];
      const [page] = pages.splice(index, 1);
      pages.splice(targetIndex, 0, page);

      return {
        ...template,
        pages,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
    });
  }

  function addPage(kind: ReportPageKind) {
    updateActiveTemplate((template) => ({
      ...template,
      pages: [...template.pages, createPageFromPreset(kind)],
      updatedAt: new Date().toISOString().slice(0, 10),
    }));
  }

  function updatePage(
    pageId: string,
    updater: (page: ReportTemplatePage) => ReportTemplatePage
  ) {
    updateActiveTemplate((template) => ({
      ...template,
      pages: template.pages.map((page) =>
        page.id === pageId ? updater(page) : page
      ),
      updatedAt: new Date().toISOString().slice(0, 10),
    }));
  }

  function addBlockToPage(pageId: string, block: ReportTemplateBlock) {
    updatePage(pageId, (page) => ({
      ...page,
      blocks: [
        ...page.blocks,
        {
          ...block,
          id: `${block.kind}-${Date.now()}`,
        },
      ],
    }));
  }

  function removeBlock(pageId: string, blockId: string) {
    updatePage(pageId, (page) => ({
      ...page,
      blocks: page.blocks.filter((block) => block.id !== blockId),
    }));
  }

  function moveBlock(pageId: string, blockId: string, direction: "up" | "down") {
    updatePage(pageId, (page) => {
      const index = page.blocks.findIndex((block) => block.id === blockId);

      if (index === -1) {
        return page;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= page.blocks.length) {
        return page;
      }

      const blocks = [...page.blocks];
      const [block] = blocks.splice(index, 1);
      blocks.splice(targetIndex, 0, block);

      return {
        ...page,
        blocks,
      };
    });
  }

  function moveBlockToPage(
    blockId: string,
    fromPageId: string,
    toPageId: string
  ) {
    if (fromPageId === toPageId) {
      return;
    }

    updateActiveTemplate((template) => {
      const fromPage = template.pages.find((page) => page.id === fromPageId);
      const block = fromPage?.blocks.find((item) => item.id === blockId);

      if (!fromPage || !block) {
        return template;
      }

      return {
        ...template,
        pages: template.pages.map((page) => {
          if (page.id === fromPageId) {
            return {
              ...page,
              blocks: page.blocks.filter((item) => item.id !== blockId),
            };
          }

          if (page.id === toPageId) {
            return {
              ...page,
              blocks: [...page.blocks, block],
            };
          }

          return page;
        }),
        updatedAt: new Date().toISOString().slice(0, 10),
      };
    });
  }

  function changeActiveTemplateStatus(status: ReportTemplateStatus) {
    updateActiveTemplate((template) => ({
      ...template,
      status,
      updatedAt: new Date().toISOString().slice(0, 10),
    }));
  }

  function addGeneratedSnapshot(snapshot: GeneratedReportSnapshot) {
    setGeneratedSnapshots((currentSnapshots) => [
      snapshot,
      ...currentSnapshots,
    ]);
  }

  if (!activeTemplate) {
    return (
      <div className="min-h-screen bg-slate-50 p-10" dir="rtl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">
            لا توجد قوالب متاحة
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            أنشئ قالبًا جديدًا للبدء.
          </p>

          <button
            type="button"
            onClick={createNewTemplate}
            className="mt-6 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-900"
          >
            إنشاء قالب جديد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-bold text-emerald-700">
              محرك التقارير
            </p>

            <h1 className="mt-1 text-2xl font-black text-slate-900">
              صانع قوالب التقارير
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
              ابنِ قالب التقرير مرة واحدة، واجعله يسحب بياناته تلقائيًا من
              Case ID بدون أن يعيد الموجه تعبئة التقرير من الصفر.
            </p>
          </div>

          <button
            type="button"
            onClick={createNewTemplate}
            className="rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-900"
          >
            إنشاء قالب جديد
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-[320px_1fr] gap-6 px-6 py-6">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-slate-900">
              القوالب المتاحة
            </h2>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              اختر قالبًا لتعديل صفحاته وبلوكاته.
            </p>

            <div className="mt-4 space-y-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setActiveTemplateId(template.id)}
                  className={[
                    "w-full rounded-2xl border p-4 text-right transition",
                    template.id === activeTemplateId
                      ? "border-emerald-700 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">
                      {template.name}
                    </strong>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      {statusLabels[template.status]}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">
                    {template.description}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>
                      {template.scope === "GLOBAL" ? "عام" : "خاص بخدمة"}
                    </span>
                    <span>•</span>
                    <span>{template.pages.length} صفحات</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-black text-amber-900">
              قاعدة مهمة
            </h3>

            <p className="mt-2 text-xs leading-7 text-amber-800">
              القالب لا ينشئ بيانات جديدة. القالب فقط يرتب صفحات التقرير، أما
              البيانات فتأتي من CaseEntry وCaseValue والطالب والشواهد والهوية.
            </p>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
              <div>
                <label className="text-xs font-black text-slate-500">
                  اسم القالب
                </label>

                <input
                  value={activeTemplate.name}
                  onChange={(event) =>
                    updateActiveTemplate((template) => ({
                      ...template,
                      name: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-lg font-black text-slate-900 outline-none focus:border-emerald-700"
                />

                <label className="mt-5 block text-xs font-black text-slate-500">
                  وصف القالب
                </label>

                <textarea
                  value={activeTemplate.description}
                  onChange={(event) =>
                    updateActiveTemplate((template) => ({
                      ...template,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-700"
                />
              </div>

              <div className="rounded-3xl bg-slate-50 p-4">
                <div className="text-xs font-black text-slate-500">
                  حالة القالب
                </div>

                <select
                  value={activeTemplate.status}
                  onChange={(event) =>
                    updateActiveTemplate((template) => ({
                      ...template,
                      status: event.target.value as ReportTemplateStatus,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none"
                >
                  <option value="DRAFT">مسودة</option>
                  <option value="PUBLISHED">منشور</option>
                  <option value="ARCHIVED">مؤرشف</option>
                </select>

                <div className="mt-4 text-xs font-black text-slate-500">
                  نطاق القالب
                </div>

                <select
                  value={activeTemplate.scope}
                  onChange={(event) =>
                    updateActiveTemplate((template) => ({
                      ...template,
                      scope: event.target.value as "GLOBAL" | "SERVICE",
                      serviceSlug:
                        event.target.value === "GLOBAL"
                          ? undefined
                          : template.serviceSlug,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none"
                >
                  <option value="GLOBAL">عام لكل الخدمات</option>
                  <option value="SERVICE">خاص بخدمة</option>
                </select>

                {activeTemplate.scope === "SERVICE" ? (
                  <>
                    <div className="mt-4 text-xs font-black text-slate-500">
                      الخدمة
                    </div>

                    <select
                      value={activeTemplate.serviceSlug || ""}
                      onChange={(event) =>
                        updateActiveTemplate((template) => ({
                          ...template,
                          serviceSlug: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none"
                    >
                      <option value="">اختر الخدمة</option>
                      {REPORT_SERVICE_OPTIONS.map((service) => (
                        <option key={service.slug} value={service.slug}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                <div className="mt-4 text-xs font-black text-slate-500">
                  حالة تجريبية للمعاينة
                </div>

                <input
                  value={activeTemplate.previewCaseId || ""}
                  onChange={(event) =>
                    updateActiveTemplate((template) => ({
                      ...template,
                      previewCaseId: event.target.value,
                    }))
                  }
                  placeholder="Case ID اختياري"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none"
                />

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => duplicateTemplate(activeTemplate)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                  >
                    نسخ القالب
                  </button>

                  <button
                    type="button"
                    onClick={() => requestDeleteTemplate(activeTemplate)}
                    disabled={templates.length <= 1}
                    className="w-full rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    حذف القالب
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ReportTemplateAdminTools
            template={activeTemplate}
            identity={reportIdentity}
            snippets={reportTextSnippets}
            onIdentityChange={setReportIdentity}
            onSnippetsChange={setReportTextSnippets}
          />

          <ReportTemplatePublishTools
            template={activeTemplate}
            identity={reportIdentity}
            snippets={reportTextSnippets}
            snapshots={generatedSnapshots}
            onTemplateStatusChange={changeActiveTemplateStatus}
            onSnapshotCreate={addGeneratedSnapshot}
          />

          <RuntimeConnectionStatus
            workflowFieldsCount={runtimeWorkflowFields.length}
            workflowMessage={runtimeWorkflowMessage}
            previewCase={runtimePreviewCase}
            previewMessage={runtimePreviewMessage}
          />

          <ReportTemplateLivePreview
            template={activeTemplate}
            previewCaseData={runtimePreviewCase}
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">
              إضافة صفحة إلى القالب
            </h2>

            <p className="mt-1 text-sm leading-7 text-slate-500">
              اختر نوع الصفحة. كل صفحة تمثل صفحة A4 مستقلة داخل التقرير.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {pagePresets.map((preset) => (
                <button
                  key={preset.kind}
                  type="button"
                  onClick={() => addPage(preset.kind)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right transition hover:border-emerald-600 hover:bg-emerald-50"
                >
                  <strong className="text-sm font-black text-slate-900">
                    إضافة {pageKindLabels[preset.kind]}
                  </strong>

                  <p className="mt-2 line-clamp-2 text-xs leading-6 text-slate-500">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                صفحات القالب
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                عدّل صفحات القالب، أضف بلوكات، أو احذف الصفحات غير المطلوبة.
              </p>
            </div>

            {activeTemplate.pages.map((page, pageIndex) => (
              <TemplatePageCard
                key={page.id}
                page={page}
                pageIndex={pageIndex}
                pages={activeTemplate.pages}
                workflowFields={runtimeWorkflowFields}
                canMoveUp={pageIndex > 0}
                canMoveDown={pageIndex < activeTemplate.pages.length - 1}
                canDeletePage={activeTemplate.pages.length > 1}
                onMovePage={movePage}
                onRequestDeletePage={requestDeletePage}
                onAddBlock={addBlockToPage}
                onRemoveBlock={removeBlock}
                onMoveBlock={moveBlock}
                onMoveBlockToPage={moveBlockToPage}
                onUpdatePage={updatePage}
              />
            ))}
          </div>
        </section>
      </main>

      {templatePendingDelete ? (
        <ConfirmModal
          title="حذف قالب التقرير؟"
          description={
            <>
              سيتم حذف قالب{" "}
              <span className="font-black text-slate-900">
                {templatePendingDelete.name}
              </span>{" "}
              من قائمة القوالب الحالية. هذا الإجراء لا يحذف أي تقارير أو حالات
              محفوظة.
            </>
          }
          confirmLabel="نعم، احذف القالب"
          onCancel={() => setTemplatePendingDelete(null)}
          onConfirm={confirmDeleteTemplate}
        />
      ) : null}

      {pagePendingDelete ? (
        <ConfirmModal
          title="حذف صفحة من القالب؟"
          description={
            <>
              سيتم حذف صفحة{" "}
              <span className="font-black text-slate-900">
                {pagePendingDelete.title}
              </span>{" "}
              من القالب الحالي. هذا لا يحذف بيانات الحالة ولا التقارير السابقة،
              بل يغيّر ترتيب القالب فقط.
            </>
          }
          confirmLabel="نعم، احذف الصفحة"
          onCancel={() => setPagePendingDelete(null)}
          onConfirm={confirmDeletePage}
        />
      ) : null}
    </div>
  );
}

function RuntimeConnectionStatus({
  workflowFieldsCount,
  workflowMessage,
  previewCase,
  previewMessage,
}: {
  workflowFieldsCount: number;
  workflowMessage: string;
  previewCase: RuntimePreviewCaseData | null;
  previewMessage: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            الربط الحقيقي للمعاينة
          </h2>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            هنا نقرأ حقول الـ Workflow الحقيقي وبيانات Case ID إن وجدت.
          </p>
        </div>

        <span className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
          {previewCase ? "Case حقيقي" : "Sample/Fallback"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-900">
            حقول الـ Workflow
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            {workflowMessage || "لم يتم الجلب بعد."}
          </p>

          <p className="mt-3 text-xs font-black text-emerald-700">
            عدد الحقول: {workflowFieldsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black text-slate-900">
            بيانات Case ID
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            {previewMessage || "لم يتم الجلب بعد."}
          </p>

          {previewCase ? (
            <div className="mt-3 grid gap-1 text-xs text-slate-600">
              <div>
                <span className="font-black text-slate-900">الخدمة: </span>
                {previewCase.serviceName || "غير محدد"}
              </div>

              <div>
                <span className="font-black text-slate-900">العنوان: </span>
                {previewCase.title || "غير محدد"}
              </div>

              <div>
                <span className="font-black text-slate-900">عدد القيم: </span>
                {previewCase.values.length}
              </div>

              <div>
                <span className="font-black text-slate-900">عدد الشواهد: </span>
                {previewCase.evidences.length}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function createPageFromPreset(kind: ReportPageKind): ReportTemplatePage {
  const preset =
    pagePresets.find((currentPreset) => currentPreset.kind === kind) ||
    pagePresets[2];

  return {
    id: `page-${kind}-${Date.now()}`,
    kind: preset.kind,
    title: preset.title,
    description: preset.description,
    coverSettings:
      kind === "cover"
        ? {
            showHeader: true,
            showFooter: true,
            titlePosition: "center",
            showDescription: true,
            showMetaChips: true,
            visualStyle: "official",
          }
        : undefined,
    blocks: preset.defaultBlockKinds
      .map((blockKind) => {
        const block = REPORT_BLOCK_LIBRARY.find(
          (libraryBlock) => libraryBlock.kind === blockKind
        );

        if (!block) {
          return null;
        }

        return {
          ...block,
          id: `${block.kind}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
        };
      })
      .filter((block): block is ReportTemplateBlock => Boolean(block)),
  };
}

function TemplatePageCard({
  page,
  pageIndex,
  pages,
  workflowFields,
  canMoveUp,
  canMoveDown,
  canDeletePage,
  onMovePage,
  onRequestDeletePage,
  onAddBlock,
  onRemoveBlock,
  onMoveBlock,
  onMoveBlockToPage,
  onUpdatePage,
}: {
  page: ReportTemplatePage;
  pageIndex: number;
  pages: ReportTemplatePage[];
  workflowFields: RuntimeWorkflowFieldOption[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDeletePage: boolean;
  onMovePage: (pageId: string, direction: "up" | "down") => void;
  onRequestDeletePage: (page: ReportTemplatePage) => void;
  onAddBlock: (pageId: string, block: ReportTemplateBlock) => void;
  onRemoveBlock: (pageId: string, blockId: string) => void;
  onMoveBlock: (
    pageId: string,
    blockId: string,
    direction: "up" | "down"
  ) => void;
  onMoveBlockToPage: (
    blockId: string,
    fromPageId: string,
    toPageId: string
  ) => void;
  onUpdatePage: (
    pageId: string,
    updater: (page: ReportTemplatePage) => ReportTemplatePage
  ) => void;
}) {
  const [selectedBlockId, setSelectedBlockId] = useState(
    REPORT_BLOCK_LIBRARY[0]?.id || ""
  );

  const selectedBlock = REPORT_BLOCK_LIBRARY.find(
    (block) => block.id === selectedBlockId
  );

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-1 items-start gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-800">
            {pageIndex + 1}
          </span>

          <div className="flex-1">
            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                value={page.title}
                onChange={(event) =>
                  onUpdatePage(page.id, (currentPage) => ({
                    ...currentPage,
                    title: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-3 text-lg font-black text-slate-900 outline-none focus:border-emerald-700"
              />

              <select
                value={page.kind}
                onChange={(event) =>
                  onUpdatePage(page.id, (currentPage) => ({
                    ...currentPage,
                    kind: event.target.value as ReportPageKind,
                    coverSettings:
                      event.target.value === "cover"
                        ? currentPage.coverSettings || {
                            showHeader: true,
                            showFooter: true,
                            titlePosition: "center",
                            showDescription: true,
                            showMetaChips: true,
                            visualStyle: "official",
                          }
                        : undefined,
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold outline-none focus:border-emerald-700"
              >
                {Object.entries(pageKindLabels).map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={page.description}
              onChange={(event) =>
                onUpdatePage(page.id, (currentPage) => ({
                  ...currentPage,
                  description: event.target.value,
                }))
              }
              rows={2}
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-7 text-slate-600 outline-none focus:border-emerald-700"
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => onMovePage(page.id, "up")}
            disabled={!canMoveUp}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 disabled:opacity-40"
          >
            أعلى
          </button>

          <button
            type="button"
            onClick={() => onMovePage(page.id, "down")}
            disabled={!canMoveDown}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 disabled:opacity-40"
          >
            أسفل
          </button>

          <button
            type="button"
            onClick={() => onRequestDeletePage(page)}
            disabled={!canDeletePage}
            className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            حذف الصفحة
          </button>
        </div>
      </div>

      {page.kind === "cover" ? (
        <CoverSettingsEditor page={page} onUpdatePage={onUpdatePage} />
      ) : null}

      <div className="mt-5 grid gap-3">
        {page.blocks.length ? (
          page.blocks.map((block, blockIndex) => (
            <BlockEditor
              key={block.id}
              page={page}
              pages={pages}
              workflowFields={workflowFields}
              block={block}
              blockIndex={blockIndex}
              canMoveUp={blockIndex > 0}
              canMoveDown={blockIndex < page.blocks.length - 1}
              onUpdatePage={onUpdatePage}
              onRemoveBlock={onRemoveBlock}
              onMoveBlock={onMoveBlock}
              onMoveBlockToPage={onMoveBlockToPage}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            لا توجد بلوكات في هذه الصفحة بعد.
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-black text-slate-500">
          إضافة بلوك لهذه الصفحة
        </label>

        <div className="mt-2 grid grid-cols-[1fr_auto] gap-3">
          <select
            value={selectedBlockId}
            onChange={(event) => setSelectedBlockId(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
          >
            {REPORT_BLOCK_LIBRARY.map((block) => (
              <option key={block.id} value={block.id}>
                {block.title} - {block.source.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => selectedBlock && onAddBlock(page.id, selectedBlock)}
            className="rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
          >
            إضافة
          </button>
        </div>
      </div>
    </article>
  );
}

function CoverSettingsEditor({
  page,
  onUpdatePage,
}: {
  page: ReportTemplatePage;
  onUpdatePage: (
    pageId: string,
    updater: (page: ReportTemplatePage) => ReportTemplatePage
  ) => void;
}) {
  const settings = page.coverSettings || {};

  return (
    <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
      <h4 className="text-sm font-black text-emerald-900">إعدادات الغلاف</h4>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={settings.showHeader !== false}
            onChange={(event) =>
              onUpdatePage(page.id, (currentPage) => ({
                ...currentPage,
                coverSettings: {
                  ...currentPage.coverSettings,
                  showHeader: event.target.checked,
                },
              }))
            }
          />
          إظهار الهيدر
        </label>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={settings.showFooter !== false}
            onChange={(event) =>
              onUpdatePage(page.id, (currentPage) => ({
                ...currentPage,
                coverSettings: {
                  ...currentPage.coverSettings,
                  showFooter: event.target.checked,
                },
              }))
            }
          />
          إظهار الفوتر
        </label>

        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={settings.showDescription !== false}
            onChange={(event) =>
              onUpdatePage(page.id, (currentPage) => ({
                ...currentPage,
                coverSettings: {
                  ...currentPage.coverSettings,
                  showDescription: event.target.checked,
                },
              }))
            }
          />
          إظهار الوصف
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <select
          value={settings.titlePosition || "center"}
          onChange={(event) =>
            onUpdatePage(page.id, (currentPage) => ({
              ...currentPage,
              coverSettings: {
                ...currentPage.coverSettings,
                titlePosition: event.target.value as "center" | "top",
              },
            }))
          }
          className="rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold outline-none"
        >
          <option value="center">العنوان في المنتصف</option>
          <option value="top">العنوان أعلى الصفحة</option>
        </select>

        <select
          value={settings.visualStyle || "official"}
          onChange={(event) =>
            onUpdatePage(page.id, (currentPage) => ({
              ...currentPage,
              coverSettings: {
                ...currentPage.coverSettings,
                visualStyle: event.target.value as
                  | "official"
                  | "minimal"
                  | "hero",
              },
            }))
          }
          className="rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold outline-none"
        >
          <option value="official">رسمي</option>
          <option value="minimal">بسيط</option>
          <option value="hero">بصري</option>
        </select>
      </div>
    </div>
  );
}

function BlockEditor({
  page,
  pages,
  workflowFields,
  block,
  blockIndex,
  canMoveUp,
  canMoveDown,
  onUpdatePage,
  onRemoveBlock,
  onMoveBlock,
  onMoveBlockToPage,
}: {
  page: ReportTemplatePage;
  pages: ReportTemplatePage[];
  workflowFields: RuntimeWorkflowFieldOption[];
  block: ReportTemplateBlock;
  blockIndex: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdatePage: (
    pageId: string,
    updater: (page: ReportTemplatePage) => ReportTemplatePage
  ) => void;
  onRemoveBlock: (pageId: string, blockId: string) => void;
  onMoveBlock: (
    pageId: string,
    blockId: string,
    direction: "up" | "down"
  ) => void;
  onMoveBlockToPage: (
    blockId: string,
    fromPageId: string,
    toPageId: string
  ) => void;
}) {
  function updateBlock(
    updater: (block: ReportTemplateBlock) => ReportTemplateBlock
  ) {
    onUpdatePage(page.id, (currentPage) => ({
      ...currentPage,
      blocks: currentPage.blocks.map((currentBlock) =>
        currentBlock.id === block.id ? updater(currentBlock) : currentBlock
      ),
    }));
  }

  const selectableWorkflowFields = workflowFields.length
    ? workflowFields
    : REPORT_WORKFLOW_FIELD_OPTIONS;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-slate-500">
              {blockIndex + 1}
            </span>

            <input
              value={block.title}
              onChange={(event) =>
                updateBlock((currentBlock) => ({
                  ...currentBlock,
                  title: event.target.value,
                }))
              }
              className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-900 outline-none focus:border-emerald-700"
            />

            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
              {blockKindLabels[block.kind]}
            </span>

            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              {block.source.label}
            </span>
          </div>

          <p className="mt-2 text-xs leading-6 text-slate-500">
            مصدر البيانات: {block.source.description}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onMoveBlock(page.id, block.id, "up")}
            disabled={!canMoveUp}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40"
          >
            أعلى
          </button>

          <button
            type="button"
            onClick={() => onMoveBlock(page.id, block.id, "down")}
            disabled={!canMoveDown}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40"
          >
            أسفل
          </button>

          <button
            type="button"
            onClick={() => onRemoveBlock(page.id, block.id)}
            className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
          >
            حذف
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <select
          value={block.source.fieldKey || ""}
          onChange={(event) =>
            updateBlock((currentBlock) => ({
              ...currentBlock,
              source: {
                ...currentBlock.source,
                fieldKey: event.target.value || undefined,
              },
            }))
          }
          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
        >
          <option value="">مصدر عام/غير محدد</option>

          {selectableWorkflowFields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
              {"stepTitle" in field && field.stepTitle
                ? ` — ${field.stepTitle}`
                : ""}
            </option>
          ))}
        </select>

        <select
          value={page.id}
          onChange={(event) =>
            onMoveBlockToPage(block.id, page.id, event.target.value)
          }
          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
        >
          {pages.map((currentPage) => (
            <option key={currentPage.id} value={currentPage.id}>
              نقل إلى: {currentPage.title}
            </option>
          ))}
        </select>
      </div>

      <BlockSettingsEditor block={block} onUpdateBlock={updateBlock} />

      {block.kind === "custom-paragraph" ? (
        <div className="mt-4 grid gap-3">
          <input
            value={block.customTitle || ""}
            onChange={(event) =>
              updateBlock((currentBlock) => ({
                ...currentBlock,
                customTitle: event.target.value,
              }))
            }
            placeholder="عنوان الفقرة"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-700"
          />

          <textarea
            value={block.customContent || ""}
            onChange={(event) =>
              updateBlock((currentBlock) => ({
                ...currentBlock,
                customContent: event.target.value,
              }))
            }
            placeholder="محتوى الفقرة"
            rows={3}
            className="resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-700"
          />
        </div>
      ) : null}
    </div>
  );
}

function BlockSettingsEditor({
  block,
  onUpdateBlock,
}: {
  block: ReportTemplateBlock;
  onUpdateBlock: (
    updater: (block: ReportTemplateBlock) => ReportTemplateBlock
  ) => void;
}) {
  const settings = block.settings || {};

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h5 className="text-xs font-black text-slate-500">إعدادات البلوك</h5>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={settings.showTitle !== false}
            onChange={(event) =>
              onUpdateBlock((currentBlock) => ({
                ...currentBlock,
                settings: {
                  ...currentBlock.settings,
                  showTitle: event.target.checked,
                },
              }))
            }
          />
          إظهار العنوان
        </label>

        <select
          value={settings.style || "card"}
          onChange={(event) =>
            onUpdateBlock((currentBlock) => ({
              ...currentBlock,
              settings: {
                ...currentBlock.settings,
                style: event.target.value as "plain" | "card" | "highlight",
              },
            }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
        >
          <option value="card">بطاقة</option>
          <option value="plain">نص عادي</option>
          <option value="highlight">تمييز</option>
        </select>

        <select
          value={settings.columns || 2}
          onChange={(event) =>
            onUpdateBlock((currentBlock) => ({
              ...currentBlock,
              settings: {
                ...currentBlock.settings,
                columns: Number(event.target.value) as 1 | 2,
              },
            }))
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
        >
          <option value={1}>عمود واحد</option>
          <option value={2}>عمودين</option>
        </select>
      </div>

      {block.kind === "evidence-gallery" ? (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <select
            value={settings.evidenceLayout || "grid-2x2"}
            onChange={(event) =>
              onUpdateBlock((currentBlock) => ({
                ...currentBlock,
                settings: {
                  ...currentBlock.settings,
                  evidenceLayout: event.target.value as
                    | "grid-2x2"
                    | "two-columns"
                    | "stacked"
                    | "one-per-page",
                },
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="grid-2x2">شبكة 2×2</option>
            <option value="two-columns">صورتان بجانب بعض</option>
            <option value="stacked">صور تحت بعض</option>
            <option value="one-per-page">شاهد لكل صفحة</option>
          </select>

          <select
            value={settings.imageFit || "cover"}
            onChange={(event) =>
              onUpdateBlock((currentBlock) => ({
                ...currentBlock,
                settings: {
                  ...currentBlock.settings,
                  imageFit: event.target.value as "cover" | "contain",
                },
              }))
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
          >
            <option value="cover">ملء الإطار</option>
            <option value="contain">احتواء كامل</option>
          </select>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={settings.showCaptions !== false}
              onChange={(event) =>
                onUpdateBlock((currentBlock) => ({
                  ...currentBlock,
                  settings: {
                    ...currentBlock.settings,
                    showCaptions: event.target.checked,
                  },
                }))
              }
            />
            إظهار التعليقات
          </label>
        </div>
      ) : null}
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl font-black text-red-600">
          !
        </div>

        <div className="mt-4 text-center">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            {description}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}