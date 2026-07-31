"use client";

import { Trash2 } from "lucide-react";

export function ReportDeleteModal(props: {
  reportTitle: string;
  caseTitle?: string;
  status: string;
  loading: boolean;
  error?: string;
  success?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const approved = props.status === "APPROVED";
  const draft = props.status === "DRAFT";

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
            {approved
              ? "حذف التقرير المعتمد"
              : draft
                ? "حذف مسودة التقرير"
                : "حذف التقرير"}
          </h2>
          <span
            className={[
              "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ring-1",
              approved
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : draft
                  ? "bg-sky-50 text-sky-700 ring-sky-100"
                  : "bg-slate-100 text-slate-700 ring-slate-200",
            ].join(" ")}
          >
            حالة التقرير: {approved ? "معتمد" : draft ? "مسودة" : props.status}
          </span>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {approved
              ? "سيتم حذف التقرير المعتمد ونسخته المحفوظة نهائيًا. لا يمكن التراجع عن حذف النسخة المعتمدة."
              : draft
                ? "سيتم حذف مسودة التقرير وحالتها التحريرية المحفوظة نهائيًا."
                : "سيتم حذف التقرير نهائيًا ولن تتمكن من استعادته."}
          </p>
          <dl className="mt-3 space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-right text-sm">
            <div>
              <dt className="text-xs font-bold text-slate-400">عنوان التقرير</dt>
              <dd className="mt-1 font-black text-slate-900">{props.reportTitle}</dd>
            </div>
            {props.caseTitle ? (
              <div>
                <dt className="text-xs font-bold text-slate-400">الحالة المرتبطة</dt>
                <dd className="mt-1 font-black text-slate-900">{props.caseTitle}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-sm font-black text-slate-700">
            سيتم حذف التقرير فقط، وستبقى الحالة وبياناتها وشواهدها محفوظة.
          </p>
        </div>
        {props.error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {props.error}
          </div>
        ) : null}
        {props.success ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {props.success}
          </div>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={props.onCancel}
            disabled={props.loading || Boolean(props.success)}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={props.loading || Boolean(props.success)}
            className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-black text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {props.loading ? "جارٍ حذف التقرير..." : "حذف نهائي"}
          </button>
        </div>
      </section>
    </div>
  );
}
