"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import type { PortfolioWorkspaceData } from "@/lib/portfolio/portfolio-read-model";
import type {
  PortfolioCustomEvidence,
  PortfolioManagedEvidence,
} from "@/lib/portfolio/portfolio-types";

type Props = {
  data: PortfolioWorkspaceData;
  busy: boolean;
  onSync: () => Promise<void>;
  onReportVisibility: (itemId: string, isVisible: boolean) => Promise<void>;
  onReportMove: (itemId: string, direction: "up" | "down") => Promise<void>;
  onEvidenceUpdate: (itemId: string, evidenceId: string, body: unknown) => Promise<void>;
  onEvidenceMove: (itemId: string, evidenceId: string, direction: "up" | "down") => Promise<void>;
  onCustomCreate: (body: unknown) => Promise<void>;
  onCustomUpdate: (itemId: string, body: unknown) => Promise<void>;
  onCustomMove: (itemId: string, direction: "up" | "down") => Promise<void>;
  onCustomDelete: (item: PortfolioCustomEvidence) => void;
};

const emptyCustom = {
  title: "",
  description: "",
  fileUrl: "",
  mimeType: "",
  sectionId: null as string | null,
  isVisible: true,
};

function formatDate(value: string | null) {
  if (!value) return "غير محدد";
  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "غير محدد";
  }
}

export function PortfolioReportsEvidencePanel(props: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customModal, setCustomModal] = useState<"new" | PortfolioCustomEvidence | null>(null);
  const [customForm, setCustomForm] = useState(emptyCustom);

  function openCustom(item?: PortfolioCustomEvidence) {
    setCustomModal(item || "new");
    setCustomForm(
      item
        ? {
            title: item.title,
            description: item.description,
            fileUrl: item.fileUrl,
            mimeType: item.mimeType,
            sectionId: item.sectionId,
            isVisible: item.isVisible,
          }
        : emptyCustom,
    );
  }

  return (
    <div className="space-y-5" data-guidance="teacher-portfolio-reports">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">التقارير والشواهد</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              اختر التقارير ورتّبها، ثم خصّص الشواهد داخل ملف الإنجاز فقط.
            </p>
          </div>
          <button
            type="button"
            disabled={props.busy}
            onClick={() => void props.onSync()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> مزامنة التقارير
          </button>
        </div>
      </section>

      {props.data.reportGroups.map((group) => (
        <section key={group.sectionId} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-950">{group.title}</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {props.data.showWeights ? `الوزن ${group.weight}% · ` : ""}{group.isEnabled ? "القسم ظاهر" : "القسم معطّل"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">متاح {group.availableCount}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">مضمّن {group.includedCount}</span>
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">شواهد {group.visibleEvidenceCount}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {group.reports.length ? (
              group.reports.map((report, index) => (
                <article key={report.itemId} className={`rounded-2xl border p-4 ${report.isAvailable ? "border-slate-200" : "border-amber-200 bg-amber-50/40"}`}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2 text-[11px] font-black">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">{report.sourceType === "GUIDANCE_REPORT" ? "تقرير إرشادي" : "تقرير موحّد"}</span>
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">{report.status}</span>
                        {!report.isAvailable ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">المصدر غير متاح</span> : null}
                      </div>
                      <h4 className="mt-2 truncate font-black text-slate-900">{report.title}</h4>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {[report.serviceName, report.caseTitle, formatDate(report.generatedAt || report.createdAt)].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {report.evidence.length} شاهد · {report.evidence.filter((item) => item.isVisible).length} ظاهر
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={props.busy || !report.isAvailable || index === 0} onClick={() => void props.onReportMove(report.itemId, "up")} className="rounded-xl border p-2 disabled:opacity-30" aria-label="تحريك التقرير لأعلى"><ArrowUp className="h-4 w-4" /></button>
                      <button disabled={props.busy || !report.isAvailable || index === group.reports.length - 1} onClick={() => void props.onReportMove(report.itemId, "down")} className="rounded-xl border p-2 disabled:opacity-30" aria-label="تحريك التقرير لأسفل"><ArrowDown className="h-4 w-4" /></button>
                      <button disabled={props.busy || !report.isAvailable} onClick={() => void props.onReportVisibility(report.itemId, !report.isVisible)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${report.isVisible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{report.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{report.isVisible ? "مضمّن" : "مستبعد"}</button>
                      {report.previewUrl ? <a href={report.previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black text-slate-700"><ExternalLink className="h-4 w-4" />الأصل</a> : null}
                      <button type="button" onClick={() => setExpanded(expanded === report.itemId ? null : report.itemId)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black">{expanded === report.itemId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}الشواهد</button>
                    </div>
                  </div>
                  {expanded === report.itemId ? (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      {report.evidence.length ? report.evidence.map((evidence, evidenceIndex) => (
                        <EvidenceEditor
                          key={evidence.id}
                          evidence={evidence}
                          index={evidenceIndex}
                          total={report.evidence.length}
                          busy={props.busy}
                          onSave={(body) => props.onEvidenceUpdate(report.itemId, evidence.id, body)}
                          onMove={(direction) => props.onEvidenceMove(report.itemId, evidence.id, direction)}
                        />
                      )) : <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-black text-slate-400">لا يحتوي التقرير على شواهد.</p>}
                    </div>
                  ) : null}
                </article>
              ))
            ) : <p className="mt-4 rounded-2xl bg-slate-50 p-6 text-center text-sm font-black text-slate-400">لا توجد تقارير متاحة لهذا القسم.</p>}
          </div>
        </section>
      ))}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-black">شواهد مستقلة</h2><p className="mt-1 text-sm font-bold text-slate-500">أضف رابط ملف آمن دون ربطه بتقرير.</p></div>
          <button type="button" onClick={() => openCustom()} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"><Plus className="h-4 w-4" />إضافة شاهد</button>
        </div>
        <div className="mt-4 space-y-3">
          {props.data.customEvidence.length ? props.data.customEvidence.map((item, index) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
              <div><strong className="text-sm text-slate-900">{item.title}</strong><p className="mt-1 text-xs font-bold text-slate-400">{item.fileUrl || "لا يوجد رابط ملف"}</p></div>
              <div className="flex gap-2"><button disabled={props.busy || index === 0} onClick={() => void props.onCustomMove(item.id, "up")} className="rounded-xl border p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button disabled={props.busy || index === props.data.customEvidence.length - 1} onClick={() => void props.onCustomMove(item.id, "down")} className="rounded-xl border p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button><button disabled={props.busy} onClick={() => void props.onCustomUpdate(item.id, { isVisible: !item.isVisible })} className="rounded-xl border p-2">{item.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button onClick={() => openCustom(item)} className="rounded-xl border p-2"><Pencil className="h-4 w-4" /></button><button onClick={() => props.onCustomDelete(item)} className="rounded-xl border border-rose-200 p-2 text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          )) : <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-black text-slate-400">لا توجد شواهد مستقلة بعد.</p>}
        </div>
      </section>

      {customModal ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/50 p-4" dir="rtl">
          <form onSubmit={(event) => { event.preventDefault(); const action = customModal === "new" ? props.onCustomCreate(customForm) : props.onCustomUpdate(customModal.id, customForm); void action.then(() => setCustomModal(null)).catch(() => undefined); }} className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between"><h2 className="text-xl font-black">{customModal === "new" ? "إضافة شاهد مستقل" : "تعديل الشاهد"}</h2><button type="button" onClick={() => setCustomModal(null)}><X /></button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-black">العنوان<input required value={customForm.title} onChange={(event) => setCustomForm((old) => ({ ...old, title: event.target.value }))} className="mt-2 w-full rounded-2xl border p-3" /></label>
              <label className="text-sm font-black">نوع الملف<input placeholder="image/jpeg أو application/pdf" value={customForm.mimeType} onChange={(event) => setCustomForm((old) => ({ ...old, mimeType: event.target.value }))} className="mt-2 w-full rounded-2xl border p-3" /></label>
              <label className="text-sm font-black md:col-span-2">رابط الملف<input type="url" value={customForm.fileUrl} onChange={(event) => setCustomForm((old) => ({ ...old, fileUrl: event.target.value }))} className="mt-2 w-full rounded-2xl border p-3" /></label>
              <label className="text-sm font-black">القسم<select value={customForm.sectionId || ""} onChange={(event) => setCustomForm((old) => ({ ...old, sectionId: event.target.value || null }))} className="mt-2 w-full rounded-2xl border p-3"><option value="">قسم مستقل</option>{props.data.sections.filter((section) => section.kind === "PERFORMANCE_ELEMENT").map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
              <label className="text-sm font-black md:col-span-2">الوصف<textarea rows={3} value={customForm.description} onChange={(event) => setCustomForm((old) => ({ ...old, description: event.target.value }))} className="mt-2 w-full rounded-2xl border p-3" /></label>
            </div>
            <button disabled={props.busy} className="mt-5 rounded-2xl bg-teal-700 px-6 py-3 text-sm font-black text-white disabled:opacity-50">حفظ الشاهد</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceEditor({ evidence, index, total, busy, onSave, onMove }: {
  evidence: PortfolioManagedEvidence;
  index: number;
  total: number;
  busy: boolean;
  onSave: (body: unknown) => Promise<void>;
  onMove: (direction: "up" | "down") => Promise<void>;
}) {
  const [title, setTitle] = useState(evidence.title === evidence.originalTitle ? "" : evidence.title);
  const [description, setDescription] = useState(evidence.description);
  const image = evidence.type === "IMAGE" || Boolean(evidence.url && /\.(png|jpe?g|webp|gif)$/i.test(evidence.url));
  return (
    <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 md:grid-cols-[80px_1fr_auto]">
      <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-xl bg-white text-slate-400">{image && evidence.url ? <img src={evidence.url} alt="" loading="lazy" className="h-full w-full object-cover" /> : image ? <ImageIcon className="h-6 w-6" /> : <File className="h-6 w-6" />}</div>
      <div><p className="text-xs font-black text-slate-500">{evidence.originalTitle || "شاهد دون عنوان"}</p><input placeholder="عنوان مخصص" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><textarea placeholder="وصف مخصص" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></div>
      <div className="flex flex-wrap content-start gap-2"><button disabled={busy || index === 0} onClick={() => void onMove("up")} className="rounded-xl border bg-white p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button disabled={busy || index === total - 1} onClick={() => void onMove("down")} className="rounded-xl border bg-white p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button><button disabled={busy} onClick={() => void onSave({ isVisible: !evidence.isVisible })} className="rounded-xl border bg-white p-2">{evidence.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button disabled={busy} onClick={() => void onSave({ customTitle: title, customDescription: description })} className="rounded-xl bg-teal-700 p-2 text-white"><Save className="h-4 w-4" /></button>{evidence.url ? <a href={evidence.url} target="_blank" rel="noreferrer" className="rounded-xl border bg-white p-2"><ExternalLink className="h-4 w-4" /></a> : null}</div>
    </div>
  );
}
