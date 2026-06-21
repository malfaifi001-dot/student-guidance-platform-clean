"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type {
  CustomReportField,
  CustomReportFieldType,
  CustomReportOption,
  CustomReportSchema,
  CustomReportValues,
} from "@/lib/custom-report/custom-report-types";

type SavedTemplate = {
  id: string;
  title: string;
  description: string | null;
  prompt: string | null;
  schemaJson: CustomReportSchema;
};

const examplePrompt =
  "أريد تقرير متابعة طالب متكرر الغياب، يحتوي على بيانات الطالب، عدد أيام الغياب، أسباب الغياب، الإجراءات المتخذة، تواصل ولي الأمر، التوصيات، وخطة المتابعة.";

const fieldTypes: { value: CustomReportFieldType; label: string }[] = [
  { value: "text", label: "نص قصير" },
  { value: "textarea", label: "نص طويل" },
  { value: "number", label: "رقم" },
  { value: "date", label: "تاريخ" },
  { value: "select", label: "قائمة اختيار" },
  { value: "multi_select", label: "اختيار متعدد" },
  { value: "checkbox", label: "صح / خطأ" },
  { value: "radio", label: "اختيار واحد" },
];

function isOptionType(type: CustomReportFieldType) {
  return type === "select" || type === "multi_select" || type === "radio";
}

function newField(index: number): CustomReportField {
  return {
    key: `custom_field_${Date.now()}_${index}`,
    label: "حقل جديد",
    type: "text",
    required: false,
    reportLabel: "حقل جديد",
    showInReport: true,
    order: index + 1,
    options: [],
  };
}

function optionLinesToOptions(value: string): CustomReportOption[] {
  return value
    .split(/\r?\n/)
    .map((line, index) => {
      const label = line.trim();

      if (!label) return null;

      return {
        label,
        value: label === "أخرى" ? "other" : `option_${index + 1}`,
      };
    })
    .filter(Boolean) as CustomReportOption[];
}


export function CustomReportWorkspace({
  userName,
  userRole,
  initialTemplateId,
}: {
  userName: string;
  userRole: string;
  initialTemplateId?: string | null;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState<CustomReportSchema | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplateId || null);
  const [values, setValues] = useState<CustomReportValues>({});
  const [isPromptOpen, setIsPromptOpen] = useState(!initialTemplateId);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [generationSeconds, setGenerationSeconds] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const visibleFields = useMemo(
    () => schema?.sections.flatMap((section) => section.fields.filter((field) => field.showInReport !== false)) || [],
    [schema],
  );

  useEffect(() => {
    if (!isSuggesting) {
      setGenerationSeconds(1);
      return;
    }

    const timer = window.setInterval(() => {
      setGenerationSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isSuggesting]);

  useEffect(() => {
    async function loadTemplate() {
      if (!initialTemplateId) return;

      const response = await fetch(`/api/dashboard/custom-report/templates/${initialTemplateId}`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();
      const template = data.template as SavedTemplate;

      setSchema(template.schemaJson);
      setPrompt(template.prompt || template.description || "");
      setSelectedTemplateId(template.id);
      setIsEditingFields(false);
      setMessage("تم تحميل القالب المحفوظ.");
    }

    loadTemplate();
  }, [initialTemplateId]);

  async function suggestReport() {
    setMessage("");

    if (prompt.trim().length < 15) {
      setMessage("اكتب وصفًا أوضح للتقرير المطلوب.");
      return;
    }

    setIsSuggesting(true);

    try {
      const response = await fetch("/api/dashboard/custom-report/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر توليد التقرير.");
      }

      setSchema(data.schema);
      setValues({});
      setSelectedTemplateId(null);
      setIsPromptOpen(false);
      setIsEditingFields(false);
      setMessage("تم تجهيز الحقول بخيارات تعليمية مختصرة. يمكنك تعبئة التقرير مباشرة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function saveTemplate() {
    if (!schema) return;

    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(
        selectedTemplateId
          ? `/api/dashboard/custom-report/templates/${selectedTemplateId}`
          : "/api/dashboard/custom-report/templates",
        {
          method: selectedTemplateId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, schema }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ القالب.");
      }

      setSelectedTemplateId(data.template.id);
      setMessage("تم حفظ القالب للاستخدام لاحقًا.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveEntry(status: "DRAFT" | "SUBMITTED") {
    if (!schema) return;

    setMessage("");

    try {
      const response = await fetch("/api/dashboard/custom-report/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          schema,
          values,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ التقرير.");
      }

      setMessage(status === "SUBMITTED" ? "تم إرسال التقرير." : "تم حفظ المسودة.");

      window.setTimeout(() => {
        router.push(data.redirectTo || `/dashboard/cases/${data.caseId}`);
        router.refresh();
      }, 500);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    }
  }

  function updateSchemaTitle(value: string) {
    setSchema((current) => (current ? { ...current, title: value } : current));
  }

  function updateSectionTitle(sectionIndex: number, value: string) {
    setSchema((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section, index) =>
              index === sectionIndex ? { ...section, title: value } : section,
            ),
          }
        : current,
    );
  }

  function updateField(sectionIndex: number, fieldIndex: number, patch: Partial<CustomReportField>) {
    setSchema((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section, index) => {
              if (index !== sectionIndex) return section;

              return {
                ...section,
                fields: section.fields.map((field, innerIndex) =>
                  innerIndex === fieldIndex
                    ? {
                        ...field,
                        ...patch,
                        reportLabel: patch.label ?? field.reportLabel,
                        options: patch.type && !isOptionType(patch.type) ? [] : patch.options ?? field.options,
                      }
                    : field,
                ),
              };
            }),
          }
        : current,
    );
  }

  function addField(sectionIndex: number) {
    setSchema((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section, index) =>
              index === sectionIndex
                ? { ...section, fields: [...section.fields, newField(section.fields.length)] }
                : section,
            ),
          }
        : current,
    );
  }

  function removeField(sectionIndex: number, fieldIndex: number) {
    setSchema((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section, index) =>
              index === sectionIndex
                ? { ...section, fields: section.fields.filter((_, innerIndex) => innerIndex !== fieldIndex) }
                : section,
            ),
          }
        : current,
    );
  }

  function saveFieldEditor() {
    setIsEditingFields(false);
    setMessage("تم حفظ تعديلات الحقول داخل التقرير. احفظ القالب إذا أردت استخدامه لاحقًا.");
  }

  function updateValue(field: CustomReportField, value: string | boolean | string[]) {
    setValues((current) => ({ ...current, [field.key]: value }));
  }

  function isOtherSelected(field: CustomReportField) {
    const value = values[field.key];
    return value === "other" || (Array.isArray(value) && value.includes("other"));
  }

  function renderFieldInput(field: CustomReportField) {
    if (field.type === "textarea") {
      return (
        <textarea
          value={String(values[field.key] || "")}
          onChange={(event) => updateValue(field, event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
        />
      );
    }

    if (field.type === "checkbox") {
      return (
        <div className="mt-2">
          <input
            type="checkbox"
            checked={Boolean(values[field.key])}
            onChange={(event) => updateValue(field, event.target.checked)}
          />
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <>
          <select
            value={String(values[field.key] || "")}
            onChange={(event) => updateValue(field, event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
          >
            <option value="">اختر...</option>
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {isOtherSelected(field) ? (
            <input
              value={String(values[`${field.key}__other`] || "")}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [`${field.key}__other`]: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-400"
              placeholder="اكتب الخيار الآخر..."
            />
          ) : null}
        </>
      );
    }

    if (field.type === "multi_select") {
      const selected = Array.isArray(values[field.key]) ? (values[field.key] as string[]) : [];

      return (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((option) => (
              <label key={option.value} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value);

                    updateValue(field, next);
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>

          {isOtherSelected(field) ? (
            <input
              value={String(values[`${field.key}__other`] || "")}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [`${field.key}__other`]: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-400"
              placeholder="اكتب الخيار الآخر..."
            />
          ) : null}
        </>
      );
    }

    if (field.type === "radio") {
      return (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(field.options || []).map((option) => (
              <label key={option.value} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name={field.key}
                  checked={values[field.key] === option.value}
                  onChange={() => updateValue(field, option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>

          {isOtherSelected(field) ? (
            <input
              value={String(values[`${field.key}__other`] || "")}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [`${field.key}__other`]: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-400"
              placeholder="اكتب الخيار الآخر..."
            />
          ) : null}
        </>
      );
    }

    return (
      <input
        type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
        value={String(values[field.key] || "")}
        onChange={(event) => updateValue(field, event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
      />
    );
  }

  return (
    <main className="space-y-6" dir="rtl">
      {isPromptOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
            {isSuggesting ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sky-50 text-3xl font-black text-sky-700 ring-8 ring-sky-100">
                  {generationSeconds}
                </div>

                <h2 className="mt-6 text-2xl font-black text-slate-950">
                  جاري تجهيز حقول التقرير
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm font-bold leading-7 text-slate-500">
                  يتم الآن تحليل الوصف وتحويله إلى حقول مختصرة وخيارات تعليمية مناسبة دون تشتيت المستخدم.
                </p>

                <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-600" />
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-black text-sky-700">إنشاء تقرير خاص</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">صف التقرير المطلوب</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  اكتب المطلوب بشكل طبيعي، وسيتم تحويله إلى حقول مختصرة بخيارات تعليمية مناسبة.
                </p>

                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={7}
                  className="mt-5 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 outline-none focus:border-sky-400 focus:bg-white"
                  placeholder={examplePrompt}
                />

                <button type="button" onClick={() => setPrompt(examplePrompt)} className="mt-3 text-sm font-black text-sky-700">
                  استخدام المثال المقترح
                </button>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <Link href="/dashboard/custom-report" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-600">
                    رجوع
                  </Link>

                  <button
                    type="button"
                    onClick={suggestReport}
                    className="rounded-full bg-sky-600 px-6 py-3 text-sm font-black text-white"
                  >
                    توليد الحقول
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-sky-600 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-sky-100">Workflow Runtime</p>
            <h1 className="mt-3 text-4xl font-black">{schema?.title || "تقرير خاص"}</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              نموذج تقرير خاص مبني بالذكاء، مختصر وواضح، ويستخدم خيارات تعليمية جاهزة لتقليل التشتت.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black">
              {isEditingFields ? "محرر الحقول" : "تعبئة التقرير"}
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black">
              {visibleFields.length} حقل
            </span>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
          {message}
        </div>
      ) : null}

      {!schema ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black">ابدأ بإنشاء تقرير خاص</h2>
          <p className="mt-3 text-sm font-bold text-slate-500">
            اضغط إنشاء، واكتب وصف التقرير المطلوب ليتم توليد الحقول.
          </p>
          <button
            type="button"
            onClick={() => setIsPromptOpen(true)}
            className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white"
          >
            + إنشاء تقرير خاص
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-sky-700">
                  {isEditingFields ? "تعديل النموذج" : "تعبئة التقرير"}
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {isEditingFields ? "محرر الحقول" : "الحقول المطلوبة"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={isSaving}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {isSaving ? "جاري الحفظ..." : "حفظ القالب للاستخدام لاحقًا"}
                </button>

                {!isEditingFields ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingFields(true)}
                    className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700"
                  >
                    تعديل الحقول
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={saveFieldEditor}
                    className="rounded-full bg-sky-600 px-5 py-3 text-sm font-black text-white"
                  >
                    حفظ التعديلات
                  </button>
                )}
              </div>
            </div>
          </section>

          {isEditingFields ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="block text-sm font-black text-slate-700">عنوان التقرير</label>
              <input
                value={schema.title}
                onChange={(event) => updateSchemaTitle(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />

              <div className="mt-6 flex flex-col gap-5">
                {schema.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      value={section.title}
                      onChange={(event) => updateSectionTitle(sectionIndex, event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black outline-none focus:border-sky-400"
                    />

                    <div className="mt-4 flex flex-col gap-3">
                      {section.fields.map((field, fieldIndex) => (
                        <div key={field.key} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
                            <input
                              value={field.label}
                              onChange={(event) => updateField(sectionIndex, fieldIndex, { label: event.target.value })}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            />

                            <select
                              value={field.type}
                              onChange={(event) =>
                                updateField(sectionIndex, fieldIndex, {
                                  type: event.target.value as CustomReportFieldType,
                                })
                              }
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            >
                              {fieldTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {isOptionType(field.type) ? (
                            <label className="mt-3 block">
                              <span className="text-xs font-black text-slate-500">الخيارات، كل خيار في سطر</span>
                              <textarea
                                value={(field.options || []).map((option) => option.label).join("\n")}
                                onChange={(event) =>
                                  updateField(sectionIndex, fieldIndex, {
                                    options: optionLinesToOptions(event.target.value),
                                  })
                                }
                                rows={4}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-sky-400"
                              />
                            </label>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={Boolean(field.required)}
                                onChange={(event) => updateField(sectionIndex, fieldIndex, { required: event.target.checked })}
                              />
                              مطلوب
                            </label>

                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={field.showInReport !== false}
                                onChange={(event) => updateField(sectionIndex, fieldIndex, { showInReport: event.target.checked })}
                              />
                              يظهر في التقرير
                            </label>

                            <button type="button" onClick={() => removeField(sectionIndex, fieldIndex)} className="font-black text-red-600">
                              حذف
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addField(sectionIndex)}
                      className="mt-4 rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm font-black text-slate-600 hover:bg-white"
                    >
                      إضافة حقل
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={saveFieldEditor}
                  className="rounded-full bg-sky-600 px-6 py-3 text-sm font-black text-white"
                >
                  حفظ التعديلات والخروج من المحرر
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-black text-sky-700">الخطوة 1</p>
                <h2 className="text-2xl font-black">تعبئة التقرير</h2>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  اختر القيم المناسبة، واستخدم أخرى عند الحاجة لإضافة نص يدوي.
                </p>

                <div className="mt-6 flex flex-col gap-5">
                  {schema.sections.map((section) => (
                    <div key={section.id} className="rounded-3xl border border-slate-100 p-5">
                      <h3 className="text-lg font-black">{section.title}</h3>

                      <div className="mt-4 grid gap-4">
                        {section.fields.map((field) => (
                          <label key={field.key} className="block">
                            <span className="text-sm font-black text-slate-700">
                              {field.label}
                              {field.required ? <span className="text-red-500"> *</span> : null}
                            </span>
                            {renderFieldInput(field)}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => saveEntry("DRAFT")}
                      className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      حفظ مسودة
                    </button>

                    <button
                      type="button"
                      onClick={() => saveEntry("SUBMITTED")}
                      className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                    >
                      إرسال
                    </button>
                  </div>
                </div>
              </section>
          )}
        </>
      )}
    </main>
  );
}