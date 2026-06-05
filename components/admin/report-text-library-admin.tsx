"use client";

import { useMemo, useState } from "react";
import {
  SMART_TEXT_LIBRARIES,
  SMART_TEXT_VARIABLES,
  createSampleSmartTextVariables,
  renderSmartTemplate,
  type SmartTextTemplateSet,
} from "@/lib/report-engine/report-smart-text-library";

export function ReportTextLibraryAdmin() {
  const [selectedLibraryId, setSelectedLibraryId] = useState(
    SMART_TEXT_LIBRARIES[0]?.id || "general"
  );

  const sampleVariables = useMemo(() => createSampleSmartTextVariables(), []);

  const selectedLibrary =
    SMART_TEXT_LIBRARIES.find((library) => library.id === selectedLibraryId) ||
    SMART_TEXT_LIBRARIES[0];

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <HeroSection />

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <LibrarySelector
              selectedLibraryId={selectedLibraryId}
              onSelect={setSelectedLibraryId}
            />

            <VariablesCard />
          </aside>

          <section className="space-y-4">
            <SelectedLibraryHeader library={selectedLibrary} />

            <TemplatesPreview
              library={selectedLibrary}
              variables={sampleVariables}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black text-sky-50">
            إدارة التقارير
          </div>

          <h1 className="mt-4 text-3xl font-black">
            مكتبة النصوص الذكية للتقارير
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-8 text-sky-50">
            هنا يتحكم الأدمن في النصوص الرسمية التي تظهر داخل التقارير. كل نص
            يستخدم متغيرات ذكية مثل اسم البرنامج، تاريخ التنفيذ، الفئة
            المستهدفة، الشواهد، ومؤشر الأداء.
          </p>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/10 p-4">
          <p className="text-xs font-bold text-sky-100">الحالة الحالية</p>
          <p className="mt-1 text-lg font-black text-white">
            نسخة مبدئية جاهزة للمعاينة
          </p>
          <p className="mt-2 max-w-xs text-xs leading-6 text-sky-50">
            لاحقًا نضيف الحفظ والتعديل من قاعدة البيانات بدون تغيير تجربة
            الأدمن.
          </p>
        </div>
      </div>
    </section>
  );
}

function LibrarySelector({
  selectedLibraryId,
  onSelect,
}: {
  selectedLibraryId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-slate-900">أنواع النصوص</h2>

        <p className="mt-1 text-sm leading-7 text-slate-500">
          اختر نوع الخدمة لمراجعة النصوص التي ستظهر في تقاريرها.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {SMART_TEXT_LIBRARIES.map((library) => {
          const active = library.id === selectedLibraryId;

          return (
            <button
              key={library.id}
              type="button"
              onClick={() => onSelect(library.id)}
              className={[
                "w-full rounded-3xl border p-4 text-right transition",
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm font-black">{library.name}</strong>

                {active ? (
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black">
                    مختار
                  </span>
                ) : null}
              </div>

              <p
                className={[
                  "mt-2 text-xs leading-6",
                  active ? "text-slate-200" : "text-slate-500",
                ].join(" ")}
              >
                {library.description}
              </p>

              <div
                className={[
                  "mt-3 rounded-2xl px-3 py-2 text-[11px] font-bold",
                  active
                    ? "bg-white/10 text-slate-100"
                    : "bg-slate-50 text-slate-500",
                ].join(" ")}
              >
                {library.sections.length} أقسام نصية
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function VariablesCard() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">المتغيرات المتاحة</h2>

      <p className="mt-1 text-sm leading-7 text-slate-500">
        يستخدم الأدمن هذه المتغيرات داخل النصوص بين الأقواس.
      </p>

      <div className="mt-4 max-h-[620px] space-y-3 overflow-auto pr-1">
        {SMART_TEXT_VARIABLES.map((variable) => (
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

              <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">
                متغير
              </span>
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

function SelectedLibraryHeader({
  library,
}: {
  library: SmartTextTemplateSet;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-sky-700">القالب المحدد</p>

          <h2 className="mt-2 text-2xl font-black text-slate-900">
            {library.name}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            {library.description}
          </p>
        </div>

        <div className="rounded-3xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-black text-slate-500">عدد الأقسام</p>
          <p className="mt-1 text-xl font-black text-slate-900">
            {library.sections.length}
          </p>
        </div>
      </div>
    </section>
  );
}

function TemplatesPreview({
  library,
  variables,
}: {
  library: SmartTextTemplateSet;
  variables: Record<string, string>;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            معاينة النصوص الرسمية
          </h2>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            هذه المعاينة توضّح للأدمن كيف سيظهر النص داخل التقارير بعد استبدال
            المتغيرات.
          </p>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          Preview
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {library.sections.map((section, index) => {
          const shouldShow = section.when ? section.when(variables) : true;
          const renderedText = renderSmartTemplate(section.body, variables);

          return (
            <article
              key={section.id}
              className={[
                "rounded-[2rem] border p-5 transition",
                shouldShow
                  ? "border-slate-200 bg-slate-50"
                  : "border-amber-200 bg-amber-50",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900 text-xs font-black text-white">
                      {index + 1}
                    </span>

                    <h3 className="text-base font-black text-slate-900">
                      {section.title}
                    </h3>
                  </div>

                  <p className="mt-2 text-xs font-bold text-slate-500">
                    Section ID: {section.id}
                  </p>
                </div>

                {shouldShow ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                    يظهر في التقارير
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-700">
                    يظهر بشرط
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black text-slate-500">
                    النص الأصلي بالقالب
                  </p>

                  <p className="mt-3 whitespace-pre-line text-sm leading-8 text-slate-700">
                    {section.body}
                  </p>
                </div>

                <div className="rounded-3xl border border-sky-100 bg-white p-4">
                  <p className="text-xs font-black text-sky-700">
                    المعاينة بعد استبدال المتغيرات
                  </p>

                  <p className="mt-3 whitespace-pre-line text-sm leading-8 text-slate-900">
                    {renderedText}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}