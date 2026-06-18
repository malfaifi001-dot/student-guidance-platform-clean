"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  CalendarDays,
  FileText,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import {
  CERTIFICATE_RECIPIENT_TYPES,
  CERTIFICATE_TYPES,
  getCertificateTypeLabel,
  getRecipientPrefix,
} from "@/lib/certificates/certificate-types";

type StudentSearchResult = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  gender?: string | null;
};

type CertificateDraft = {
  recipientType: string;
  recipientName: string;
  studentId?: string | null;
  nationalId?: string;
  grade?: string;
  classroom?: string;
  certificateType: string;
  reason: string;
  body: string;
  issueDate: string;
  principalName?: string;
  issuerName?: string;
};

const DRAFT_STORAGE_KEY = "certificate-draft";

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildAutoBody(draft: CertificateDraft) {
  const prefix = getRecipientPrefix(draft.recipientType);
  const typeLabel = getCertificateTypeLabel(draft.certificateType);
  const reason = draft.reason.trim();

  if (reason) {
    return `تتقدم إدارة المدرسة بخالص ${typeLabel} إلى ${prefix} ${draft.recipientName || "المستفيد"}، وذلك نظير ${reason}، سائلين الله له دوام التوفيق والتميز.`;
  }

  return `تتقدم إدارة المدرسة بخالص ${typeLabel} إلى ${prefix} ${draft.recipientName || "المستفيد"}، تقديرًا لجهوده وتميزه، سائلين الله له دوام التوفيق والنجاح.`;
}

function isStudentRecipient(value: string) {
  return value === "student" || value === "student_female";
}

export function NewCertificateForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<CertificateDraft>({
    recipientType: "student",
    recipientName: "",
    studentId: null,
    nationalId: "",
    grade: "",
    classroom: "",
    certificateType: "thanks",
    reason: "",
    body: "",
    issueDate: getTodayInputDate(),
    principalName: "",
    issuerName: "",
  });

  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);
  const [error, setError] = useState("");

  const autoBody = useMemo(() => buildAutoBody(draft), [draft]);

  useEffect(() => {
    if (bodyTouched) return;

    setDraft((current) => {
      const nextBody = buildAutoBody(current);

      if (current.body === nextBody) {
        return current;
      }

      return {
        ...current,
        body: nextBody,
      };
    });
  }, [
    bodyTouched,
    draft.recipientType,
    draft.recipientName,
    draft.certificateType,
    draft.reason,
  ]);

  useEffect(() => {
    let ignore = false;

    async function searchStudents() {
      if (!isStudentRecipient(draft.recipientType) || studentQuery.trim().length < 2) {
        setStudentResults([]);
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
          setStudentResults(Array.isArray(data.items) ? data.items : []);
        }
      } catch {
        if (!ignore) {
          setStudentResults([]);
        }
      } finally {
        if (!ignore) {
          setStudentLoading(false);
        }
      }
    }

    const timer = window.setTimeout(searchStudents, 300);

    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [studentQuery, draft.recipientType]);

  function updateDraft<K extends keyof CertificateDraft>(
    key: K,
    value: CertificateDraft[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function selectStudent(student: StudentSearchResult) {
    setDraft((current) => ({
      ...current,
      studentId: student.id,
      recipientName: student.fullName || current.recipientName,
      nationalId: student.nationalId || "",
      grade: student.grade || "",
      classroom: student.classroom || "",
    }));

    setStudentQuery(student.fullName || "");
    setStudentResults([]);
    setBodyTouched(false);
  }

  function goToPreview() {
    setError("");

    if (!draft.recipientName.trim()) {
      setError("اكتب اسم المستفيد قبل المتابعة.");
      return;
    }

    if (!draft.reason.trim()) {
      setError("اكتب سبب التكريم قبل المتابعة.");
      return;
    }

    const finalDraft = {
      ...draft,
      body: draft.body.trim() || autoBody,
    };

    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(finalDraft));
    router.push("/dashboard/certificates/new/preview");
  }

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="text-sm font-black text-sky-100">Certificates Runtime</p>
            <h1 className="mt-3 text-4xl font-black">إنشاء شهادة جديدة</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-sky-50">
              أدخل بيانات المستفيد، ثم راجع المعاينة قبل إصدار الشهادة.
            </p>
          </div>

          <Link
            href="/dashboard/certificates"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للأرشيف
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400">الخطوة الأولى</p>
              <p className="mt-1 text-2xl font-black text-slate-950">المستفيد</p>
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400">الخطوة الثانية</p>
              <p className="mt-1 text-2xl font-black text-slate-950">الشهادة</p>
            </div>
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400">الخطوة الثالثة</p>
              <p className="mt-1 text-2xl font-black text-slate-950">المعاينة</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-black text-sky-700">بيانات المستفيد</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                لمن ستصدر الشهادة؟
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                اختر نوع المستفيد، واكتب اسمه أو ابحث عنه من بيانات الطلاب.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">نوع المستفيد</span>
                <select
                  value={draft.recipientType}
                  onChange={(event) => {
                    updateDraft("recipientType", event.target.value);
                    updateDraft("studentId", null);
                    setStudentResults([]);
                    setBodyTouched(false);
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-sky-200 focus:bg-white"
                >
                  {CERTIFICATE_RECIPIENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">اسم المستفيد</span>
                <input
                  value={draft.recipientName}
                  onChange={(event) => {
                    updateDraft("recipientName", event.target.value);
                    setBodyTouched(false);
                  }}
                  placeholder="اكتب الاسم كاملًا"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
                />
              </label>
            </div>

            {isStudentRecipient(draft.recipientType) ? (
              <div className="mt-5 rounded-[2rem] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3">
                  <p className="text-sm font-black text-slate-900">بحث بيانات الطلاب</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    بحث بسيط بالاسم أو الهوية أو الصف.
                  </p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={studentQuery}
                    onChange={(event) => setStudentQuery(event.target.value)}
                    placeholder="ابحث عن طالب..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200"
                  />
                </div>

                {studentLoading ? (
                  <p className="mt-3 text-xs font-bold text-slate-500">جاري البحث...</p>
                ) : null}

                {studentResults.length ? (
                  <div className="mt-3 grid gap-2">
                    {studentResults.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => selectStudent(student)}
                        className="rounded-2xl border border-slate-200 bg-white p-3 text-right transition hover:border-sky-200 hover:bg-sky-50"
                      >
                        <p className="text-sm font-black text-slate-950">
                          {student.fullName}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {student.grade || "الصف غير محدد"} · {student.classroom || "الفصل غير محدد"} · {student.nationalId || "بدون هوية"}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">الصف</span>
                <input
                  value={draft.grade || ""}
                  onChange={(event) => updateDraft("grade", event.target.value)}
                  disabled={!isStudentRecipient(draft.recipientType)}
                  placeholder="اختياري"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition disabled:opacity-50 focus:border-sky-200 focus:bg-white"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">الفصل</span>
                <input
                  value={draft.classroom || ""}
                  onChange={(event) => updateDraft("classroom", event.target.value)}
                  disabled={!isStudentRecipient(draft.recipientType)}
                  placeholder="اختياري"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition disabled:opacity-50 focus:border-sky-200 focus:bg-white"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">الهوية / السجل</span>
                <input
                  value={draft.nationalId || ""}
                  onChange={(event) => updateDraft("nationalId", event.target.value)}
                  placeholder="اختياري"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-200 focus:bg-white"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-black text-sky-700">بيانات الشهادة</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                سبب التكريم والنص
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">نوع الشهادة</span>
                <select
                  value={draft.certificateType}
                  onChange={(event) => {
                    updateDraft("certificateType", event.target.value);
                    setBodyTouched(false);
                  }}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 outline-none transition focus:border-sky-200 focus:bg-white"
                >
                  {CERTIFICATE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">تاريخ الإصدار</span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={draft.issueDate}
                    onChange={(event) => updateDraft("issueDate", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-200 focus:bg-white"
                  />
                </div>
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-xs font-black text-slate-500">سبب التكريم</span>
              <input
                value={draft.reason}
                onChange={(event) => {
                  updateDraft("reason", event.target.value);
                  setBodyTouched(false);
                }}
                placeholder="مثال: المشاركة الفاعلة في أنشطة المدرسة"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-xs font-black text-slate-500">نص الشهادة</span>
              <textarea
                value={draft.body || autoBody}
                onChange={(event) => {
                  updateDraft("body", event.target.value);
                  setBodyTouched(true);
                }}
                rows={5}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-800 outline-none transition focus:border-sky-200 focus:bg-white"
              />
            </label>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-sky-700">ملخص سريع</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              قبل المعاينة
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">المستفيد</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {draft.recipientName || "لم يتم الإدخال"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">نوع الشهادة</p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  {getCertificateTypeLabel(draft.certificateType)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <p className="text-xs font-black text-slate-400">سبب التكريم</p>
                <p className="mt-1 text-sm font-bold leading-7 text-slate-600">
                  {draft.reason || "لم يتم الإدخال"}
                </p>
              </div>
            </div>

            {error ? (
              <div className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={goToPreview}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
            >
              معاينة الشهادة
              <FileText className="h-4 w-4" />
            </button>
          </section>
        </aside>
      </section>
    </main>
  );
}