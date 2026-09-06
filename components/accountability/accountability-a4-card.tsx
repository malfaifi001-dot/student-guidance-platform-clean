"use client";

import { usePrintExportAction } from "@/components/print-export/use-print-export-action";
import { PrintExportPopCard } from "@/components/print-export/print-export-pop-card";
import type { RuntimeStep } from "@/engine/runtime/runtime-resolver";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";

export function AccountabilityA4Card({ mode, schoolName, title, typeLabel, respondentName, officialText, managerStep, managerValues, respondentStep, respondentValues, reviewStep, reviewValues, status, respondedAt, attachments = [] }: { mode: "PRE_SEND" | "RESPONDENT" | "REVIEW"; schoolName?: string | null; title: string; typeLabel: string; respondentName: string; officialText: string; managerStep?: RuntimeStep | null; managerValues: Record<string, unknown>; respondentStep?: RuntimeStep | null; respondentValues?: Record<string, unknown>; reviewStep?: RuntimeStep | null; reviewValues?: Record<string, unknown>; status?: string; respondedAt?: Date | string | null; attachments?: Array<{ fileName: string; fileUrl: string }> }) {
  const print = usePrintExportAction();
  const rows = (step: RuntimeStep | null | undefined, values: Record<string, unknown>, allValues: Record<string, unknown>) => (step?.fields || []).filter((field) => isConditionalWorkflowFieldVisible(field, allValues) && values[field.key] !== undefined && values[field.key] !== "").map((field) => { const value = values[field.key]; return { label: field.label, value: Array.isArray(value) ? (value as unknown[]).map(String).join("، ") : String(value) }; });
  const managerRows = rows(managerStep, managerValues, managerValues);
  const respondentRows = rows(respondentStep, respondentValues || {}, { ...managerValues, ...(respondentValues || {}) });
  const reviewRows = rows(reviewStep, reviewValues || {}, { ...managerValues, ...(respondentValues || {}), ...(reviewValues || {}) });
  return <>
    <section className="accountability-a4 mx-auto w-full max-w-[210mm] min-h-[297mm] border border-slate-200 bg-white p-8 text-slate-900 shadow-sm sm:p-12" dir="rtl">
      <header className="border-b-2 border-indigo-900 pb-5 text-center"><p className="text-sm font-bold text-slate-500">{schoolName || "اسم المدرسة"}</p><h1 className="mt-4 text-2xl font-black text-indigo-950">{title || "متابعة المعلمين"}</h1><p className="mt-2 text-sm font-bold text-indigo-700">وثيقة متابعة ومساءلة إدارية</p></header>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><Info label="نوع المساءلة" value={typeLabel} /><Info label="المعلم / المنسوب" value={respondentName} /><Info label="التاريخ" value={new Date().toLocaleDateString("ar-SA")} /><Info label="الحالة" value={status === "DRAFT" ? "مسودة" : status || "قبل الإرسال"} /></div>
      <DocumentSection title="بيانات الواقعة" rows={managerRows} empty="لا توجد بيانات واقعة مسجلة." />
      <section className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/60 p-5"><h2 className="text-base font-black text-indigo-950">نص المساءلة الرسمي</h2><p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-8">{officialText || "سيظهر النص الرسمي هنا بعد الصياغة."}</p></section>
      {mode !== "PRE_SEND" ? <DocumentSection title="إفادة المعلم / المنسوب" rows={respondentRows} empty="لم تُسجل الإفادة بعد." /> : null}
      {mode === "REVIEW" ? <><DocumentSection title="ملاحظات المراجعة" rows={reviewRows} empty="لم تُسجل المراجعة بعد." />{respondedAt ? <p className="mt-4 text-xs font-bold text-slate-500">وقت إرسال الإفادة: {new Date(respondedAt).toLocaleString("ar-SA")}</p> : null}{attachments.length ? <div className="mt-4"><h2 className="font-black">المرفقات</h2>{attachments.map((file) => <a className="mt-2 block text-sm font-bold text-indigo-700 underline" href={file.fileUrl} target="_blank" rel="noreferrer" key={file.fileUrl}>{file.fileName}</a>)}</div> : null}</> : null}
      <footer className="mt-12 border-t border-slate-200 pt-4 text-center text-xs font-bold text-slate-400">وثيقة متابعة داخلية — {new Date().toLocaleDateString("ar-SA")}</footer>
    </section>
    <div className="mx-auto flex max-w-[210mm] justify-end py-3"><button type="button" onClick={() => void print.openFallbackPrintUrl({ printUrl: window.location.href, title: "طباعة وثيقة المساءلة" })} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700">طباعة A4</button></div><PrintExportPopCard modal={print.modal} onClose={print.closeModal} onOpenFallback={(fallback) => void print.openFallbackPrintUrl(fallback)} />
    <style jsx global>{`@media print { body { background: #fff !important; } .accountability-a4 { max-width: none !important; min-height: 297mm; border: 0 !important; box-shadow: none !important; } body > * { visibility: hidden; } .accountability-a4, .accountability-a4 * { visibility: visible; } .accountability-a4 { position: absolute; inset: 0; } }`}</style>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-sm font-black">{value || "—"}</p></div>; }
function DocumentSection({ title, rows, empty }: { title: string; rows: Array<{ label: string; value: string }>; empty: string }) { return <section className="mt-6"><h2 className="border-r-4 border-indigo-600 pr-3 text-base font-black text-indigo-950">{title}</h2>{rows.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{rows.map((row, index) => <div className="rounded-xl border border-slate-100 p-3 text-sm" key={`${row.label}-${index}`}><span className="font-black text-indigo-700">{row.label}: </span>{row.value}</div>)}</div> : <p className="mt-3 text-sm font-bold text-slate-400">{empty}</p>}</section>; }
