"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readApiResponse } from "@/lib/http/read-api-response";
import {
  SmartActionFeedbackModal,
  useSmartActionFeedback,
} from "@/components/ui/smart-action-feedback";

type ImportSession = {
  id: string;
  cycleId?: string | null;
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
  rowCount?: number;
  planSummary?: Record<string, number>;
  files?: Array<{
    fileName: string;
  }>;
};

type ImportRow = {
  id: string;
  rowIndex: number;
  status: string;
  planAction?: string | null;
  fullName: string;
  nationalId?: string | null;
  grade?: string | null;
  classroom?: string | null;
  guardianName?: string | null;
  errorMessage?: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Props = {
  sessionId: string;
};

const statusLabel: Record<string, string> = {
  PARSED: "بانتظار الاعتماد",
  COMMITTED: "معتمد",
  VALID: "صالح",
  INVALID: "يحتاج مراجعة",
  CONFLICT: "تعارض",
  CREATED: "تم الإنشاء",
  UPDATED: "تم التحديث",
  SKIPPED: "بدون تغيير",
};

const planLabel: Record<string, string> = {
  NEW: "جديد",
  UPDATE: "سيتم تحديثه",
  UNCHANGED: "بدون تغيير",
  DUPLICATE_IN_FILE: "مكرر",
  NEEDS_REVIEW: "يحتاج مراجعة",
};

function badgeClass(value: string) {
  if (["VALID", "COMMITTED", "CREATED", "UPDATED", "NEW"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["INVALID", "CONFLICT", "DUPLICATE_IN_FILE", "NEEDS_REVIEW"].includes(value)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (["UNCHANGED", "SKIPPED"].includes(value)) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function planCardClass(value: string, selected: boolean) {
  if (selected) {
    return "border-sky-300 bg-sky-50 ring-2 ring-sky-100";
  }

  if (value === "UPDATE") {
    return "border-blue-100 bg-blue-50/60 hover:border-blue-200";
  }

  if (value === "NEW") {
    return "border-emerald-100 bg-emerald-50/60 hover:border-emerald-200";
  }

  if (value === "UNCHANGED") {
    return "border-slate-100 bg-slate-50 hover:border-slate-200";
  }

  return "border-rose-100 bg-rose-50/60 hover:border-rose-200";
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


function toSafeNumber(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildCommitFeedbackTitle(result: any) {
  const session = result?.session || {};
  const createdCount = toSafeNumber(result?.createdCount ?? session.createdCount);
  const updatedCount = toSafeNumber(result?.updatedCount ?? session.updatedCount);

  if (createdCount > 0 && updatedCount > 0) {
    return "تم الربط والتحديث بنجاح";
  }

  if (createdCount > 0) {
    return "تم ربط بيانات الطلاب بنجاح";
  }

  if (updatedCount > 0) {
    return "تم تحديث بيانات الطلاب بنجاح";
  }

  return "تم اعتماد تحديث بيانات الطلاب";
}

function buildCommitFeedbackDescription(result: any) {
  const session = result?.session || {};
  const createdCount = toSafeNumber(result?.createdCount ?? session.createdCount);
  const updatedCount = toSafeNumber(result?.updatedCount ?? session.updatedCount);
  const skippedCount = toSafeNumber(result?.skippedCount ?? session.skippedCount);
  const deactivatedCount = toSafeNumber(result?.deactivatedCount ?? session.deactivatedCount);
  const rowCount = toSafeNumber(session.rowCount || session.totalRows);

  const lines = [
    createdCount > 0
      ? `تم ربط ${createdCount} طالب/طالبة جديد بسجل المدرسة.`
      : "لا يوجد طلاب جدد للربط.",
    updatedCount > 0
      ? `تم تحديث بيانات ${updatedCount} طالب/طالبة موجودين مسبقًا.`
      : "لا توجد بيانات طلاب قائمة تحتاج تحديثًا.",
    skippedCount > 0
      ? `تم تجاوز ${skippedCount} صف بدون تغيير.`
      : "",
    deactivatedCount > 0
      ? `تم تعطيل ${deactivatedCount} طالب/طالبة غير موجودين في الملف الجديد.`
      : "",
    rowCount > 0 ? `إجمالي الصفوف التي تمت مراجعتها: ${rowCount}.` : "",
  ].filter(Boolean);

  return lines.join(" ");
}
export function NoorImportSessionDetailClient({ sessionId }: Props) {
  const [session, setSession] = useState<ImportSession | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });

  const [q, setQ] = useState("");
  const [planAction, setPlanAction] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    actionState,
    processing: actionProcessing,
    confirmAction,
    closeActionFeedback,
    runConfirmedAction,
  } = useSmartActionFeedback();

  const isCommitted = session?.status === "COMMITTED";
  const summary = session?.planSummary || {};

  const planCards = useMemo(
    () => [
      { key: "NEW", label: "جديد", value: summary.NEW ?? 0 },
      { key: "UPDATE", label: "سيتم تحديثه", value: summary.UPDATE ?? 0 },
      { key: "UNCHANGED", label: "بدون تغيير", value: summary.UNCHANGED ?? 0 },
      { key: "DUPLICATE_IN_FILE", label: "مكرر", value: summary.DUPLICATE_IN_FILE ?? 0 },
      { key: "NEEDS_REVIEW", label: "مراجعة", value: summary.NEEDS_REVIEW ?? 0 },
    ],
    [summary],
  );

  async function loadSession() {
    const response = await fetch(`/api/dashboard/data-center/student-data-import/${sessionId}`, {
      cache: "no-store",
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(result.error || "تعذر جلب تحديث بيانات الطلاب.");
    }

    setSession(result.session);
  }

  async function loadRows(page = 1) {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
      });

      if (q.trim()) {
        params.set("q", q.trim());
      }

      if (status) {
        params.set("status", status);
      }

      if (planAction) {
        params.set("planAction", planAction);
      }

      const response = await fetch(
        `/api/dashboard/data-center/student-data-import/${sessionId}/rows?${params.toString()}`,
        { cache: "no-store" },
      );

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "تعذر جلب صفوف التحديث.");
      }

      setRows(result.rows || []);
      setPagination(result.pagination || {
        page,
        pageSize: 50,
        total: 0,
        totalPages: 1,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل الصفوف.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCommit() {
    if (!session) {
      return;
    }

    const targetSession = session;

    confirmAction({
      title: "اعتماد تحديث بيانات الطلاب؟",
      description:
        "سيتم تطبيق التغييرات على سجل الطلاب. سيتم ربط الطلاب الجدد، وتحديث بيانات الطلاب الموجودين، ثم حفظ سجل تغييرات لهذا التحديث.",
      variant: "warning",
      confirmLabel: "اعتماد التحديث",
      errorTitle: "تعذر اعتماد التحديث",
      run: async () => {
        setIsLoading(true);

        try {
          const response = await fetch(
            `/api/dashboard/data-center/student-data-import/${targetSession.id}/commit`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                deactivateMissing: false,
              }),
            }
          );

          const result = await readApiResponse(response);

          if (!response.ok) {
            throw new Error(result.details || result.error || "تعذر اعتماد التحديث.");
          }

          setMessage(null);
          await loadSession();
          await loadRows(pagination.page);

          return {
            title: buildCommitFeedbackTitle(result),
            description: buildCommitFeedbackDescription(result),
            variant: "success" as const,
          };
        } finally {
          setIsLoading(false);
        }
      },
    });
  }

  function handleDelete() {
    if (!session) {
      return;
    }

    const targetSession = session;

    confirmAction({
      title: "حذف التحديث غير المعتمد؟",
      description:
        "سيتم حذف جلسة التحديث الحالية قبل اعتمادها. هذا الإجراء لا يحذف الطلاب من سجل المدرسة، لكنه يزيل هذه المراجعة غير المعتمدة.",
      variant: "danger",
      confirmLabel: "حذف التحديث",
      errorTitle: "تعذر حذف التحديث",
      run: async () => {
        setIsLoading(true);

        try {
          const response = await fetch(
            `/api/dashboard/data-center/student-data-import/${targetSession.id}`,
            {
              method: "DELETE",
            }
          );

          const result = await readApiResponse(response);

          if (!response.ok) {
            throw new Error(result.details || result.error || "تعذر حذف التحديث.");
          }

          window.location.href = targetSession.cycleId
            ? `/dashboard/data-center/student-data-import/cycles/${targetSession.cycleId}`
            : "/dashboard/data-center/student-data-import";

          return {
            title: "تم حذف التحديث",
            description: "تم حذف جلسة التحديث غير المعتمدة بنجاح.",
            variant: "success" as const,
          };
        } catch (error) {
          setIsLoading(false);
          throw error;
        }
      },
    });
  }

  useEffect(() => {
    loadSession().catch((error) => {
      setMessage(error instanceof Error ? error.message : "تعذر فتح تحديث بيانات الطلاب.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      loadRows(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, q, status, planAction]);

  return (
    <>
      <SmartActionFeedbackModal
        state={actionState}
        processing={actionProcessing}
        onClose={closeActionFeedback}
        onConfirm={runConfirmedAction}
      />

      <main className="min-h-screen bg-slate-50 px-4 py-6 text-right text-slate-950 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href={session?.cycleId ? `/dashboard/data-center/student-data-import/cycles/${session.cycleId}` : "/dashboard/data-center/student-data-import"}
            className="text-sm font-black text-sky-700 hover:text-sky-900"
          >
            ← العودة إلى بطاقة بيانات الطلاب
          </Link>

          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black text-sky-700">تحديث بيانات الطلاب</p>
              <h1 className="mt-2 text-2xl font-black md:text-4xl">مراجعة التحديث</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                راجع التغييرات فقط، ثم اعتمد التحديث.
              </p>
            </div>

            {session ? (
              <span className={["rounded-full border px-4 py-2 text-sm font-black", badgeClass(session.status)].join(" ")}>
                {statusLabel[session.status] || session.status}
              </span>
            ) : null}
          </div>
        </section>

        {message ? (
          <section className="rounded-3xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-bold text-sky-800">
            {message}
          </section>
        ) : null}

        {session ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-black text-slate-800">
                  إجمالي الملف: {session.totalRows} طالب/طالبة
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  آخر تحديث: {formatDate(session.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isCommitted ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCommit}
                      disabled={isLoading}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      اعتماد التحديث
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      حذف التحديث
                    </button>
                  </>
                ) : (
                  <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700">
                    تم اعتماد هذا التحديث
                  </span>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {planCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setPlanAction(planAction === card.key ? "" : card.key)}
                  className={[
                    "rounded-2xl border p-4 text-right shadow-sm transition",
                    planCardClass(card.key, planAction === card.key),
                  ].join(" ")}
                >
                  <p className="text-xs font-black text-slate-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-black text-slate-950">{card.value}</p>
                  {planAction === card.key ? (
                    <p className="mt-2 text-xs font-black text-sky-700">يعرض الآن</p>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="اكتب اسم الطالب، الهوية، ولي الأمر، الصف أو الفصل..."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
            >
              <option value="">كل الحالات</option>
              <option value="VALID">صالح</option>
              <option value="INVALID">يحتاج مراجعة</option>
              <option value="CONFLICT">تعارض</option>
              <option value="CREATED">تم الإنشاء</option>
              <option value="UPDATED">تم التحديث</option>
              <option value="SKIPPED">بدون تغيير</option>
            </select>

            <select
              value={planAction}
              onChange={(event) => setPlanAction(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-sky-300"
            >
              <option value="">كل الخطط</option>
              <option value="NEW">جديد</option>
              <option value="UPDATE">سيتم تحديثه</option>
              <option value="UNCHANGED">بدون تغيير</option>
              <option value="DUPLICATE_IN_FILE">مكرر</option>
              <option value="NEEDS_REVIEW">يحتاج مراجعة</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">
              البحث يعمل تلقائيًا أثناء الكتابة.
              {isLoading ? " جاري التحديث..." : ""}
            </p>

            {(q || planAction || status) ? (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setStatus("");
                  setPlanAction("");
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700"
              >
                مسح الفلاتر
              </button>
            ) : null}
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[1050px] border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs font-black text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-right">#</th>
                    <th className="px-4 py-3 text-right">اسم الطالب/الطالبة</th>
                    <th className="px-4 py-3 text-right">الهوية</th>
                    <th className="px-4 py-3 text-right">الصف</th>
                    <th className="px-4 py-3 text-right">الفصل</th>
                    <th className="px-4 py-3 text-right">ولي الأمر</th>
                    <th className="px-4 py-3 text-right">الخطة</th>
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
                      <td className="px-4 py-3 font-bold text-slate-600">{row.guardianName || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(row.planAction || "")].join(" ")}>
                          {planLabel[row.planAction || ""] || row.planAction || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={["inline-flex rounded-full border px-3 py-1 text-xs font-black", badgeClass(row.status)].join(" ")}>
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

                  {!rows.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm font-bold text-slate-500">
                        لا توجد نتائج مطابقة.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <p className="text-sm font-bold text-slate-500">
              صفحة {pagination.page} من {pagination.totalPages} · إجمالي النتائج {pagination.total}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadRows(Math.max(pagination.page - 1, 1))}
                disabled={pagination.page <= 1 || isLoading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                السابق
              </button>

              <button
                type="button"
                onClick={() => loadRows(Math.min(pagination.page + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        </section>
      </div>
      </main>
    </>
  );
}