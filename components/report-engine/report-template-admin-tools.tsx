"use client";

import { useMemo, useState } from "react";
import type {
  ReportIdentitySettings,
  ReportTemplateBuilderModel,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";
import { REPORT_SERVICE_OPTIONS } from "@/lib/report-engine/report-template-builder-types";
import { validateReportTemplateForPublishing } from "@/lib/report-engine/report-template-validation";

type ReportTemplateAdminToolsProps = {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
  onIdentityChange: (identity: ReportIdentitySettings) => void;
  onSnippetsChange: (snippets: ReportTextSnippet[]) => void;
};

const snippetCategories: ReportTextSnippet["category"][] = [
  "مقدمة",
  "هدف",
  "إجراء",
  "نتيجة",
  "توصية",
  "خاتمة",
];

export function ReportTemplateAdminTools({
  template,
  identity,
  snippets,
  onIdentityChange,
  onSnippetsChange,
}: ReportTemplateAdminToolsProps) {
  const [activePanel, setActivePanel] = useState<
    "identity" | "library" | "test"
  >("identity");

  const validation = useMemo(() => {
    return validateReportTemplateForPublishing({
      template,
      identity,
      snippets,
    });
  }, [template, identity, snippets]);

  function updateIdentity<K extends keyof ReportIdentitySettings>(
    key: K,
    value: ReportIdentitySettings[K]
  ) {
    onIdentityChange({
      ...identity,
      [key]: value,
    });
  }

  function addSnippet() {
    const newSnippet: ReportTextSnippet = {
      id: `snippet-${Date.now()}`,
      title: "نص جديد",
      category: "مقدمة",
      serviceSlug: template.scope === "SERVICE" ? template.serviceSlug : undefined,
      content: "اكتب النص الجاهز هنا.",
    };

    onSnippetsChange([newSnippet, ...snippets]);
  }

  function updateSnippet(
    snippetId: string,
    updater: (snippet: ReportTextSnippet) => ReportTextSnippet
  ) {
    onSnippetsChange(
      snippets.map((snippet) =>
        snippet.id === snippetId ? updater(snippet) : snippet
      )
    );
  }

  function deleteSnippet(snippetId: string) {
    onSnippetsChange(snippets.filter((snippet) => snippet.id !== snippetId));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            أدوات تجهيز القالب
          </h2>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            إعداد الهوية، مكتبة النصوص، واختبار جاهزية القالب قبل النشر.
          </p>
        </div>

        <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <PanelButton
            label="الهوية"
            active={activePanel === "identity"}
            onClick={() => setActivePanel("identity")}
          />

          <PanelButton
            label="مكتبة النصوص"
            active={activePanel === "library"}
            onClick={() => setActivePanel("library")}
          />

          <PanelButton
            label="اختبار القالب"
            active={activePanel === "test"}
            onClick={() => setActivePanel("test")}
          />
        </div>
      </div>

      {activePanel === "identity" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="اسم الوزارة"
            value={identity.ministryName}
            onChange={(value) => updateIdentity("ministryName", value)}
          />

          <Field
            label="إدارة التعليم"
            value={identity.educationDepartment}
            onChange={(value) => updateIdentity("educationDepartment", value)}
          />

          <Field
            label="مكتب التعليم"
            value={identity.educationOffice}
            onChange={(value) => updateIdentity("educationOffice", value)}
          />

          <Field
            label="اسم المدرسة"
            value={identity.schoolName}
            onChange={(value) => updateIdentity("schoolName", value)}
          />

          <Field
            label="قائد/قائدة المدرسة"
            value={identity.schoolLeaderName}
            onChange={(value) => updateIdentity("schoolLeaderName", value)}
          />

          <Field
            label="الموجه/الموجهة الطلابية"
            value={identity.counselorName}
            onChange={(value) => updateIdentity("counselorName", value)}
          />

          <Field
            label="العام الدراسي"
            value={identity.academicYear}
            onChange={(value) => updateIdentity("academicYear", value)}
          />

          <Field
            label="الفصل الدراسي"
            value={identity.semester}
            onChange={(value) => updateIdentity("semester", value)}
          />

          <Field
            label="رابط شعار الوزارة"
            value={identity.ministryLogoUrl}
            onChange={(value) => updateIdentity("ministryLogoUrl", value)}
          />

          <Field
            label="رابط شعار المدرسة"
            value={identity.schoolLogoUrl}
            onChange={(value) => updateIdentity("schoolLogoUrl", value)}
          />

          <Field
            label="اللون الأساسي"
            value={identity.primaryColor}
            onChange={(value) => updateIdentity("primaryColor", value)}
          />

          <Field
            label="اللون الثانوي"
            value={identity.secondaryColor}
            onChange={(value) => updateIdentity("secondaryColor", value)}
          />

          <div>
            <label className="text-xs font-black text-slate-500">
              الخط
            </label>

            <select
              value={identity.fontFamily}
              onChange={(event) =>
                updateIdentity(
                  "fontFamily",
                  event.target.value as ReportIdentitySettings["fontFamily"]
                )
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-700"
            >
              <option value="Tajawal">Tajawal</option>
              <option value="Cairo">Cairo</option>
              <option value="Arial">Arial</option>
            </select>
          </div>
        </div>
      ) : null}

      {activePanel === "library" ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                مكتبة النصوص الجاهزة
              </h3>

              <p className="mt-1 text-xs leading-6 text-slate-500">
                نصوص يمكن استخدامها لاحقًا داخل التقارير بدل كتابة كل شيء من الصفر.
              </p>
            </div>

            <button
              type="button"
              onClick={addSnippet}
              className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
            >
              إضافة نص
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {snippets.length ? (
              snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_150px_180px_auto]">
                    <input
                      value={snippet.title}
                      onChange={(event) =>
                        updateSnippet(snippet.id, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    />

                    <select
                      value={snippet.category}
                      onChange={(event) =>
                        updateSnippet(snippet.id, (current) => ({
                          ...current,
                          category: event.target
                            .value as ReportTextSnippet["category"],
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    >
                      {snippetCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>

                    <select
                      value={snippet.serviceSlug || ""}
                      onChange={(event) =>
                        updateSnippet(snippet.id, (current) => ({
                          ...current,
                          serviceSlug: event.target.value || undefined,
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    >
                      <option value="">عام لكل الخدمات</option>
                      {REPORT_SERVICE_OPTIONS.map((service) => (
                        <option key={service.slug} value={service.slug}>
                          {service.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => deleteSnippet(snippet.id)}
                      className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                    >
                      حذف
                    </button>
                  </div>

                  <textarea
                    value={snippet.content}
                    onChange={(event) =>
                      updateSnippet(snippet.id, (current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none focus:border-emerald-700"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                لا توجد نصوص جاهزة بعد.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activePanel === "test" ? (
        <div className="mt-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  نتيجة اختبار القالب
                </h3>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  هذا الاختبار يساعدك تعرف هل القالب جاهز للنشر أو يحتاج تعديل.
                </p>
              </div>

              <div
                className={[
                  "rounded-2xl px-4 py-3 text-sm font-black",
                  validation.canPublish
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800",
                ].join(" ")}
              >
                {validation.score}/100
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {validation.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={[
                    "rounded-2xl border p-4",
                    issue.severity === "success"
                      ? "border-emerald-200 bg-emerald-50"
                      : issue.severity === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong
                      className={[
                        "text-sm",
                        issue.severity === "success"
                          ? "text-emerald-900"
                          : issue.severity === "error"
                            ? "text-red-900"
                            : "text-amber-900",
                      ].join(" ")}
                    >
                      {issue.title}
                    </strong>

                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      {issue.severity === "success"
                        ? "جاهز"
                        : issue.severity === "error"
                          ? "خطأ"
                          : "تنبيه"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-6 text-slate-600">
                    {issue.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-7 text-slate-500">
              حالة النشر المقترحة:{" "}
              <span
                className={
                  validation.canPublish
                    ? "font-black text-emerald-700"
                    : "font-black text-red-700"
                }
              >
                {validation.canPublish
                  ? "يمكن نشر القالب"
                  : "لا تنشر القالب قبل إصلاح الأخطاء"}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PanelButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-xs font-black transition",
        active
          ? "bg-white text-emerald-800 shadow-sm"
          : "text-slate-500 hover:text-slate-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-black text-slate-500">{label}</label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-emerald-700"
      />
    </div>
  );
}