"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { PerformanceItemLinkPopCard } from "@/components/performance-links/performance-item-link-pop-card";
import { SmartActionModal } from "@/components/ui/smart-action-modal";

export function ServiceOutputCard({ link, roleContext, performanceItemTitle, onDeleted, onUpdated: onUpdatedCallback }: { link: any; roleContext: string; performanceItemTitle: string; onDeleted?: (id: string) => void; onUpdated?: (link: any) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const onUpdated = (value?: any) => onUpdatedCallback ? onUpdatedCallback(value) : window.location.reload();
  async function remove() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/dashboard/performance-links/${encodeURIComponent(link.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      onDeleted ? onDeleted(link.id) : window.location.reload();
      setConfirmDelete(false);
    } finally { setDeleting(false); }
  }
  const summary = link.sourceSummary || {};
  return <>
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-950">{link.displayTitle}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-500">
            <span className="rounded-full bg-slate-50 px-2.5 py-1">{summary.stageName || "المرحلة غير محددة"}</span>
            <span className="rounded-full bg-slate-50 px-2.5 py-1">{summary.gradeName || "الصف غير محدد"}</span>
            <span className="rounded-full bg-slate-50 px-2.5 py-1">{summary.semesterName || link.metadataJson?.semesterName || "الفصل غير محدد"}</span>
          </div>
          <p className="mt-2 text-xs font-black text-sky-700">عنصر الأداء: {performanceItemTitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <a href={`/dashboard/teacher/curriculum-distribution?subjectId=${encodeURIComponent(link.sourceReferenceJson?.subjectId || "")}&semesterId=${encodeURIComponent(link.sourceReferenceJson?.semesterId || "")}`} title="معاينة التوزيع" aria-label="معاينة التوزيع" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4" /></a>
          <button type="button" title="تعديل عنصر الأداء" aria-label="تعديل عنصر الأداء" onClick={() => setEditOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
          <button type="button" disabled={deleting} title="حذف الربط" aria-label="حذف الربط" onClick={() => setConfirmDelete(true)} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
    <PerformanceItemLinkPopCard open={editOpen} serviceSlug={link.serviceSlug} roleContext={roleContext} resourceType={link.resourceType} sourceReference={link.sourceReferenceJson} displayTitle={link.displayTitle} existingLink={link} onClose={() => setEditOpen(false)} onSaved={onUpdated} />
    <SmartActionModal open={confirmDelete} title="تأكيد حذف الربط" description="سيتم حذف الارتباط بعنصر الأداء فقط، ولن يتم حذف خطة توزيع المنهج أو بياناتها." variant="danger" confirmLabel="حذف الربط" cancelLabel="إلغاء" loading={deleting} onConfirm={() => void remove()} onClose={() => !deleting && setConfirmDelete(false)} />
  </>;
}
