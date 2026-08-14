"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { StudentImportDeleteDialog } from "@/components/data-center/noor-import/student-import-delete-dialog";
import { readApiResponse } from "@/lib/http/read-api-response";

type SessionItem = {
  id: string;
  title: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  conflictCount?: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  createdAt: string;
  committedAt?: string | null;
  files?: Array<{
    fileName: string;
  }>;
};

type CycleDetail = {
  id: string;
  academicYear: string;
  term: string;
  title: string;
  status: string;
  totalStudents: number;
  totalSessions: number;
  pendingSessions: number;
  committedSessions: number;
  latestSession?: SessionItem | null;
  latestCommitted?: SessionItem | null;
  planSummary?: Record<string, number>;
};

type Props = {
  cycleId: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: "لم يبدأ",
  REVIEW_PENDING: "بانتظار المراجعة",
  COMMITTED: "معتمدة",
  ARCHIVED: "مؤرشفة",
  PARSED: "جاهزة للمراجعة",
  FAILED: "فشلت",
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

function statusClass(status: string) {
  if (status === "COMMITTED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "REVIEW_PENDING" || status === "PARSED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "FAILED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getFileName(session?: SessionItem | null) {
  return session?.files?.[0]?.fileName || "ملف بيانات الطلاب";
}

export function NoorImportCycleDetailClient({ cycleId }: Props) {
  const [cycle, setCycle] = useState<CycleDetail | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SessionItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const pendingSessions = useMemo(
    () => sessions.filter((session) => session.status !== "COMMITTED"),
    [sessions],
  );

  const committedSessions = useMemo(
    () => sessions.filter((session) => session.status === "COMMITTED"),
    [sessions],
  );

  const latestPendingSession = pendingSessions[0] ?? null;
  const hasPendingUpdate = Boolean(latestPendingSession);

  const loadCycle = useCallback(async () => {
    const response = await fetch(`/api/dashboard/data-center/student-data-import/cycles/${cycleId}`, {
      cache: "no-store",
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(result.error || "تعذر جلب بطاقة بيانات الطلاب.");
    }

    setCycle(result.cycle);
    setSessions(result.sessions ?? []);
  }, [cycleId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadCycle().catch((error) => {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "تعذر فتح بطاقة بيانات الطلاب.",
        });
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCycle]);

  async function confirmDelete() {
    if (!deleteTarget || deleteBusy) return;

    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const response = await fetch(
        `/api/dashboard/data-center/student-data-import/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر حذف ملف بيانات الطلاب.");
      }

      setDeleteTarget(null);
      await loadCycle();
      setMessage({ type: "success", text: "تم حذف ملف بيانات الطلاب بنجاح." });
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "تعذر حذف ملف بيانات الطلاب. حاول مرة أخرى.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!cycle) {
      return;
    }

    if (hasPendingUpdate) {
      setMessage({
        type: "error",
        text: "يوجد تحديث بانتظار المراجعة. راجع التحديث الحالي أو احذفه قبل رفع ملف جديد.",
      });
      return;
    }

    if (!file) {
      setMessage({
        type: "error",
        text: "اختر ملف Excel لبيانات الطلاب أولًا.",
      });
      return;
    }

    setIsLoading(true);
    setMessage({
      type: "info",
      text: "جاري إنشاء تحديث جديد داخل بطاقة بيانات الطلاب...",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cycleId", cycle.id);
      formData.append("academicYear", cycle.academicYear);
      formData.append("term", cycle.term);

      const response = await fetch("/api/dashboard/data-center/student-data-import/preview", {
        method: "POST",
        body: formData,
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر إنشاء تحديث بيانات الطلاب.");
      }

      setFile(null);

      await loadCycle();

      setMessage({
        type: "success",
        text: "تم إنشاء تحديث جديد. راجع التحديث من نفس البطاقة قبل الاعتماد.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر رفع ملف بيانات الطلاب.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-right text-slate-950 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard/data-center/student-data-import"
            className="text-sm font-black text-sky-700 hover:text-sky-900"
          >
            ← العودة إلى مركز بيانات الطلاب
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black text-sky-700">رفع بيانات الطلاب</p>
              <h1 className="mt-2 text-2xl font-black md:text-4xl">
                {cycle ? `بيانات الطلاب ${cycle.academicYear} - ${cycle.term}` : "بيانات الطلاب"}
              </h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                ارفع ملف Excel ثم راجعه قبل الاعتماد.
              </p>
            </div>

            {cycle ? (
              <span className={["rounded-full border px-4 py-2 text-sm font-black", statusClass(cycle.status)].join(" ")}>
                {statusLabel[cycle.status] || cycle.status}
              </span>
            ) : null}
          </div>
        </section>

        {message ? (
          <section
            className={[
              "rounded-3xl border px-5 py-4 text-sm font-bold leading-7 shadow-sm",
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : message.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-sky-200 bg-sky-50 text-sky-800",
            ].join(" ")}
          >
            {message.text}
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-700">
              ١. البطاقة
            </div>
            <div
              className={[
                "rounded-2xl border px-4 py-4 text-sm font-black",
                hasPendingUpdate
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-sky-200 bg-sky-50 text-sky-800",
              ].join(" ")}
            >
              ٢. رفع الملف
            </div>
            <div
              className={[
                "rounded-2xl border px-4 py-4 text-sm font-black",
                hasPendingUpdate
                  ? "border-sky-200 bg-sky-50 text-sky-800"
                  : "border-slate-200 bg-slate-50 text-slate-700",
              ].join(" ")}
            >
              ٣. المراجعة والاعتماد
            </div>
          </div>
        </section>

        {hasPendingUpdate ? (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-black text-amber-700">ملف ينتظر الاعتماد</p>
                <h2 className="mt-1 text-xl font-black text-amber-950">
                  {getFileName(latestPendingSession)}
                </h2>
                <p className="mt-2 text-sm font-bold text-amber-800">
                  راجع الملف ثم اعتمده.
                </p>
              </div>

              <Link
                href={`/dashboard/data-center/student-data-import/sessions/${latestPendingSession.id}`}
                className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-700"
              >
                مراجعة الملف
              </Link>
            </div>
          </section>
        ) : null}

        {cycle ? (
          <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <form onSubmit={handleUpload} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">رفع ملف الطلاب</h2>
              <p className="mt-1 text-sm font-bold leading-7 text-slate-500">
                اختر ملف Excel من جهازك.
              </p>

              {hasPendingUpdate ? (
                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-800">
                  لا يمكن رفع ملف جديد الآن لأن هناك تحديثًا بانتظار المراجعة.
                </div>
              ) : (
                <>
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
                    disabled={isLoading || !file}
                    className="mt-5 w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "جاري إنشاء التحديث..." : "إنشاء مراجعة"}
                  </button>
                </>
              )}
            </form>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">ملخص البطاقة</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                أرقام الطلاب والتحديثات.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">الطلاب</p>
                  <p className="mt-1 text-2xl font-black">{cycle.totalStudents || cycle.latestSession?.totalRows || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">التحديثات</p>
                  <p className="mt-1 text-2xl font-black">{sessions.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">بانتظار مراجعة</p>
                  <p className="mt-1 text-2xl font-black">{pendingSessions.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-500">معتمدة</p>
                  <p className="mt-1 text-2xl font-black">{committedSessions.length}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">آخر الملفات</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            الملفات التي تم رفعها لهذه البطاقة.
          </p>

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
                        <span className={["rounded-full border px-3 py-1 text-xs font-black", statusClass(session.status)].join(" ")}>
                          {statusLabel[session.status] || session.status}
                        </span>
                      </div>

                      <h3 className="mt-3 text-base font-black text-slate-950">
                        {getFileName(session)}
                      </h3>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {session.totalRows} طالب/طالبة · {formatDate(session.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/data-center/student-data-import/sessions/${session.id}`}
                        className="rounded-full border border-sky-200 bg-white px-4 py-1 text-xs font-black text-sky-700 hover:bg-sky-50"
                      >
                        {session.status === "COMMITTED" ? "عرض" : "مراجعة"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(session);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-1 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                لم يتم رفع أي ملف داخل هذه البطاقة بعد.
              </div>
            )}
          </div>
        </section>
      </div>

      <StudentImportDeleteDialog
        target={
          deleteTarget
            ? {
                fileName: getFileName(deleteTarget),
                rowCount: deleteTarget.totalRows,
                uploadedAt: formatDate(deleteTarget.createdAt),
                statusLabel: statusLabel[deleteTarget.status] || deleteTarget.status,
                isCommitted: deleteTarget.status === "COMMITTED",
              }
            : null
        }
        busy={deleteBusy}
        error={deleteError}
        onCancel={() => {
          if (deleteBusy) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  );
}
