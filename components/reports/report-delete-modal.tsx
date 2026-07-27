"use client";

import { Trash2 } from "lucide-react";

export function ReportDeleteModal(props: {
  title: string;
  status: string;
  loading: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const approved = props.status === "APPROVED";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      dir="rtl"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-delete-title"
        className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-700">
          <Trash2 className="h-7 w-7" />
        </div>
        <div className="mt-4 text-center">
          <h2
            id="report-delete-title"
            className="text-xl font-black text-slate-950"
          >
            {approved ? "حذف تقرير معتمد" : "حذف التقرير"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {approved
              ? "هذا التقرير معتمد. سيؤدي الحذف إلى إزالته نهائيًا من التقارير وملف الإنجاز وأي قوائم مرتبطة به."
              : "سيتم حذف التقرير نهائيًا ولن تتمكن من استعادته."}
          </p>
          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-900">
            {props.title}
          </p>
        </div>
        {props.error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {props.error}
          </div>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            disabled={props.loading}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={props.loading}
            className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-black text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {props.loading ? "جارٍ حذف التقرير..." : "حذف نهائي"}
          </button>
        </div>
      </section>
    </div>
  );
}
