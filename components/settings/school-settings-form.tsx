"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateSchoolIdentityReadiness } from "@/lib/school-identity-readiness";

type SchoolSettingsFormState = {
  officialName: string;
  jobTitle: string;
  phone: string;
  schoolName: string;
  principalName: string;
  educationDepartment: string;
  educationOffice: string;
  city: string;
  district: string;
  stage: string;
  academicYear: string;
  currentSemester: string;
  logoUrl: string;
  onboardingCompleted?: boolean;
};

function normalizeSchoolSettingsData(data: Partial<SchoolSettingsFormState> | null | undefined): SchoolSettingsFormState {
  return {
    officialName: data?.officialName || "",
    jobTitle: data?.jobTitle || "",
    phone: data?.phone || "",
    schoolName: data?.schoolName || "",
    principalName: data?.principalName || "",
    educationDepartment: data?.educationDepartment || "",
    educationOffice: data?.educationOffice || "",
    city: data?.city || "",
    district: data?.district || "",
    stage: data?.stage || "",
    academicYear: data?.academicYear || "",
    currentSemester: data?.currentSemester || "",
    logoUrl: data?.logoUrl || "",
    onboardingCompleted: Boolean(data?.onboardingCompleted),
  };
}

const EMPTY_FORM: SchoolSettingsFormState = {
  officialName: "",
  jobTitle: "",
  phone: "",
  schoolName: "",
  principalName: "",
  educationDepartment: "",
  educationOffice: "",
  city: "",
  district: "",
  stage: "",
  academicYear: "",
  currentSemester: "",
  logoUrl: "",
  onboardingCompleted: false,
};

export function SchoolSettingsForm() {
  const [form, setForm] = useState<SchoolSettingsFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] =
    useState<SchoolSettingsFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const requiredCompleted = useMemo(() => {
    return Boolean(
      form.officialName.trim() &&
        form.jobTitle.trim() &&
        form.schoolName.trim()
    );
  }, [form]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const readiness = useMemo(() => {
    return calculateSchoolIdentityReadiness(form);
  }, [form]);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);

        const response = await fetch("/api/dashboard/settings/school", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر تحميل إعدادات المدرسة.");
        }

        if (active) {
          const normalizedData = normalizeSchoolSettingsData(data.data);
          setForm(normalizedData);
          setInitialForm(normalizedData);
        }
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "حدث خطأ أثناء تحميل الإعدادات.",
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function update(key: keyof SchoolSettingsFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function uploadLogo(file: File | null) {
    setFeedback(null);

    if (!file) return;

    try {
      setUploadingLogo(true);

      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/dashboard/settings/school/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر رفع الشعار.");
      }

      setForm((current) => ({
        ...current,
        logoUrl: data.logoUrl,
      }));

      setFeedback({
        type: "success",
        message: "تم رفع شعار المدرسة بنجاح. اضغط حفظ البيانات لتثبيت بقية التعديلات إن وجدت.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "حدث خطأ أثناء رفع الشعار.",
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save() {
    setFeedback(null);

    if (!requiredCompleted) {
      setFeedback({
        type: "warning",
        message: "أكمل الاسم الرسمي، المسمى الوظيفي، واسم المدرسة أولًا.",
      });
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/dashboard/settings/school", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ الإعدادات.");
      }

      const nextForm = {
        ...form,
        onboardingCompleted: true,
      };

      setForm(nextForm);
      setInitialForm(nextForm);

      setFeedback({
        type: "success",
        message: "تم حفظ بيانات المدرسة والحساب بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "حدث خطأ أثناء حفظ البيانات.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">
        جاري تحميل إعدادات المدرسة...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-sm font-bold leading-7",
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : feedback.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700",
          ].join(" ")}
        >
          {feedback.message}
        </div>
      ) : null}

      <IdentityReadinessCard readiness={readiness} />

      <ReportIdentityPreviewCard form={form} />
<section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-blue-700">هوية الحساب</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              بيانات الموجه/الموجهة
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              هذه البيانات تظهر في التقارير الرسمية والتوقيعات.
            </p>
          </div>

          <StatusBadge completed={Boolean(form.onboardingCompleted)} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            label="الاسم الرسمي في التقارير"
            value={form.officialName}
            onChange={(value) => update("officialName", value)}
            required
          />

          <Input
            label="المسمى الوظيفي"
            value={form.jobTitle}
            onChange={(value) => update("jobTitle", value)}
            required
          />

          <Input
            label="رقم الجوال"
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-black text-blue-700">هوية المدرسة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            بيانات المدرسة الرسمية
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            تستخدم هذه البيانات في ترويسة التقارير وملفات PDF والوثائق.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input
            label="اسم المدرسة"
            value={form.schoolName}
            onChange={(value) => update("schoolName", value)}
            required
          />

          <Input
            label="اسم المدير/ة"
            value={form.principalName}
            onChange={(value) => update("principalName", value)}
          />

          <Input
            label="إدارة التعليم"
            value={form.educationDepartment}
            onChange={(value) => update("educationDepartment", value)}
          />
<Input
            label="المدينة"
            value={form.city}
            onChange={(value) => update("city", value)}
          />
<Input
            label="المرحلة"
            value={form.stage}
            onChange={(value) => update("stage", value)}
          />

          <Input
            label="العام الدراسي"
            value={form.academicYear}
            onChange={(value) => update("academicYear", value)}
          />

          <Input
            label="الفصل الدراسي"
            value={form.currentSemester}
            onChange={(value) => update("currentSemester", value)}
          />
</div>
      </section>

      <div className="sticky bottom-4 z-20 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">
              {hasChanges ? "يوجد تغييرات غير محفوظة" : "كل التغييرات محفوظة"}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              بعد حفظ هذه البيانات تختفي رسالة إكمال بيانات المدرسة.
            </p>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving || !hasChanges}
            className="rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SchoolLogoUploadCard({
  logoUrl,
  uploading,
  onUpload,
  onClear,
}: {
  logoUrl: string;
  uploading: boolean;
  onUpload: (file: File | null) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="شعار المدرسة"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="px-4 text-xs font-black leading-6 text-slate-400">
                شعار المدرسة
              </span>
            )}
          </div>

          {logoUrl ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-3 text-xs font-black text-red-600 hover:text-red-700"
            >
              إزالة الشعار
            </button>
          ) : null}
        </div>

        <div>
          <p className="text-sm font-black text-blue-700">شعار المدرسة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            رفع شعار يظهر في التقارير الرسمية
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            يفضّل رفع شعار بصيغة PNG بخلفية شفافة أو SVG بجودة عالية. سيظهر الشعار في معاينة الهوية وملفات PDF الرسمية.
          </p>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="block cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center transition hover:bg-slate-50">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  onUpload(file);
                  event.currentTarget.value = "";
                }}
                disabled={uploading}
              />

              <span className="block text-sm font-black text-slate-900">
                {uploading ? "جاري رفع الشعار..." : "اختر شعار المدرسة"}
              </span>

              <span className="mt-1 block text-xs font-bold text-slate-500">
                PNG / JPG / WEBP / SVG — الحد الأقصى 2MB
              </span>
            </label>

            <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-bold leading-6 text-blue-700">
              نصيحة: استخدم صورة مربعة أو شعار شفاف حتى يظهر بشكل أجمل في الغلاف والترويسة.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function IdentityReadinessCard({
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
</div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-3 text-center text-sm font-black text-slate-800 md:grid-cols-3">
          <p>وزارة التعليم</p>
          <p>{form.educationDepartment || "إدارة التعليم"}</p>
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
          <PreviewLine label="المدينة" value={form.city || "غير محدد"} />
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

function StatusBadge({ completed }: { completed: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-4 py-2 text-xs font-black",
        completed
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {completed ? "مكتملة" : "غير مكتملة"}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      <input
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
