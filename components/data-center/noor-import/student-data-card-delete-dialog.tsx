"use client";

import { LoaderCircle, Trash2, X } from "lucide-react";

type CardDeleteTarget = {
  title: string;
  academicYear: string;
  term: string;
  studentCount: number;
  lastUpdatedAt: string;
};

export function StudentDataCardDeleteDialog({
  target,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  target: CardDeleteTarget | null;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-data-card-delete-title"
        className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-700">
              <Trash2 className="h-5 w-5" />
            </span>
            <div>
              <h2 id="student-data-card-delete-title" className="text-xl font-black text-slate-950">
                حذف بطاقة بيانات الطلاب
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                هل أنت متأكد من حذف هذه البطاقة وبيانات الاستيراد المرتبطة بها من مركز بيانات الطلاب؟
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="إغلاق"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold text-slate-400">اسم البطاقة</dt>
            <dd className="mt-1 font-black text-slate-900">{target.title}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-400">السنة الدراسية</dt>
            <dd className="mt-1 font-black text-slate-900">{target.academicYear}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-400">الفصل الدراسي</dt>
            <dd className="mt-1 font-black text-slate-900">{target.term}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-400">عدد الطلاب</dt>
            <dd className="mt-1 font-black text-slate-900">{target.studentCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-slate-400">آخر تحديث</dt>
            <dd className="mt-1 font-black text-slate-900">{target.lastUpdatedAt}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold leading-7 text-sky-950">
          <p>لن يتم حذف التقارير التي تم إنشاؤها سابقًا، وستبقى الحالات والشواهد وبيانات الطلاب الأساسية محفوظة.</p>
          <p className="font-black text-rose-700">لا يمكن التراجع عن حذف بيانات البطاقة.</p>
        </div>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-700 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {busy ? "جارٍ حذف البطاقة..." : "حذف البطاقة"}
          </button>
        </div>
      </section>
    </div>
  );
}
