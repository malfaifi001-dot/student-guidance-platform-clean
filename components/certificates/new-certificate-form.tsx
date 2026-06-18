"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CERTIFICATE_RECIPIENT_TYPES,
  CERTIFICATE_TYPES,
} from "@/lib/certificates/certificate-types";
import {
  buildCertificateBody,
  normalizeCertificateDraft,
  type CertificateDraft,
} from "@/lib/certificates/certificate-copy";

type StudentResult = {
  id: string;
  name: string;
  nationalId: string;
  grade: string;
  classroom: string;
  gender: string;
};

export function NewCertificateForm() {
  const router = useRouter();

  const [form, setForm] = useState<CertificateDraft>(() =>
    normalizeCertificateDraft({
      certificateType: "thanks",
      recipientType: "student",
      issueDate: new Date().toISOString().slice(0, 10),
    }),
  );

  const [studentQuery, setStudentQuery] = useState("");
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);

  const generatedBody = useMemo(
    () =>
      buildCertificateBody({
        certificateType: form.certificateType,
        recipientType: form.recipientType,
        recipientName: form.recipientName,
        reason: form.reason,
      }),
    [form.certificateType, form.recipientType, form.recipientName, form.reason],
  );

  useEffect(() => {
    if (!form.body || form.body === generatedBody) {
      setForm((current) => ({ ...current, body: generatedBody }));
    }
  }, [generatedBody, form.body]);

  useEffect(() => {
    let ignore = false;

    async function search() {
      if (studentQuery.trim().length < 2) {
        setStudents([]);
        return;
      }

      setStudentLoading(true);

      try {
        const response = await fetch(
          `/api/dashboard/certificates/students?query=${encodeURIComponent(studentQuery.trim())}`,
          { cache: "no-store" },
        );

        const data = await response.json();

        if (!ignore) {
          setStudents(data.items || []);
        }
      } finally {
        if (!ignore) {
          setStudentLoading(false);
        }
      }
    }

    const timer = window.setTimeout(search, 350);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [studentQuery]);

  function update<K extends keyof CertificateDraft>(key: K, value: CertificateDraft[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectStudent(student: StudentResult) {
    setForm((current) => ({
      ...current,
      recipientStudentId: student.id,
      recipientName: student.name,
      recipientIdentity: student.nationalId,
      grade: student.grade,
      classroom: student.classroom,
      recipientType: student.gender === "FEMALE" ? "student_female" : "student",
    }));
    setStudentQuery(student.name);
    setStudents([]);
  }

  function goPreview() {
    const draft = normalizeCertificateDraft(form);

    if (!draft.recipientName) {
      return;
    }

    window.sessionStorage.setItem("certificate-draft", JSON.stringify(draft));
    router.push("/dashboard/certificates/new/preview");
  }

  const isStudentType =
    form.recipientType === "student" || form.recipientType === "student_female";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6" dir="rtl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-sky-700">الشهادات والتكريم</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950">إنشاء شهادة شكر</h1>
            <p className="mt-2 text-sm text-slate-500">أدخل البيانات ثم انتقل للمعاينة قبل الإصدار.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/certificates")}
            className="h-10 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-600"
          >
            العودة للأرشيف
          </button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">بيانات الشهادة</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">نوع المستفيد</span>
              <select
                value={form.recipientType}
                onChange={(event) => update("recipientType", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              >
                {CERTIFICATE_RECIPIENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">نوع الشهادة</span>
              <select
                value={form.certificateType}
                onChange={(event) => update("certificateType", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              >
                {CERTIFICATE_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            {isStudentType ? (
              <div className="relative space-y-2 md:col-span-2">
                <span className="text-sm font-bold text-slate-700">بحث في بيانات الطلاب</span>
                <input
                  value={studentQuery}
                  onChange={(event) => setStudentQuery(event.target.value)}
                  placeholder="اكتب اسم الطالب أو رقم الهوية..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
                />

                {(students.length > 0 || studentLoading) && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {studentLoading ? (
                      <div className="p-4 text-sm text-slate-500">جاري البحث...</div>
                    ) : (
                      students.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => selectStudent(student)}
                          className="block w-full border-b border-slate-100 p-4 text-right last:border-0 hover:bg-slate-50"
                        >
                          <p className="text-sm font-bold text-slate-900">{student.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {student.grade || "بدون صف"} · {student.classroom || "بدون فصل"}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">اسم المستفيد</span>
              <input
                value={form.recipientName}
                onChange={(event) => update("recipientName", event.target.value)}
                placeholder="مثال: محمد أحمد"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">رقم الهوية / السجل</span>
              <input
                value={form.recipientIdentity || ""}
                onChange={(event) => update("recipientIdentity", event.target.value)}
                placeholder="اختياري"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">الصف</span>
              <input
                value={form.grade || ""}
                onChange={(event) => update("grade", event.target.value)}
                placeholder="اختياري"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">الفصل</span>
              <input
                value={form.classroom || ""}
                onChange={(event) => update("classroom", event.target.value)}
                placeholder="اختياري"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">سبب التكريم</span>
              <input
                value={form.reason || ""}
                onChange={(event) => update("reason", event.target.value)}
                placeholder="مثال: المشاركة المتميزة في البرنامج"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">نص الشهادة</span>
              <textarea
                value={form.body || ""}
                onChange={(event) => update("body", event.target.value)}
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">تاريخ الإصدار</span>
              <input
                type="date"
                value={form.issueDate}
                onChange={(event) => update("issueDate", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">اسم المدير</span>
              <input
                value={form.principalName || ""}
                onChange={(event) => update("principalName", event.target.value)}
                placeholder="اختياري"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:bg-white"
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={goPreview}
              disabled={!form.recipientName.trim()}
              className="h-11 rounded-full bg-slate-950 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              معاينة الشهادة
            </button>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-950">المسار</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="rounded-2xl bg-sky-50 p-4 font-bold text-sky-800">1. البيانات</div>
            <div className="rounded-2xl bg-slate-50 p-4 text-slate-500">2. المعاينة</div>
            <div className="rounded-2xl bg-slate-50 p-4 text-slate-500">3. الإصدار والأرشفة</div>
          </div>

          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-7 text-emerald-900">
            القالب موحد ورسمي. التعديل متاح فقط على بيانات الشهادة ونصها.
          </div>
        </aside>
      </section>
    </main>
  );
}