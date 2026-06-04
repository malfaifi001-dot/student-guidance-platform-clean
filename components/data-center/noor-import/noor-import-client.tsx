"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ImportRow = {
  id: string;
  rowIndex: number;
  status: string;
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
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  conflictCount?: number;
  committedAt?: string | null;
  createdAt: string;
  rowCount?: number;
  rows: ImportRow[];
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
  warningsCount: number;
  schoolName?: string | null;
  grades: string[];
  classrooms: string[];
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
  PARSED: "جاهزة للمعاينة",
  COMMITTED: "معتمدة",
  FAILED: "فشلت",
  CANCELED: "ملغاة",
  VALID: "صالح",
  INVALID: "يحتاج مراجعة",
  CREATED: "تم الإنشاء",
  UPDATED: "تم التحديث",
  SKIPPED: "متجاوز",
  CONFLICT: "تعارض",
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

export function NoorImportClient({ schoolName }: NoorImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [currentSession, setCurrentSession] = useState<ImportSession | null>(null);
  const [parsedSummary, setParsedSummary] = useState<ParsedSummary | null>(null);
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  const rows = currentSession?.rows ?? [];

  const canCommit =
    currentSession !== null &&
    currentSession.status !== "COMMITTED" &&
    currentSession.validRows > 0 &&
    !isCommitting;

  const sessionStats = useMemo(() => {
    if (!currentSession) {
      return [];
    }

    return [
      { label: "إجمالي الطلاب", value: currentSession.totalRows },
      { label: "صفوف صالحة", value: currentSession.validRows },
      { label: "تحتاج مراجعة", value: currentSession.invalidRows },
      { label: "تم إنشاؤهم", value: currentSession.createdCount },
      { label: "تم تحديثهم", value: currentSession.updatedCount },
    ];
  }, [currentSession]);

  async function loadSessions() {
    const response = await fetch("/api/dashboard/data-center/noor-import/sessions", {
      cache: "no-store",
    });

    const result = await response.json();

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

    if (!file) {
      setFeedback({
        type: "error",
        text: "اختر ملف Excel صادر من نور أولًا.",
      });
      return;
    }

    setIsUploading(true);
    setFeedback({
      type: "info",
      text: "جاري قراءة ملف نور وإنشاء المعاينة...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/dashboard/data-center/noor-import/preview", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر قراءة ملف نور.");
      }

      setCurrentSession(result.session);
      setParsedSummary(result.parsedSummary);
      setFeedback({
        type: "success",
        text: result.message || "تم إنشاء معاينة ملف نور بنجاح.",
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

  async function handleCommit() {
    if (!currentSession) {
      return;
    }

    setIsCommitting(true);
    setFeedback({
      type: "info",
      text: "جاري اعتماد بيانات نور وربط الطلاب وأولياء الأمور...",
    });

    try {
      const response = await fetch(
        `/api/dashboard/data-center/noor-import/${currentSession.id}/commit`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر اعتماد جلسة الاستيراد.");
      }

      setCurrentSession(result.session);
      setFeedback({
        type: "success",
        text: result.message || "تم اعتماد بيانات نور بنجاح.",
      });

      await loadSessions();
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر اعتماد جلسة الاستيراد.",
      });
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-right text-slate-950 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-6 md:p-8">
            <p className="text-sm font-black text-sky-700">مركز بيانات المدرسة</p>
            <h1 className="mt-2 text-2xl font-black md:text-4xl">رفع بيانات نور</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
              ارفع كشف بيانات الطلاب من نور، راجع المعاينة والتحقق، ثم اعتمد البيانات لربط الطلاب وأولياء الأمور بمدرسة {schoolName}.
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

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
          <form onSubmit={handleUpload} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">1. رفع ملف نور</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
              يدعم كشف بيانات الطلاب من نور حتى لو كان مقسمًا على عدة شيتات وصفوف علوية قبل الجدول.
            </p>

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
              disabled={isUploading}
              className="mt-5 w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "جاري إنشاء المعاينة..." : "إنشاء المعاينة"}
            </button>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800">
              سيتم استنتاج ولي الأمر تلقائيًا من اسم الطالب بحذف الاسم الأول. مثال: محمد حسين أسعد الفيفي ← حسين أسعد الفيفي.
            </div>
          </form>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <h2 className="text-lg font-black">2. المعاينة والتحقق</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                  لن يتم حفظ الطلاب فعليًا إلا بعد الضغط على اعتماد الاستيراد.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCommit}
                disabled={!canCommit}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCommitting ? "جاري الاعتماد..." : "اعتماد الاستيراد"}
              </button>
            </div>

            {parsedSummary ? (
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">عدد الشيتات</p>
                  <p className="mt-1 text-2xl font-black">{parsedSummary.sheetsCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">الصفوف</p>
                  <p className="mt-1 text-2xl font-black">{parsedSummary.grades.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">الفصول</p>
                  <p className="mt-1 text-2xl font-black">{parsedSummary.classrooms.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">تحذيرات</p>
                  <p className="mt-1 text-2xl font-black">{parsedSummary.warningsCount}</p>
                </div>
              </div>
            ) : null}

            {currentSession ? (
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {sessionStats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-black text-slate-400">{item.label}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                لم يتم إنشاء معاينة بعد.
              </div>
            )}

            {rows.length ? (
              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[900px] border-collapse text-sm">
                    <thead className="sticky top-0 bg-slate-100 text-xs font-black text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-right">#</th>
                        <th className="px-4 py-3 text-right">اسم الطالب/الطالبة</th>
                        <th className="px-4 py-3 text-right">الهوية</th>
                        <th className="px-4 py-3 text-right">الصف</th>
                        <th className="px-4 py-3 text-right">الفصل</th>
                        <th className="px-4 py-3 text-right">ولي الأمر المستنتج</th>
                        <th className="px-4 py-3 text-right">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row) => (
                        <tr key={row.id} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-400">{row.rowIndex}</td>
                          <td className="px-4 py-3 font-black">{row.fullName}</td>
                          <td className="px-4 py-3 font-bold text-slate-600">{row.nationalId || "—"}</td>
                          <td className="px-4 py-3 font-bold text-slate-600">{row.grade || "—"}</td>
                          <td className="px-4 py-3 font-bold text-slate-600">{row.classroom || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-700">{row.guardianName || "غير متوفر"}</div>
                            {row.rawJson?.guardianNeedsReview ? (
                              <div className="mt-1 text-xs font-bold text-amber-600">
                                يحتاج مراجعة لاحقًا
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", getStatusClass(row.status)].join(" ")}>
                              {statusLabel[row.status] || row.status}
                            </span>
                            {row.errorMessage ? (
                              <p className="mt-1 max-w-xs text-xs font-bold leading-5 text-slate-500">
                                {row.errorMessage}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">جلسات الاستيراد السابقة</h2>

          <div className="mt-4 grid gap-3">
            {sessions.length ? (
              sessions.map((session) => (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => {
                    setCurrentSession(session);
                    setParsedSummary(null);
                    setFeedback({
                      type: "info",
                      text: "تم فتح جلسة من السجل.",
                    });
                  }}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right transition hover:border-sky-200 hover:bg-sky-50"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-black text-slate-950">{session.title}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {formatDate(session.createdAt)} · {session.files?.[0]?.fileName || "ملف نور"} · {session.totalRows} طالب/طالبة
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={["rounded-full border px-3 py-1 text-xs font-black", getStatusClass(session.status)].join(" ")}>
                        {statusLabel[session.status] || session.status}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                        صالح: {session.validRows}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                        محدث: {session.updatedCount}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                        جديد: {session.createdCount}
                      </span>
                    </div>
                  </div>
                </button>
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