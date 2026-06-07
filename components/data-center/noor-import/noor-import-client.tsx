"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { readApiResponse } from "@/lib/http/read-api-response";

type ImportRow = {
  id: string;
  rowIndex: number;
  status: string;
  planAction?: string | null;
  fullName: string;
  nationalId?: string | null;
  stage?: string | null;
  grade?: string | null;
  classroom?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  errorMessage?: string | null;
  rawJson?: {
    guardianNeedsReview?: boolean;
    warnings?: string[];
    errors?: string[];
  } | null;
};

type ImportSession = {
  id: string;
  title: string;
  status: string;
  source?: string | null;
  academicYear?: string | null;
  term?: string | null;
  importMode?: string | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  conflictCount?: number;
  isArchived?: boolean;
  committedAt?: string | null;
  createdAt: string;
  rowCount?: number;
  rows?: ImportRow[];
  files?: Array<{
    fileName: string;
    rowCount: number;
  }>;
};

type ParsedSummary = {
  detectedFormat: string;
  sheetsCount: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  conflictCount?: number;
  warningsCount: number;
  schoolName?: string | null;
  grades: string[];
  classrooms: string[];
  planSummary?: Record<string, number>;
};

type NoorImportClientProps = {
  schoolName: string;
};

type FeedbackState = {
  type: "success" | "error" | "info";
  text: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: "مسودة",
  PARSED: "جاهزة للمراجعة",
  COMMITTED: "معتمدة",
  FAILED: "فشلت",
  CANCELED: "ملغاة",
  VALID: "صالح",
  INVALID: "يحتاج مراجعة",
  CREATED: "تم الإنشاء",
  UPDATED: "تم التحديث",
  SKIPPED: "بدون تغيير",
  CONFLICT: "تعارض",
};

const termOptions = [
  "الفصل الدراسي الأول",
  "الفصل الدراسي الثاني",
  "الفصل الدراسي الثالث",
];

const planLabels: Record<string, string> = {
  NEW: "جديد",
  UPDATE: "سيتم تحديثه",
  UNCHANGED: "بدون تغيير",
  DUPLICATE_IN_FILE: "مكرر",
  NEEDS_REVIEW: "يحتاج مراجعة",
};

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusClass(status: string) {
  if (["COMMITTED", "CREATED", "UPDATED", "VALID"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["INVALID", "FAILED", "CONFLICT"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getPlanCards(summary?: Record<string, number>) {
  return [
    { key: "NEW", label: "طلاب جدد", value: summary?.NEW ?? 0 },
    { key: "UPDATE", label: "سيتم تحديثهم", value: summary?.UPDATE ?? 0 },
    { key: "UNCHANGED", label: "بدون تغيير", value: summary?.UNCHANGED ?? 0 },
    { key: "DUPLICATE_IN_FILE", label: "مكررون", value: summary?.DUPLICATE_IN_FILE ?? 0 },
    { key: "NEEDS_REVIEW", label: "يحتاجون مراجعة", value: summary?.NEEDS_REVIEW ?? 0 },
  ];
}

function defaultAcademicYear() {
  return "1447";
}

export function NoorImportClient({ schoolName }: NoorImportClientProps) {
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [term, setTerm] = useState(termOptions[0]);
  const [file, setFile] = useState<File | null>(null);
  const [currentSession, setCurrentSession] = useState<ImportSession | null>(null);
  const [parsedSummary, setParsedSummary] = useState<ParsedSummary | null>(null);
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const canUpload = academicYear.trim().length > 0 && term.trim().length > 0 && file !== null;

  const previewRows = currentSession?.rows ?? [];

  const previewStats = useMemo(() => {
    if (!currentSession) {
      return [];
    }

    return [
      { label: "إجمالي الطلاب", value: currentSession.totalRows },
      { label: "صالح", value: currentSession.validRows },
      { label: "يحتاج مراجعة", value: currentSession.invalidRows },
      { label: "تعارض", value: currentSession.conflictCount ?? 0 },
      { label: "معروض هنا", value: previewRows.length },
    ];
  }, [currentSession, previewRows.length]);

  async function loadSessions() {
    const response = await fetch("/api/dashboard/data-center/noor-import/sessions", {
      cache: "no-store",
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(result.error || "تعذر جلب جلسات الاستيراد.");
    }

    setSessions(result.sessions ?? []);
  }

  useEffect(() => {
    loadSessions().catch(() => undefined);
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!academicYear.trim()) {
      setFeedback({
        type: "error",
        text: "حدد السنة الدراسية قبل رفع ملف بيانات الطلاب.",
      });
      return;
    }

    if (!term.trim()) {
      setFeedback({
        type: "error",
        text: "حدد الفصل الدراسي قبل رفع ملف بيانات الطلاب.",
      });
      return;
    }

    if (!file) {
      setFeedback({
        type: "error",
        text: "اختر ملف Excel صادر من ملف الطلاب أولًا.",
      });
      return;
    }

    setIsUploading(true);
    setFeedback({
      type: "info",
      text: "جاري قراءة ملف بيانات الطلاب وإنشاء جلسة مراجعة...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("academicYear", academicYear.trim());
      formData.append("term", term.trim());

      const response = await fetch("/api/dashboard/data-center/noor-import/preview", {
        method: "POST",
        body: formData,
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر قراءة ملف بيانات الطلاب.");
      }

      setCurrentSession(result.session);
      setParsedSummary(result.parsedSummary);
      setFeedback({
        type: "success",
        text: "تم إنشاء جلسة مراجعة. افتح تفاصيل الجلسة لمراجعة الطلاب قبل الاعتماد.",
      });

      await loadSessions();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر رفع الملف.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-right text-slate-950 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-6 md:p-8">
            <p className="text-sm font-black text-sky-700">مركز بيانات المدرسة</p>
            <h1 className="mt-2 text-2xl font-black md:text-4xl">مركز استيراد بيانات الطلاب</h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-slate-600">
              أنشئ جلسة استيراد لكل سنة وفصل دراسي، ثم راجع الطلاب والتحديثات قبل اعتمادها في سجل مدرسة {schoolName}.
            </p>
          </div>
        </section>

        {feedback ? (
          <section
            className={[
              "rounded-3xl border px-5 py-4 text-sm font-bold leading-7 shadow-sm",
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : feedback.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-sky-200 bg-sky-50 text-sky-800",
            ].join(" ")}
          >
            {feedback.text}
          </section>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.15fr]">
          <form onSubmit={handleUpload} className="space-y-5">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700">
                  1
                </span>
                <div>
                  <h2 className="text-lg font-black">بيانات فترة الاستيراد</h2>
                  <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                    كل ملف بيانات الطلاب يجب أن يُحفظ داخل سنة وفصل دراسي حتى يسهل تحديث الطلاب سنويًا.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black text-slate-500">السنة الدراسية</span>
                  <input
                    value={academicYear}
                    onChange={(event) => setAcademicYear(event.target.value)}
                    placeholder="مثال: 1447"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black text-slate-500">الفصل الدراسي</span>
                  <select
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
                  >
                    {termOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700">
                  2
                </span>
                <div>
                  <h2 className="text-lg font-black">رفع ملف بيانات الطلاب</h2>
                  <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                    ارفع كشف بيانات الطلاب من ملف الطلاب. لن يتم تعديل سجل الطلاب إلا بعد فتح الجلسة واعتمادها.
                  </p>
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center transition hover:border-sky-300 hover:bg-sky-50">
                <span className="text-base font-black text-slate-800">
                  {file ? file.name : "اختر ملف Excel"}
                </span>
                <span className="mt-2 text-xs font-bold text-slate-500">xlsx / xls</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <button
                type="submit"
                disabled={!canUpload || isUploading}
                className="mt-5 w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? "جاري إنشاء الجلسة..." : "إنشاء جلسة مراجعة"}
              </button>

              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800">
                سيتم استنتاج ولي الأمر تلقائيًا من اسم الطالب بحذف الاسم الأول. يمكن تعديل الحالات الشاذة لاحقًا من سجل الطلاب.
              </div>
            </section>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 text-sm font-black text-emerald-700">
                3
              </span>
              <div>
                <h2 className="text-lg font-black">الجلسة التي تم إنشاؤها الآن</h2>
                <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                  بعد إنشاء الجلسة، افتح تفاصيلها لمراجعة كل الطلاب قبل الاعتماد.
                </p>
              </div>
            </div>

            {currentSession ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-black text-emerald-800">
                    تم إنشاء جلسة مراجعة لـ {currentSession.academicYear || academicYear} · {currentSession.term || term}
                  </p>
                  <p className="mt-1 text-xs font-bold text-emerald-700">
                    افتح التفاصيل لمراجعة جميع الطلاب، الفلاتر، والتحديثات قبل الاعتماد.
                  </p>
                </div>

                {parsedSummary ? (
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">الشيتات</p>
                      <p className="mt-1 text-2xl font-black">{parsedSummary.sheetsCount}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">الطلاب</p>
                      <p className="mt-1 text-2xl font-black">{parsedSummary.totalRows}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">الصفوف</p>
                      <p className="mt-1 text-2xl font-black">{parsedSummary.grades.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">الفصول</p>
                      <p className="mt-1 text-2xl font-black">{parsedSummary.classrooms.length}</p>
                    </div>
                  </div>
                ) : null}

                {parsedSummary?.planSummary ? (
                  <div className="grid gap-3 md:grid-cols-5">
                    {getPlanCards(parsedSummary.planSummary).map((item) => (
                      <div key={item.key} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-black text-slate-400">{item.label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/data-center/noor-import/sessions/${currentSession.id}`}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    فتح تفاصيل الجلسة
                  </Link>

                  <Link
                    href="/dashboard/data-center/noor-import/sessions"
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    آخر جلسة محفوظة
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                لم يتم إنشاء جلسة مراجعة بعد.
              </div>
            )}
          </section>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black">سجل استيرادات بيانات الطلاب السابقة</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                كل سنة وفصل لها جلسة مستقلة. افتح الجلسة لمراجعة التفاصيل أو الاعتماد أو الأرشفة.
              </p>
            </div>

            <Link
              href="/dashboard/data-center/noor-import/sessions"
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 hover:bg-sky-100"
            >
              فتح آخر جلسة
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {sessions.length ? (
              sessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-3xl border border-slate-100 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={["rounded-full border px-3 py-1 text-xs font-black", getStatusClass(session.status)].join(" ")}>
                          {statusLabel[session.status] || session.status}
                        </span>

                        {session.isArchived ? (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                            مؤرشفة
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-base font-black text-slate-950">
                        {session.academicYear || "سنة غير محددة"} · {session.term || "فصل غير محدد"}
                      </h3>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {session.files?.[0]?.fileName || "ملف بيانات الطلاب"} · {session.totalRows} طالب/طالبة · {formatDate(session.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                        صالح: {session.validRows}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                        جديد: {session.createdCount}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                        محدث: {session.updatedCount}
                      </span>

                      <Link
                        href={`/dashboard/data-center/noor-import/sessions/${session.id}`}
                        className="rounded-full border border-sky-200 bg-white px-4 py-1 text-xs font-black text-sky-700 hover:bg-sky-50"
                      >
                        فتح الجلسة
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                لا توجد جلسات استيراد سابقة.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
