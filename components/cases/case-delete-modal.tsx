"use client";

import { FolderX } from "lucide-react";

export function CaseDeleteModal(props: {
  caseTitle: string;
  serviceName: string;
  studentName?: string | null;
  hasLinkedReports: boolean;
  loading: boolean;
  error?: string;
  success?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" dir="rtl" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="case-delete-title" className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-700">
          <FolderX className="h-7 w-7" />
        </div>
        <div className="mt-4 text-center">
          <h2 id="case-delete-title" className="text-xl font-black text-slate-950">حذف الحالة</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            سيتم حذف الحالة وجميع قيمها وشواهدها وتقاريرها المرتبطة، بينما ستبقى بيانات الطالب الأساسية محفوظة.
          </p>
          <dl className="mt-4 space-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-right text-sm">
            <div><dt className="text-xs font-bold text-slate-400">الحالة</dt><dd className="mt-1 font-black text-slate-900">{props.caseTitle}</dd></div>
            <div><dt className="text-xs font-bold text-slate-400">الخدمة</dt><dd className="mt-1 font-black text-slate-900">{props.serviceName}</dd></div>
            {props.studentName ? <div><dt className="text-xs font-bold text-slate-400">الطالب/الطالبة</dt><dd className="mt-1 font-black text-slate-900">{props.studentName}</dd></div> : null}
          </dl>
          {props.hasLinkedReports ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">سيتم أيضًا حذف التقارير المرتبطة بهذه الحالة فقط.</p> : null}
          <p className="mt-3 text-sm font-black text-rose-700">لا يمكن التراجع عن هذا الإجراء. لن تُحذف بيانات الطالب الأساسية من مركز البيانات.</p>
        </div>
        {props.error ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{props.error}</div> : null}
        {props.success ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{props.success}</div> : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={props.onCancel} disabled={props.loading || Boolean(props.success)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50">إلغاء</button>
          <button type="button" onClick={props.onConfirm} disabled={props.loading || Boolean(props.success)} className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-black text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40">{props.loading ? "جارٍ حذف الحالة..." : "حذف الحالة نهائيًا"}</button>
        </div>
      </section>
    </div>
  );
}
