"use client";

import { useMemo, useState, type ReactNode } from "react";
import type {
  ReportTextBlock,
  ReportTextTemplatePreset,
  ReportTextVariable,
} from "@/lib/report-engine/report-text-studio-types";
import {
  REPORT_TEXT_TEMPLATE_PRESETS,
  REPORT_TEXT_VARIABLES,
  SAMPLE_REPORT_TEXT_VARIABLES,
  renderReportTextTemplate,
  validateReportTextTemplate,
  extractVariablesFromText,
} from "@/lib/report-engine/report-text-studio-presets";

type TemplateFilter = "all" | "guidance" | "family" | "meeting" | "general";

export function ReportTextTemplateStudio() {
  const [templates, setTemplates] = useState<ReportTextTemplatePreset[]>(
    REPORT_TEXT_TEMPLATE_PRESETS
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    REPORT_TEXT_TEMPLATE_PRESETS[0]?.id || ""
  );

  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all");

  const filteredTemplates = useMemo(() => {
    if (templateFilter === "all") return templates;

    return templates.filter((template) => {
      if (templateFilter === "guidance") {
        return template.serviceSlug === "guidance-programs";
      }

      if (templateFilter === "family") {
        return template.serviceSlug === "family-school-communication";
      }

      if (templateFilter === "meeting") {
        return template.serviceSlug === "committees-meetings";
      }

      if (templateFilter === "general") {
        return template.serviceSlug === "general";
      }

      return true;
    });
  }, [templates, templateFilter]);

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ||
    templates[0];

  const validationIssues = useMemo(() => {
    return selectedTemplate ? validateReportTextTemplate(selectedTemplate) : [];
  }, [selectedTemplate]);

  const errorCount = validationIssues.filter(
    (issue) => issue.level === "error"
  ).length;

  function updateBlockBody(blockId: string, body: string) {
    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplate.id) return template;

        return {
          ...template,
          blocks: template.blocks.map((block) =>
            block.id === blockId ? { ...block, body } : block
          ),
        };
      })
    );
  }

  function toggleBlockLock(blockId: string) {
    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplate.id) return template;

        return {
          ...template,
          blocks: template.blocks.map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  isLockedForCounselor: !block.isLockedForCounselor,
                }
              : block
          ),
        };
      })
    );
  }

  function toggleBlockRequired(blockId: string) {
    setTemplates((current) =>
      current.map((template) => {
        if (template.id !== selectedTemplate.id) return template;

        return {
          ...template,
          blocks: template.blocks.map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  isRequired: !block.isRequired,
                }
              : block
          ),
        };
      })
    );
  }

  function addCustomBlock() {
    const nextOrder =
      Math.max(...selectedTemplate.blocks.map((block) => block.order), 0) + 1;

    const customBlock: ReportTextBlock = {
      id: `custom-${Date.now()}`,
      title: "قسم مخصص",
      type: "custom",
      body: "اكتب نص القسم المخصص هنا ويمكنك استخدام متغير مثل {reportTitle}.",
      isRequired: false,
      isLockedForCounselor: false,
      order: nextOrder,
    };

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              blocks: [...template.blocks, customBlock],
            }
          : template
      )
    );
  }

  function deleteBlock(blockId: string) {
    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id
          ? {
              ...template,
              blocks: template.blocks.filter((block) => block.id !== blockId),
            }
          : template
      )
    );
  }

  function resetTemplate() {
    const original = REPORT_TEXT_TEMPLATE_PRESETS.find(
      (template) => template.id === selectedTemplate.id
    );

    if (!original) return;

    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id ? original : template
      )
    );
  }

  if (!selectedTemplate) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          لا توجد قوالب نصية متاحة.
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <StudioHero errorCount={errorCount} />

        <div className="grid gap-6 xl:grid-cols-[340px_1fr_380px]">
          <aside className="space-y-4">
            <TemplateSelector
              templates={filteredTemplates}
              selectedTemplateId={selectedTemplate.id}
              filter={templateFilter}
              onFilterChange={setTemplateFilter}
              onSelect={setSelectedTemplateId}
            />

            <VariablesPanel variables={REPORT_TEXT_VARIABLES} />
          </aside>

          <section className="space-y-4">
            <TemplateHeader
              template={selectedTemplate}
              errorCount={errorCount}
              onReset={resetTemplate}
              onAddBlock={addCustomBlock}
            />

            <BlocksEditor
              template={selectedTemplate}
              onUpdateBlockBody={updateBlockBody}
              onToggleBlockLock={toggleBlockLock}
              onToggleBlockRequired={toggleBlockRequired}
              onDeleteBlock={deleteBlock}
            />
          </section>

          <aside className="space-y-4">
            <ValidationPanel issues={validationIssues} />

            <LivePreview template={selectedTemplate} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function StudioHero({ errorCount }: { errorCount: number }) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black text-sky-50">
            Smart Report Template Studio
          </div>

          <h1 className="mt-4 text-3xl font-black">
            استوديو قوالب نصوص التقارير
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-8 text-sky-50">
            يبني الأدمن النصوص الرسمية للتقارير، يحدد ما يظهر للموجه، يراجع
            المتغيرات، ويختبر المعاينة قبل النشر. هذه النسخة جاهزة للربط لاحقًا
            مع المسودات والنشر والإصدارات.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs font-bold text-sky-100">الحالة الحالية</p>
            <p className="mt-1 text-lg font-black text-white">Studio تجريبي</p>
            <p className="mt-2 max-w-xs text-xs leading-6 text-sky-50">
              التعديل يعمل محليًا داخل الصفحة، والحفظ الحقيقي لاحقًا.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs font-bold text-sky-100">فحص القالب</p>
            <p className="mt-1 text-lg font-black text-white">
              {errorCount === 0 ? "جاهز للمعاينة" : `${errorCount} خطأ`}
            </p>
            <p className="mt-2 max-w-xs text-xs leading-6 text-sky-50">
              لا ننشر أي قالب لاحقًا إلا بعد اجتياز الفحص.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TemplateSelector({
  templates,
  selectedTemplateId,
  filter,
  onFilterChange,
  onSelect,
}: {
  templates: ReportTextTemplatePreset[];
  selectedTemplateId: string;
  filter: TemplateFilter;
  onFilterChange: (filter: TemplateFilter) => void;
  onSelect: (templateId: string) => void;
}) {
  const filters: Array<{ id: TemplateFilter; label: string }> = [
    { id: "all", label: "الكل" },
    { id: "guidance", label: "البرامج" },
    { id: "family", label: "الأسرة" },
    { id: "meeting", label: "اللجان" },
    { id: "general", label: "عام" },
  ];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">القوالب</h2>

      <p className="mt-1 text-sm leading-7 text-slate-500">
        اختر الخدمة ونوع القالب الذي تريد إدارته.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={[
              "rounded-2xl px-3 py-2 text-xs font-black transition",
              filter === item.id
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {templates.map((template) => {
          const active = template.id === selectedTemplateId;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={[
                "w-full rounded-3xl border p-4 text-right transition",
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm font-black">{template.name}</strong>

                <span
                  className={[
                    "rounded-full px-2 py-1 text-[10px] font-black",
                    active
                      ? "bg-white/15 text-white"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {template.status === "DRAFT" ? "مسودة" : template.status}
                </span>
              </div>

              <p
                className={[
                  "mt-2 text-xs leading-6",
                  active ? "text-slate-200" : "text-slate-500",
                ].join(" ")}
              >
                {template.description}
              </p>

              <div
                className={[
                  "mt-3 rounded-2xl px-3 py-2 text-[11px] font-bold",
                  active
                    ? "bg-white/10 text-slate-100"
                    : "bg-slate-50 text-slate-500",
                ].join(" ")}
              >
                {template.serviceName} · {template.blocks.length} أقسام
              </div>
            </button>
          );
        })}

        {!templates.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
            لا توجد قوالب في هذا التصنيف.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function TemplateHeader({
  template,
  errorCount,
  onReset,
  onAddBlock,
}: {
  template: ReportTextTemplatePreset;
  errorCount: number;
  onReset: () => void;
  onAddBlock: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-sky-700">القالب المحدد</p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {template.name}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            {template.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddBlock}
            className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
          >
            إضافة قسم
          </button>

          <button
            type="button"
            onClick={onReset}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            استعادة الأصل
          </button>

          <button
            type="button"
            disabled
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white opacity-50"
          >
            حفظ كمسودة لاحقًا
          </button>

          <button
            type="button"
            disabled={errorCount > 0}
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white opacity-50"
          >
            نشر لاحقًا
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <InfoBox label="الخدمة" value={template.serviceName} />
        <InfoBox label="نوع القالب" value={getKindName(template.kind)} />
        <InfoBox label="الحالة" value={getStatusName(template.status)} />
        <InfoBox label="الإصدار" value={`v${template.version}`} />
        <InfoBox label="آخر تحديث" value={template.updatedAt} />
      </div>
    </section>
  );
}

function BlocksEditor({
  template,
  onUpdateBlockBody,
  onToggleBlockLock,
  onToggleBlockRequired,
  onDeleteBlock,
}: {
  template: ReportTextTemplatePreset;
  onUpdateBlockBody: (blockId: string, body: string) => void;
  onToggleBlockLock: (blockId: string) => void;
  onToggleBlockRequired: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
}) {
  const sortedBlocks = [...template.blocks].sort((a, b) => a.order - b.order);

  return (
    <section className="space-y-4">
      {sortedBlocks.map((block) => (
        <BlockEditorCard
          key={block.id}
          block={block}
          onUpdate={(body) => onUpdateBlockBody(block.id, body)}
          onToggleLock={() => onToggleBlockLock(block.id)}
          onToggleRequired={() => onToggleBlockRequired(block.id)}
          onDelete={() => onDeleteBlock(block.id)}
        />
      ))}
    </section>
  );
}

function BlockEditorCard({
  block,
  onUpdate,
  onToggleLock,
  onToggleRequired,
  onDelete,
}: {
  block: ReportTextBlock;
  onUpdate: (body: string) => void;
  onToggleLock: () => void;
  onToggleRequired: () => void;
  onDelete: () => void;
}) {
  const usedVariables = extractVariablesFromText(block.body);
  const knownVariableKeys = new Set(REPORT_TEXT_VARIABLES.map((item) => item.key));
  const unknownVariables = usedVariables.filter(
    (key) => !knownVariableKeys.has(key)
  );

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-900">{block.title}</h3>

            {block.isRequired ? (
              <StatusPill tone="sky">مطلوب</StatusPill>
            ) : (
              <StatusPill tone="slate">اختياري</StatusPill>
            )}

            {block.isLockedForCounselor ? (
              <StatusPill tone="amber">مقفول للموجه</StatusPill>
            ) : (
              <StatusPill tone="emerald">قابل لتعديل الموجه</StatusPill>
            )}

            {unknownVariables.length ? (
              <StatusPill tone="red">متغير غير معروف</StatusPill>
            ) : (
              <StatusPill tone="emerald">سليم</StatusPill>
            )}
          </div>

          <p className="mt-2 text-xs font-bold text-slate-500">
            Block ID: {block.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleRequired}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            {block.isRequired ? "اجعله اختياري" : "اجعله مطلوب"}
          </button>

          <button
            type="button"
            onClick={onToggleLock}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
          >
            {block.isLockedForCounselor ? "اسمح بتعديله" : "اقفله للموجه"}
          </button>

          {block.type === "custom" ? (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
            >
              حذف
            </button>
          ) : null}
        </div>
      </div>

      <textarea
        value={block.body}
        onChange={(event) => onUpdate(event.target.value)}
        className="mt-4 min-h-36 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-8 text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
        placeholder="اكتب نص هذا القسم هنا..."
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black text-slate-500">
            المتغيرات المستخدمة
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {usedVariables.length ? (
              usedVariables.map((variable) => (
                <span
                  key={variable}
                  className={[
                    "rounded-2xl px-3 py-2 text-xs font-black",
                    knownVariableKeys.has(variable)
                      ? "bg-sky-50 text-sky-700"
                      : "bg-red-50 text-red-700",
                  ].join(" ")}
                >
                  {"{"}
                  {variable}
                  {"}"}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                لا توجد متغيرات في هذا القسم.
              </span>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
          <p className="text-xs font-black text-sky-700">المعاينة المباشرة</p>

          <p className="mt-3 whitespace-pre-line text-sm leading-8 text-slate-900">
            {renderReportTextTemplate(block.body, SAMPLE_REPORT_TEXT_VARIABLES)}
          </p>
        </div>
      </div>
    </article>
  );
}

function VariablesPanel({ variables }: { variables: ReportTextVariable[] }) {
  const [copiedKey, setCopiedKey] = useState("");
  const [query, setQuery] = useState("");

  const filteredVariables = variables.filter((variable) => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) return true;

    return [
      variable.key,
      variable.label,
      variable.description,
      variable.example,
      variable.group,
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  async function copyVariable(key: string) {
    const text = `{${key}}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(""), 1200);
    } catch {
      setCopiedKey("");
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">المتغيرات</h2>

      <p className="mt-1 text-sm leading-7 text-slate-500">
        اضغط نسخ ثم الصق المتغير داخل نص أي قسم.
      </p>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="بحث في المتغيرات..."
        className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
      />

      <div className="mt-4 max-h-[620px] space-y-3 overflow-auto pr-1">
        {filteredVariables.map((variable) => (
          <div
            key={variable.key}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {variable.label}
                </p>

                <code className="mt-2 inline-flex rounded-xl bg-white px-2 py-1 text-xs font-black text-sky-700">
                  {"{"}
                  {variable.key}
                  {"}"}
                </code>
              </div>

              <button
                type="button"
                onClick={() => copyVariable(variable.key)}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800"
              >
                {copiedKey === variable.key ? "تم النسخ" : "نسخ"}
              </button>
            </div>

            <p className="mt-3 text-xs leading-6 text-slate-500">
              {variable.description}
            </p>

            <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-xs leading-6 text-slate-600">
              مثال: {variable.example}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ValidationPanel({
  issues,
}: {
  issues: ReturnType<typeof validateReportTextTemplate>;
}) {
  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.filter((issue) => issue.level === "warning").length;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">فحص القالب</h2>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            قبل النشر يجب ألا يحتوي القالب على أخطاء.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
          {errors} خطأ · {warnings} تحذير
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className={[
              "rounded-3xl border p-4",
              issue.level === "error"
                ? "border-red-200 bg-red-50"
                : issue.level === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50",
            ].join(" ")}
          >
            <p
              className={[
                "text-sm font-black",
                issue.level === "error"
                  ? "text-red-800"
                  : issue.level === "warning"
                    ? "text-amber-800"
                    : "text-emerald-800",
              ].join(" ")}
            >
              {issue.title}
            </p>

            <p
              className={[
                "mt-1 text-xs leading-6",
                issue.level === "error"
                  ? "text-red-700"
                  : issue.level === "warning"
                    ? "text-amber-700"
                    : "text-emerald-700",
              ].join(" ")}
            >
              {issue.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LivePreview({ template }: { template: ReportTextTemplatePreset }) {
  const sortedBlocks = [...template.blocks].sort((a, b) => a.order - b.order);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">معاينة التقارير</h2>

      <p className="mt-1 text-sm leading-7 text-slate-500">
        شكل النصوص كما ستظهر للموجه داخل التقارير.
      </p>

      <div className="mt-4 space-y-3">
        {sortedBlocks.map((block) => {
          const shouldShow = block.showWhenVariableExists
            ? Boolean(SAMPLE_REPORT_TEXT_VARIABLES[block.showWhenVariableExists])
            : true;

          if (!shouldShow) return null;

          return (
            <article
              key={block.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="text-sm font-black text-slate-900">
                {block.title}
              </h3>

              <p className="mt-2 whitespace-pre-line text-xs leading-7 text-slate-700">
                {renderReportTextTemplate(
                  block.body,
                  SAMPLE_REPORT_TEXT_VARIABLES
                )}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 line-clamp-1 text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "slate" | "sky" | "emerald" | "amber" | "red";
  children: ReactNode;
}) {
  const classes = {
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-[11px] font-black ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

function getKindName(kind: string) {
  if (kind === "official") return "رسمي";
  if (kind === "brief") return "مختصر";
  if (kind === "visual") return "بصري";
  if (kind === "meeting") return "محضر";
  if (kind === "followUp") return "متابعة";
  if (kind === "letter") return "خطاب";
  if (kind === "caseStudy") return "دراسة حالة";
  if (kind === "statistical") return "إحصائي";
  return kind;
}

function getStatusName(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "PUBLISHED") return "منشور";
  if (status === "ARCHIVED") return "مؤرشف";
  return status;
}