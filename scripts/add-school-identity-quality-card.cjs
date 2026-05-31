const fs = require("fs");

const path = "components/settings/school-settings-form.tsx";
let content = fs.readFileSync(path, "utf8");

/* 1) Add import */
if (!content.includes("calculateSchoolIdentityReadiness")) {
  content = content.replace(
`import { useEffect, useMemo, useState } from "react";`,
`import { useEffect, useMemo, useState } from "react";
import { calculateSchoolIdentityReadiness } from "@/lib/school-identity-readiness";`
  );
}

/* 2) Add logoUrl to form type and empty state */
if (!content.includes("logoUrl: string;")) {
  content = content.replace(
`  currentSemester: string;`,
`  currentSemester: string;
  logoUrl: string;`
  );

  content = content.replace(
`  currentSemester: "",
  onboardingCompleted: false,`,
`  currentSemester: "",
  logoUrl: "",
  onboardingCompleted: false,`
  );
}

/* 3) Add readiness memo */
if (!content.includes("const readiness = useMemo")) {
  content = content.replace(
`  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);`,
`  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const readiness = useMemo(() => {
    return calculateSchoolIdentityReadiness(form);
  }, [form]);`
  );
}

/* 4) Add cards before first section */
if (!content.includes("<IdentityReadinessCard readiness={readiness} />")) {
  content = content.replace(
`      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">`,
`      <IdentityReadinessCard readiness={readiness} />

      <ReportIdentityPreviewCard form={form} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">`
  );
}

/* 5) Add logo URL input */
if (!content.includes('label="رابط شعار المدرسة"')) {
  content = content.replace(
`          <Input
            label="الفصل الدراسي"
            value={form.currentSemester}
            onChange={(value) => update("currentSemester", value)}
          />`,
`          <Input
            label="الفصل الدراسي"
            value={form.currentSemester}
            onChange={(value) => update("currentSemester", value)}
          />

          <Input
            label="رابط شعار المدرسة"
            value={form.logoUrl}
            onChange={(value) => update("logoUrl", value)}
          />`
  );
}

/* 6) Add components before StatusBadge */
if (!content.includes("function IdentityReadinessCard")) {
  content = content.replace(
`function StatusBadge({ completed }: { completed: boolean }) {`,
`function IdentityReadinessCard({
  readiness,
}: {
  readiness: ReturnType<typeof calculateSchoolIdentityReadiness>;
}) {
  const tone =
    readiness.level === "excellent"
      ? "emerald"
      : readiness.level === "good"
        ? "blue"
        : readiness.level === "needs-work"
          ? "amber"
          : "red";

  const title =
    readiness.level === "excellent"
      ? "هوية رسمية ممتازة"
      : readiness.level === "good"
        ? "هوية جيدة وقريبة من الاكتمال"
        : readiness.level === "needs-work"
          ? "الهوية تحتاج بعض التحسين"
          : "الهوية غير مكتملة";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
        <div
          className={[
            "flex flex-col items-center justify-center p-7 text-center",
            tone === "emerald"
              ? "bg-emerald-50"
              : tone === "blue"
                ? "bg-blue-50"
                : tone === "amber"
                  ? "bg-amber-50"
                  : "bg-red-50",
          ].join(" ")}
        >
          <div
            className={[
              "flex h-32 w-32 items-center justify-center rounded-full border-[10px] bg-white text-3xl font-black",
              tone === "emerald"
                ? "border-emerald-200 text-emerald-700"
                : tone === "blue"
                  ? "border-blue-200 text-blue-700"
                  : tone === "amber"
                    ? "border-amber-200 text-amber-700"
                    : "border-red-200 text-red-700",
            ].join(" ")}
          >
            {readiness.score}%
          </div>

          <p className="mt-4 text-sm font-black text-slate-950">
            جاهزية الهوية الرسمية
          </p>

          <p className="mt-2 text-xs font-bold leading-6 text-slate-500">
            {readiness.readyForOfficialReports
              ? "جاهزة لاستخدام التقارير الرسمية."
              : "أكمل الحقول الأساسية قبل إصدار التقارير الرسمية."}
          </p>
        </div>

        <div className="p-6">
          <p className="text-sm font-black text-blue-700">فحص ذكي</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <ReadinessList
              title="حقول أساسية مطلوبة"
              emptyText="كل الحقول الأساسية مكتملة."
              items={readiness.missingRequired.map((item) => item.label)}
              type="required"
            />

            <ReadinessList
              title="تحسينات اختيارية"
              emptyText="الهوية شبه مكتملة."
              items={readiness.missingOptional.slice(0, 5).map((item) => item.label)}
              type="optional"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold leading-6 text-slate-600">
            كلما اكتملت الهوية، ظهرت التقارير الرسمية بشكل أقرب للوثائق المدرسية الجاهزة للطباعة والاعتماد.
          </div>
        </div>
      </div>
    </section>
  );
}

function ReadinessList({
  title,
  emptyText,
  items,
  type,
}: {
  title: string;
  emptyText: string;
  items: string[];
  type: "required" | "optional";
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-900">{title}</p>

      {items.length ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className={[
                "rounded-2xl px-3 py-2 text-xs font-bold",
                type === "required"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700",
              ].join(" ")}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function ReportIdentityPreviewCard({
  form,
}: {
  form: SchoolSettingsFormState;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-blue-700">معاينة فورية</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            شكل الهوية في التقارير
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            هذه معاينة تقريبية للترويسة والبيانات التي ستظهر في PDF.
          </p>
        </div>

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400">
          {form.logoUrl ? "شعار" : "بدون شعار"}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-3 text-center text-sm font-black text-slate-800 md:grid-cols-3">
          <p>وزارة التعليم</p>
          <p>{form.educationDepartment || "إدارة التعليم"}</p>
          <p>{form.educationOffice || "مكتب التعليم"}</p>
        </div>

        <div className="mt-5 rounded-2xl bg-white p-5 text-center">
          <p className="text-2xl font-black text-slate-950">
            {form.schoolName || "اسم المدرسة"}
          </p>

          <p className="mt-2 text-sm font-bold text-slate-500">
            {form.academicYear || "العام الدراسي"} ·{" "}
            {form.currentSemester || "الفصل الدراسي"}
          </p>
        </div>

        <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <PreviewLine label="الموجه/الموجهة" value={form.officialName || "الاسم الرسمي"} />
          <PreviewLine label="المسمى" value={form.jobTitle || "المسمى الوظيفي"} />
          <PreviewLine label="مدير/ة المدرسة" value={form.principalName || "غير محدد"} />
          <PreviewLine label="المدينة/الحي" value={[form.city, form.district].filter(Boolean).join(" - ") || "غير محدد"} />
        </div>
      </div>
    </section>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function StatusBadge({ completed }: { completed: boolean }) {`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("تمت إضافة بطاقة جودة الهوية ومعاينة الترويسة.");
