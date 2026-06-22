"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { readApiResponse } from "@/lib/http/read-api-response";

type NoorCycle = {
  id: string;
  academicYear: string;
  term: string;
  title: string;
  status: string;
  totalStudents: number;
  totalSessions: number;
  pendingSessions: number;
  committedSessions: number;
  isArchived?: boolean;
  createdAt: string;
  latestSession?: {
    id: string;
    status: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    conflictCount?: number;
    createdAt: string;
    committedAt?: string | null;
    files?: Array<{
      fileName: string;
    }>;
  } | null;
};

type Props = {
  schoolName: string;
};

const termOptions = [
  "الفصل الدراسي الأول",
  "الفصل الدراسي الثاني",
  "الفصل الدراسي الثالث",
];

const statusLabel: Record<string, string> = {
  DRAFT: "لم يبدأ",
  REVIEW_PENDING: "بانتظار المراجعة",
  COMMITTED: "معتمدة",
  ARCHIVED: "مؤرشفة",
};

function defaultAcademicYear() {
  return "1447";
}

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

  if (status === "REVIEW_PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "ARCHIVED") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

export function NoorImportCyclesClient({ schoolName }: Props) {
  const [cycles, setCycles] = useState<NoorCycle[]>([]);
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [term, setTerm] = useState(termOptions[0]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadCycles() {
    const response = await fetch("/api/dashboard/data-center/student-data-import/cycles", {
      cache: "no-store",
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(result.error || "تعذر جلب بطاقات بيانات الطلاب.");
    }

    setCycles(result.cycles ?? []);
  }

  useEffect(() => {
    loadCycles().catch((error) => {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر جلب بطاقات بيانات الطلاب.",
      });
    });
  }, []);

  async function handleCreateCycle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!academicYear.trim() || !term.trim()) {
      setMessage({
        type: "error",
        text: "حدد السنة الدراسية والفصل الدراسي أولًا.",
      });
      return;
    }

    setIsLoading(true);
    setMessage({
      type: "info",
      text: "جاري إنشاء بطاقة بيانات الطلاب...",
    });

    try {
      const response = await fetch("/api/dashboard/data-center/student-data-import/cycles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYear: academicYear.trim(),
          term: term.trim(),
        }),
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر إنشاء بطاقة بيانات الطلاب.");
      }

      setMessage({
        type: "success",
        text: result.message || "تم إنشاء بطاقة بيانات الطلاب.",
      });

      setIsCreateOpen(false);
      await loadCycles();

      if (result.cycle?.id) {
        window.location.href = `/dashboard/data-center/student-data-import/cycles/${result.cycle.id}`;
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "تعذر إنشاء بطاقة بيانات الطلاب.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-right text-slate-950 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-l from-sky-50 via-white to-emerald-50 p-6 md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-black text-sky-700">مركز بيانات المدرسة</p>
                <h1 className="mt-2 text-2xl font-black md:text-4xl">مركز بيانات الطلاب</h1>
                <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-slate-600">
                  إدارة بيانات الطلاب وتحديثاتها.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700"
              >
                إضافة بيانات طالب
              </button>
            </div>
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
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-black">بطاقات بيانات الطلاب</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                بطاقات البيانات حسب السنة والفصل.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 transition hover:bg-sky-100"
            >
              إضافة بيانات طالب
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {cycles.length ? (
              cycles.map((cycle) => (
                <article
                  key={cycle.id}
                  className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={["rounded-full border px-3 py-1 text-xs font-black", statusClass(cycle.status)].join(" ")}>
                          {statusLabel[cycle.status] || cycle.status}
                        </span>

                        {cycle.pendingSessions > 0 ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            بانتظار مراجعة
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-xl font-black text-slate-950">
                        بيانات الطلاب {cycle.academicYear} - {cycle.term}
                      </h3>

                      <p className="mt-2 text-xs font-bold text-slate-500">
                        آخر ملف: {cycle.latestSession?.files?.[0]?.fileName || "لم يتم رفع ملف بعد"} · آخر تحديث: {formatDate(cycle.latestSession?.createdAt || cycle.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/data-center/student-data-import/cycles/${cycle.id}`}
                        className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-700"
                      >
                        فتح البطاقة
                      </Link>

                      {cycle.latestSession ? (
                        <Link
                          href={`/dashboard/data-center/student-data-import/sessions/${cycle.latestSession.id}`}
                          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          آخر تحديث
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-5">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black text-slate-400">الطلاب</p>
                      <p className="mt-1 text-2xl font-black">{cycle.totalStudents || cycle.latestSession?.totalRows || 0}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black text-slate-400">التحديثات</p>
                      <p className="mt-1 text-2xl font-black">{cycle.totalSessions}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black text-slate-400">المعتمدة</p>
                      <p className="mt-1 text-2xl font-black">{cycle.committedSessions}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black text-slate-400">بانتظار مراجعة</p>
                      <p className="mt-1 text-2xl font-black">{cycle.pendingSessions}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <p className="text-xs font-black text-slate-400">آخر تحديث</p>
                      <p className="mt-1 text-sm font-black">{formatDate(cycle.latestSession?.createdAt || cycle.createdAt)}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <h3 className="text-lg font-black text-slate-900">لا توجد بطاقات بعد</h3>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  أضف بطاقة للسنة والفصل، ثم ارفع الملف من داخلها.
                </p>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-5 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-700"
                >
                  إضافة بيانات طالب
                </button>
              </div>
            )}
          </div>
        </section>

        {isCreateOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
            <form
              onSubmit={handleCreateCycle}
              className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">إضافة بيانات طالب</h2>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-500">
                    اختر السنة والفصل، ثم افتح البطاقة لرفع الملف.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-black text-slate-500"
                >
                  إغلاق
                </button>
              </div>

              <div className="mt-5 grid gap-3">
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

              <div className="mt-6 flex flex-col gap-2 md:flex-row">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {isLoading ? "جاري الإنشاء..." : "إنشاء بطاقة"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </main>
  );
}
