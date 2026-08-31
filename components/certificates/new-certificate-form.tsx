"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Search,
  UserRound,
} from "lucide-react";
import {
  CERTIFICATE_RECIPIENT_TYPES,
  CERTIFICATE_TYPES,
} from "@/lib/certificates/certificate-types";
import { buildCertificateIntro, buildCertificateRecognition } from "@/lib/certificates/certificate-copy";
import { CertificateTemplateSelector } from "@/components/certificates/certificate-template-preview";
import { CertificateWizardActionRow } from "@/components/certificates/certificate-wizard-action-row";
import { CertificateWizardNavigation } from "@/components/certificates/certificate-wizard-navigation";

type StudentSearchResult = {
  id: string;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  gender?: string | null;
};

type CertificateDraft = {
  templateKey: string;
  recipientType: string;
  recipientName: string;
  studentId?: string | null;
  nationalId?: string;
  grade?: string;
  classroom?: string;
  certificateType: string;
  reason: string;
  body: string;
  introText: string;
  bodyText: string;
  issueDate: string;
  principalName?: string;
  issuerName?: string;
  schoolName?: string;
};

export const CERTIFICATE_DRAFT_STORAGE_KEY = "teachix:certificates:new-draft:v1";
const LEGACY_DRAFT_STORAGE_KEY = "certificate-draft";

const DEFAULT_DRAFT: CertificateDraft = {
  templateKey: "certificate-modern-blue",
  recipientType: "student",
  recipientName: "",
  studentId: null,
  nationalId: "",
  grade: "",
  classroom: "",
  certificateType: "thanks",
  reason: "",
  body: "",
  introText: "",
  bodyText: "",
  issueDate: getTodayInputDate(),
  principalName: "",
  issuerName: "",
};

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildAutoIntro(schoolName: string) {
  return buildCertificateIntro(schoolName);
}

function buildAutoBody(draft: CertificateDraft) {
  return buildCertificateRecognition(draft);
}

function isStudentRecipient(value: string) {
  return value === "student" || value === "student_female";
}

export function NewCertificateForm({ schoolName = "" }: { schoolName?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<CertificateDraft>(DEFAULT_DRAFT);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<StudentSearchResult[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [introTouched, setIntroTouched] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<1 | 2>(searchParams.get("step") === "2" ? 2 : 1);
  const [draftHydrated, setDraftHydrated] = useState(false);

  const autoBody = useMemo(() => buildAutoBody(draft), [draft]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CERTIFICATE_DRAFT_STORAGE_KEY)
        || window.sessionStorage.getItem(LEGACY_DRAFT_STORAGE_KEY);

      if (raw) {
        const saved = JSON.parse(raw) as Partial<CertificateDraft> & { introTouched?: boolean; bodyTouched?: boolean; step?: number };
        const { bodyTouched: savedBodyTouched, step: savedStep, ...savedDraft } = saved;
        const hydratedDraft = { ...DEFAULT_DRAFT, ...savedDraft };
        setDraft({
          ...hydratedDraft,
          introText: String(savedDraft.introText || "").trim(),
          bodyText: String(savedDraft.bodyText || savedDraft.body || "").trim(),
        });
        setIntroTouched(savedDraft.introTouched === true);
        setBodyTouched(savedBodyTouched === true);

        if (searchParams.get("step") !== "2") {
          setStep(savedStep === 2 ? 2 : 1);
        }
      }
    } catch {
      // Ignore malformed or unavailable browser storage and keep a fresh draft.
    } finally {
      setDraftHydrated(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!draftHydrated) return;

    try {
      window.localStorage.setItem(
        CERTIFICATE_DRAFT_STORAGE_KEY,
        JSON.stringify({ ...draft, body: draft.bodyText, introTouched, bodyTouched, step }),
      );
    } catch {
      // Storage can be unavailable in private browsing; the in-memory draft remains usable.
    }
  }, [bodyTouched, draft, draftHydrated, step]);

  useEffect(() => {
    if (!draftHydrated || introTouched) return;

    setDraft((current) => {
      const nextIntro = buildAutoIntro(schoolName);
      return current.introText === nextIntro ? current : { ...current, introText: nextIntro };
    });
  }, [draftHydrated, introTouched, schoolName]);

  useEffect(() => {
    if (!draftHydrated || bodyTouched) return;

    setDraft((current) => {
      const nextBody = buildAutoBody(current);

      if (current.bodyText === nextBody && current.body === nextBody) {
        return current;
      }

      return {
        ...current,
        body: nextBody,
        bodyText: nextBody,
      };
    });
  }, [
    bodyTouched,
    draft.recipientType,
    draft.recipientName,
    draft.certificateType,
    draft.reason,
    draft.bodyText,
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
  }

  function validateRecipientStep() {
    setError("");

    if (!draft.recipientName.trim()) {
      setError("اكتب اسم المستفيد قبل المتابعة.");
      return false;
    }

    return true;
  }

  function validateCertificateStep() {
    setError("");

    if (!draft.reason.trim()) {
      setError("اكتب سبب التكريم قبل المتابعة.");
      return false;
    }

    return true;
  }

  function goToCertificateStep() {
    if (validateRecipientStep()) {
      setStep(2);
    }
  }

  function goToPreview() {
    if (!validateCertificateStep()) return;

    const finalDraft = {
      ...draft,
      body: draft.bodyText.trim() || autoBody,
      bodyText: draft.bodyText.trim() || autoBody,
    };

    try {
      window.localStorage.setItem(
        CERTIFICATE_DRAFT_STORAGE_KEY,
        JSON.stringify({ ...finalDraft, bodyTouched, step: 2 }),
      );
    } catch {
      // The preview route can still use the in-memory navigation fallback if storage is unavailable.
    }
    router.push("/dashboard/certificates/new/preview");
  }

  function goBackToRecipientStep() {
    setError("");
    setStep(1);
  }

  return (
    <main className="space-y-7" dir="rtl">
      <section className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-4 text-white shadow-xl sm:rounded-[2.5rem] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="text-2xl font-black sm:text-4xl">إنشاء شهادة جديدة</h1>
          </div>

          <Link
            href="/dashboard/certificates"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-sky-800 transition hover:bg-sky-50 sm:w-auto"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للأرشيف
          </Link>
        </div>
      </section>

      <CertificateWizardNavigation
        currentStep={step}
        onStepSelect={(selectedStep) => {
          if (selectedStep === 1) goBackToRecipientStep();
          if (selectedStep === 2 && validateRecipientStep()) setStep(2);
        }}
      />

      <div className="w-full space-y-5">
          {step === 1 ? <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
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

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">الصف</span>
                <input
                  value={draft.grade || ""}
                  onChange={(event) => updateDraft("grade", event.target.value)}
                  disabled={!isStudentRecipient(draft.recipientType)}
                  placeholder="اختياري"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition disabled:opacity-50 focus:border-sky-200 focus:bg-white"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">الفصل</span>
                <input
                  value={draft.classroom || ""}
                  onChange={(event) => updateDraft("classroom", event.target.value)}
                  disabled={!isStudentRecipient(draft.recipientType)}
                  placeholder="اختياري"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition disabled:opacity-50 focus:border-sky-200 focus:bg-white"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">الهوية / السجل</span>
                <input
                  value={draft.nationalId || ""}
                  onChange={(event) => updateDraft("nationalId", event.target.value)}
                  placeholder="اختياري"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-200 focus:bg-white"
                />
              </label>
            </div>
          </section> : null}

          {step === 2 ? <>
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
          <div className="grid items-start gap-6 md:grid-cols-2">
          <div>
            <div className="mb-5">
              <p className="text-xs font-black text-sky-700">بيانات الشهادة</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                نوع الشهادة وسبب التكريم
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black text-slate-500">نوع الشهادة</span>
                <select
                  value={draft.certificateType}
                  onChange={(event) => {
                    updateDraft("certificateType", event.target.value);
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
                }}
                placeholder="مثال: المشاركة الفاعلة في أنشطة المدرسة"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-200 focus:bg-white"
              />
            </label>

          </div>

          <div>
            <div className="mb-5">
              <p className="text-xs font-black text-sky-700">نص الشهادة</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">النص القابل للتحرير</h2>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-black text-slate-500">المقدمة</span>
              <textarea
                value={draft.introText || buildAutoIntro(schoolName)}
                onChange={(event) => {
                  updateDraft("introText", event.target.value);
                  setIntroTouched(true);
                }}
                rows={2}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-800 outline-none transition focus:border-sky-200 focus:bg-white"
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-xs font-black text-slate-500">الاسم</span>
              <input value={draft.recipientName} readOnly className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-black text-slate-800" />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-xs font-black text-slate-500">نص التكريم</span>
              <textarea
              value={draft.bodyText || buildAutoBody(draft)}
              onChange={(event) => {
                updateDraft("body", event.target.value);
                updateDraft("bodyText", event.target.value);
                setBodyTouched(true);
              }}
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-7 text-slate-800 outline-none transition focus:border-sky-200 focus:bg-white"
            />
            </label>
          </div>
          </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2.5rem] sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-black text-sky-700">تصميم الشهادة</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                اختر القالب المناسب
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                سيظهر التصميم المختار في المعاينة النهائية والشهادة الصادرة.
              </p>
            </div>
            <CertificateTemplateSelector
              value={draft.templateKey}
              onChange={(templateKey) => updateDraft("templateKey", templateKey)}
            />
          </section>

          {error ? (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          ) : null}

          <CertificateWizardActionRow
            primaryLabel="معاينة الشهادة"
            onPrimary={goToPreview}
            primaryIcon={<FileText className="h-4 w-4" />}
            secondaryLabel="السابق"
            onSecondary={goBackToRecipientStep}
          />
          </> : null}

          {step === 1 ? (
            <>
              {error ? (
                <div className="rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
                  {error}
                </div>
              ) : null}
              <CertificateWizardActionRow
                primaryLabel="التالي"
                onPrimary={goToCertificateStep}
              />
            </>
          ) : null}
      </div>
    </main>
  );
}
