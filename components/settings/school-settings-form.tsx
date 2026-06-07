"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  Save,
  UploadCloud,
  X,
} from "lucide-react";
import {
  calculateSchoolIdentityReadiness,
  type SchoolIdentityReadiness,
} from "@/lib/school-identity-readiness";

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

type FeedbackState = {
  type: "success" | "error" | "warning";
  message: string;
} | null;

type Tone = "emerald" | "blue" | "amber" | "rose";

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

function normalizeSchoolSettingsData(
  data: Partial<SchoolSettingsFormState> | null | undefined
): SchoolSettingsFormState {
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

function clampPercentage(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

export function SchoolSettingsForm() {
  const [form, setForm] = useState<SchoolSettingsFormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] =
    useState<SchoolSettingsFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);

  const readiness = useMemo(() => {
    return calculateSchoolIdentityReadiness(form);
  }, [form]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const requiredCompleted = useMemo(() => {
    return readiness.missingRequired.length === 0;
  }, [readiness.missingRequired.length]);

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
        if (active) {
          setFeedback({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "حدث خطأ أثناء تحميل الإعدادات.",
          });
        }
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

      update("logoUrl", data.logoUrl || "");

      setFeedback({
        type: "success",
        message: "تم رفع شعار المدرسة بنجاح. اضغط حفظ البيانات لتثبيت التعديل.",
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
    setSaveSuccessOpen(false);

    if (!requiredCompleted) {
      setFeedback({
        type: "warning",
        message: "أكمل الحقول الأساسية المطلوبة قبل حفظ بيانات المدرسة.",
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

      setSaveSuccessOpen(true);
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
    <div className="space-y-6 pb-24">
      <SaveSuccessModal
        open={saveSuccessOpen}
        onClose={() => setSaveSuccessOpen(false)}
      />

      <TopActionsBar
        saving={saving}
        hasChanges={hasChanges}
        onSave={save}
      />

      {feedback ? <FeedbackMessage feedback={feedback} /> : null}

      <IdentityReadinessCard readiness={readiness} />

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <SchoolLogoCard
          logoUrl={form.logoUrl}
          uploading={uploadingLogo}
          onUpload={uploadLogo}
          onClear={() => update("logoUrl", "")}
        />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-black text-blue-700">بيانات الحساب</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              بيانات الموجه/الموجهة
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              هذه البيانات تظهر في التقارير الرسمية والتوقيعات.
            </p>
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
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-black text-blue-700">هوية المدرسة</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            بيانات المدرسة الرسمية
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            الحقول الأساسية فقط مطلوبة. باقي البيانات اختيارية لتحسين شكل التقارير.
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
            required
          />

          <Input
            label="مكتب التعليم"
            value={form.educationOffice}
            onChange={(value) => update("educationOffice", value)}
          />

          <Input
            label="المدينة"
            value={form.city}
            onChange={(value) => update("city", value)}
          />

          <Input
            label="الحي"
            value={form.district}
            onChange={(value) => update("district", value)}
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
            required
          />

          <Input
            label="الفصل الدراسي"
            value={form.currentSemester}
            onChange={(value) => update("currentSemester", value)}
            required
          />

          <Input
            label="رابط شعار المدرسة"
            value={form.logoUrl}
            onChange={(value) => update("logoUrl", value)}
          />
        </div>
      </section>

      <ReportIdentityPreviewCard form={form} />

      <div className="sticky bottom-4 z-20 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">
              {hasChanges ? "يوجد تغييرات غير محفوظة" : "كل التغييرات محفوظة"}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              البيانات الإضافية اختيارية ويمكن تعديلها لاحقًا.
            </p>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TopActionsBar({
  saving,
  hasChanges,
  onSave,
}: {
  saving: boolean;
  hasChanges: boolean;
  onSave: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-950">
            إعداد الهوية اختياري ويمكن إكماله لاحقًا
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {hasChanges
              ? "لديك تغييرات غير محفوظة."
              : "لا توجد تغييرات جديدة."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            تخطي الآن
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      </div>
    </section>
  );
}

function FeedbackMessage({ feedback }: { feedback: NonNullable<FeedbackState> }) {
  return (
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
  );
}

function SaveSuccessModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-emerald-100 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-black text-emerald-700">
          ✓
        </div>

        <h2 className="mt-4 text-2xl font-black text-slate-950">
          تم حفظ البيانات بنجاح
        </h2>

        <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
          تم تحديث بيانات المدرسة والحساب، وستظهر التحديثات في التقارير والمعاينات.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
        >
          تم
        </button>
      </div>
    </div>
  );
}

function SchoolLogoCard({
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-blue-700">شعار المدرسة</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            شعار يظهر في التقارير
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            اختياري، ويمكن إضافته لاحقًا.
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <ImageIcon className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="شعار المدرسة"
              className="h-full w-full object-contain p-2"
            />
          ) : (
            <span className="px-4 text-xs font-black leading-6 text-slate-400">
              بدون شعار
            </span>
          )}
        </div>

        {logoUrl ? (
          <button
            type="button"
            onClick={onClear}
            className="mt-3 inline-flex items-center gap-1 text-xs font-black text-red-600 hover:text-red-700"
          >
            <X className="h-3.5 w-3.5" />
            إزالة الشعار
          </button>
        ) : null}
      </div>

      <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
        <UploadCloud className="h-4 w-4" />
        {uploading ? "جاري رفع الشعار..." : "رفع شعار المدرسة"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            onUpload(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </section>
  );
}

function IdentityReadinessCard({
  readiness,
}: {
  readiness: SchoolIdentityReadiness;
}) {
  const percentage = clampPercentage(
    readiness.percentage ??
      readiness.score ??
      readiness.completedPercentage ??
      readiness.completionPercentage
  );

  const tone: Tone =
    percentage >= 100
      ? "emerald"
      : percentage >= 70
        ? "blue"
        : percentage >= 40
          ? "amber"
          : "rose";

  const toneStyles: Record<
    Tone,
    {
      side: string;
      ring: string;
      label: string;
      pill: string;
    }
  > = {
    emerald: {
      side: "bg-emerald-50",
      ring: "border-emerald-200 text-emerald-700",
      label: "جاهزة",
      pill: "bg-emerald-50 text-emerald-700",
    },
    blue: {
      side: "bg-blue-50",
      ring: "border-blue-200 text-blue-700",
      label: "قريبة من الاكتمال",
      pill: "bg-blue-50 text-blue-700",
    },
    amber: {
      side: "bg-amber-50",
      ring: "border-amber-200 text-amber-700",
      label: "تحتاج إكمال",
      pill: "bg-amber-50 text-amber-700",
    },
    rose: {
      side: "bg-rose-50",
      ring: "border-rose-200 text-rose-700",
      label: "غير مكتملة",
      pill: "bg-rose-50 text-rose-700",
    },
  };

  const currentTone = toneStyles[tone];

  const title =
    percentage >= 100
      ? "الهوية الأساسية مكتملة"
      : readiness.level === "good"
        ? "هوية جيدة وقريبة من الاكتمال"
        : "الهوية غير مكتملة";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
        <div
          className={[
            "flex flex-col items-center justify-center p-7 text-center",
            currentTone.side,
          ].join(" ")}
        >
          <div
            className={[
              "flex h-36 w-36 items-center justify-center rounded-full border-[12px] bg-white text-4xl font-black",
              currentTone.ring,
            ].join(" ")}
          >
            {percentage}%
          </div>

          <h2 className="mt-6 text-xl font-black text-slate-950">
            جاهزية الهوية الرسمية
          </h2>

          <p className="mt-2 max-w-xs text-sm font-bold leading-7 text-slate-500">
            الحقول الأساسية فقط مطلوبة. الباقي تحسينات اختيارية.
          </p>
        </div>

        <div className="p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-blue-700">فحص ذكي</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                {title}
              </h2>
            </div>

            <span
              className={[
                "rounded-full px-4 py-2 text-xs font-black",
                currentTone.pill,
              ].join(" ")}
            >
              {currentTone.label}
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ReadinessList
              title="حقول أساسية مطلوبة"
              emptyText="كل الحقول الأساسية مكتملة."
              items={(readiness.missingRequired || []).map((item) => item.label)}
              type="required"
            />

            <ReadinessList
              title="تحسينات اختيارية"
              emptyText="كل التحسينات الاختيارية مكتملة."
              items={(readiness.missingOptional || []).map((item) => item.label)}
              type="optional"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold leading-7 text-slate-600">
            تستطيع تخطي هذه الصفحة الآن، والعودة لاحقًا من الحساب والباقات ← إعدادات المدرسة.
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
  const hasItems = items.length > 0;
  const itemClass =
    type === "required"
      ? "bg-rose-50 text-rose-700"
      : "bg-amber-50 text-amber-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>

      <div className="mt-4 space-y-2">
        {hasItems ? (
          items.map((item) => (
            <div
              key={item}
              className={[
                "rounded-2xl px-4 py-3 text-sm font-black",
                itemClass,
              ].join(" ")}
            >
              {item}
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {emptyText}
          </div>
        )}
      </div>
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

        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400">
          {form.logoUrl ? (
            <img
              src={form.logoUrl}
              alt="شعار المدرسة"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            "بدون شعار"
          )}
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
          <PreviewLine
            label="الموجه/الموجهة"
            value={form.officialName || "الاسم الرسمي"}
          />
          <PreviewLine
            label="المسمى"
            value={form.jobTitle || "المسمى الوظيفي"}
          />
          <PreviewLine
            label="مدير/ة المدرسة"
            value={form.principalName || "غير محدد"}
          />
          <PreviewLine
            label="المدينة/الحي"
            value={[form.city, form.district].filter(Boolean).join(" - ") || "غير محدد"}
          />
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