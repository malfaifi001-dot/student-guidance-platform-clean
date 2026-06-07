"use client";

import { useState } from "react";

export default function OnboardingPage() {
  const [form, setForm] = useState({
    officialName: "",
    jobTitle: "موجه طلابي",
    schoolName: "",
    principalName: "",
    educationDepartment: "",
    educationOffice: "",
    city: "",
    district: "",
    stage: "",
    academicYear: "1447هـ",
    currentSemester: "الفصل الدراسي الأول",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function skipOnboarding() {
    setError("");

    try {
      setLoading(true);

      const response = await fetch("/api/dashboard/onboarding/skip", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تخطي إعداد الحساب.");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);

      const response = await fetch("/api/dashboard/settings/school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ البيانات.");
      }

      window.location.href = data.redirectTo || "/dashboard";
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-8">
      <form
        onSubmit={submit}
        className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 bg-slate-950 px-8 py-7 text-white">
          <p className="text-sm font-black text-sky-200">إكمال إعداد الحساب</p>
          <h1 className="mt-3 text-3xl font-black">جهّز هوية المدرسة والتقارير</h1>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-slate-300">
            هذه البيانات ستستخدم لاحقًا في التقارير الرسمية، هوية المدرسة، وملفات PDF.
            يمكنك تخطي هذه الخطوة الآن، لكن سيتم طلبها لاحقًا قبل استخدام التقارير الرسمية ورفع بيانات الطلاب.
            كلما كانت البيانات مكتملة، ظهرت التقارير الرسمية بشكل احترافي دون تعبئة يدوية متكررة.
          </p>
        </div>

        {error ? (
          <div className="mx-8 mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 p-8 lg:grid-cols-2">
          <Section title="بيانات الموجه/الموجهة">
            <Input label="الاسم الرسمي في التقارير" value={form.officialName} onChange={(v) => update("officialName", v)} />
            <Input label="المسمى الوظيفي" value={form.jobTitle} onChange={(v) => update("jobTitle", v)} />
          </Section>

          <Section title="بيانات المدرسة">
            <Input label="اسم المدرسة" value={form.schoolName} onChange={(v) => update("schoolName", v)} />
            <Input label="اسم المدير/ة" value={form.principalName} onChange={(v) => update("principalName", v)} />
            <Input label="إدارة التعليم" value={form.educationDepartment} onChange={(v) => update("educationDepartment", v)} />
            <Input label="مكتب التعليم" value={form.educationOffice} onChange={(v) => update("educationOffice", v)} />
            <Input label="المدينة" value={form.city} onChange={(v) => update("city", v)} />
            <Input label="الحي" value={form.district} onChange={(v) => update("district", v)} />
            <Input label="المرحلة" value={form.stage} onChange={(v) => update("stage", v)} />
            <Input label="العام الدراسي" value={form.academicYear} onChange={(v) => update("academicYear", v)} />
            <Input label="الفصل الدراسي" value={form.currentSemester} onChange={(v) => update("currentSemester", v)} />
          </Section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-8 py-5">
          <p className="text-xs font-bold leading-6 text-slate-500">
            يمكن تعديل هذه البيانات لاحقًا من إعدادات المدرسة.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={skipOnboarding}
              disabled={loading}
              className="rounded-2xl border border-slate-200 bg-white px-7 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              تخطي الآن
            </button>

            <button
              disabled={loading}
              className="rounded-2xl bg-slate-950 px-7 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "حفظ ودخول المنصة"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
