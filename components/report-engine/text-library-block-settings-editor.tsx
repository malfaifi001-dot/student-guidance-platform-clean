"use client";

import type {
  ReportTemplateBlock,
  ReportTemplateBuilderModel,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";
import { REPORT_SERVICE_OPTIONS } from "@/lib/report-engine/report-template-builder-types";
import {
  DEFAULT_TEXT_LIBRARY_BLOCK_SETTINGS,
  getTextLibrarySettings,
  type TextLibraryBlockSettings,
} from "@/lib/report-engine/report-text-library-runtime";

const snippetCategories: Array<ReportTextSnippet["category"] | "all"> = [
  "all",
  "مقدمة",
  "هدف",
  "إجراء",
  "نتيجة",
  "توصية",
  "خاتمة",
];

type TextLibraryBlockSettingsEditorProps = {
  block: ReportTemplateBlock;
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  onUpdateBlock: (
    updater: (block: ReportTemplateBlock) => ReportTemplateBlock
  ) => void;
};

export function TextLibraryBlockSettingsEditor({
  block,
  template,
  snippets,
  onUpdateBlock,
}: TextLibraryBlockSettingsEditorProps) {
  const settings = getTextLibrarySettings(block);

  const matchingSnippets = getMatchingSnippets({
    template,
    snippets,
    settings,
  });

  function updateTextLibrarySettings(nextSettings: TextLibraryBlockSettings) {
    onUpdateBlock((currentBlock) => ({
      ...currentBlock,
      settings: {
        ...currentBlock.settings,
        textLibrary: {
          ...DEFAULT_TEXT_LIBRARY_BLOCK_SETTINGS,
          ...settings,
          ...nextSettings,
        },
      },
    }));
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="text-sm font-black text-emerald-900">
            إعدادات مكتبة النصوص
          </h5>

          <p className="mt-1 text-xs leading-6 text-emerald-800">
            هذا البلوك يسحب نصًا جاهزًا من مكتبة النصوص حسب الخدمة والتصنيف
            وطريقة العرض.
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-emerald-700">
          {matchingSnippets.length} نص مطابق
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-black text-slate-600">
            مصدر النصوص
          </label>

          <select
            value={settings.textSourceMode || "same-template-service"}
            onChange={(event) =>
              updateTextLibrarySettings({
                textSourceMode: event.target
                  .value as TextLibraryBlockSettings["textSourceMode"],
              })
            }
            className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs font-bold outline-none"
          >
            <option value="same-template-service">نفس خدمة القالب</option>
            <option value="global">النصوص العامة فقط</option>
            <option value="specific-service">خدمة محددة</option>
            <option value="all">كل النصوص</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-slate-600">
            التصنيف المطلوب
          </label>

          <select
            value={settings.category || "all"}
            onChange={(event) =>
              updateTextLibrarySettings({
                category: event.target.value as TextLibraryBlockSettings["category"],
              })
            }
            className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs font-bold outline-none"
          >
            {snippetCategories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "كل التصنيفات" : category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-black text-slate-600">
            طريقة العرض
          </label>

          <select
            value={settings.renderMode || "first"}
            onChange={(event) =>
              updateTextLibrarySettings({
                renderMode: event.target
                  .value as TextLibraryBlockSettings["renderMode"],
              })
            }
            className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs font-bold outline-none"
          >
            <option value="first">أول نص مطابق</option>
            <option value="all">كل النصوص المطابقة</option>
            <option value="selected">نص محدد</option>
          </select>
        </div>
      </div>

      {settings.textSourceMode === "specific-service" ? (
        <div className="mt-3">
          <label className="text-xs font-black text-slate-600">
            اختر الخدمة
          </label>

          <select
            value={settings.serviceSlug || ""}
            onChange={(event) =>
              updateTextLibrarySettings({
                serviceSlug: event.target.value || undefined,
              })
            }
            className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs font-bold outline-none"
          >
            <option value="">اختر خدمة</option>
            {REPORT_SERVICE_OPTIONS.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {settings.renderMode === "selected" ? (
        <div className="mt-3">
          <label className="text-xs font-black text-slate-600">
            اختر النص المحدد
          </label>

          <select
            value={settings.snippetId || ""}
            onChange={(event) =>
              updateTextLibrarySettings({
                snippetId: event.target.value || undefined,
              })
            }
            className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs font-bold outline-none"
          >
            <option value="">اختر نصًا من المكتبة</option>
            {matchingSnippets.map((snippet) => (
              <option key={snippet.id} value={snippet.id}>
                {snippet.title} - {snippet.category}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-black text-slate-600">
            عند عدم وجود نص
          </label>

          <select
            value={settings.fallbackBehavior || "show-fallback"}
            onChange={(event) =>
              updateTextLibrarySettings({
                fallbackBehavior: event.target
                  .value as TextLibraryBlockSettings["fallbackBehavior"],
              })
            }
            className="mt-2 w-full rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs font-bold outline-none"
          >
            <option value="show-fallback">اعرض نصًا بديلًا</option>
            <option value="hide">أخفِ البلوك</option>
          </select>
        </div>

        <label className="mt-7 flex items-center gap-2 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(settings.editableByCounselor)}
            onChange={(event) =>
              updateTextLibrarySettings({
                editableByCounselor: event.target.checked,
              })
            }
          />
          يسمح للموجه/الموجهة بتعديله لاحقًا
        </label>
      </div>

      {settings.fallbackBehavior !== "hide" ? (
        <div className="mt-3">
          <label className="text-xs font-black text-slate-600">
            النص البديل
          </label>

          <textarea
            value={
              settings.fallbackText ||
              DEFAULT_TEXT_LIBRARY_BLOCK_SETTINGS.fallbackText
            }
            onChange={(event) =>
              updateTextLibrarySettings({
                fallbackText: event.target.value,
              })
            }
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-emerald-100 bg-white px-3 py-3 text-xs leading-6 outline-none"
          />
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-3">
        <p className="text-xs font-black text-slate-600">
          النصوص المطابقة الآن
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {matchingSnippets.length ? (
            matchingSnippets.slice(0, 6).map((snippet) => (
              <span
                key={snippet.id}
                className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700"
              >
                {snippet.title}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">
              لا يوجد نص مطابق حسب الإعدادات الحالية.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getMatchingSnippets({
  template,
  snippets,
  settings,
}: {
  template: ReportTemplateBuilderModel;
  snippets: ReportTextSnippet[];
  settings: TextLibraryBlockSettings;
}) {
  return snippets.filter((snippet) => {
    const matchesCategory =
      !settings.category ||
      settings.category === "all" ||
      snippet.category === settings.category;

    const matchesService = matchesServiceMode({
      snippet,
      template,
      settings,
    });

    return matchesCategory && matchesService;
  });
}

function matchesServiceMode({
  snippet,
  template,
  settings,
}: {
  snippet: ReportTextSnippet;
  template: ReportTemplateBuilderModel;
  settings: TextLibraryBlockSettings;
}) {
  if (settings.textSourceMode === "all") {
    return true;
  }

  if (settings.textSourceMode === "global") {
    return !snippet.serviceSlug;
  }

  if (settings.textSourceMode === "specific-service") {
    return snippet.serviceSlug === settings.serviceSlug;
  }

  if (template.scope === "SERVICE" && template.serviceSlug) {
    return snippet.serviceSlug === template.serviceSlug || !snippet.serviceSlug;
  }

  return !snippet.serviceSlug;
}