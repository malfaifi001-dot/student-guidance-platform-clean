"use client";

import { Award, BookOpenCheck, ExternalLink, FileText, Printer, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PortfolioContentPanel } from "@/components/portfolio/portfolio-content-panel";
import { PortfolioDesignPanel } from "@/components/portfolio/portfolio-design-panel";
import { PortfolioFeedbackPopCard, type PortfolioFeedback } from "@/components/portfolio/portfolio-feedback-pop-card";
import { PortfolioQualificationsPanel } from "@/components/portfolio/portfolio-qualifications-panel";
import { PortfolioReportsEvidencePanel } from "@/components/portfolio/portfolio-reports-evidence-panel";
import { PortfolioSectionsPanel } from "@/components/portfolio/portfolio-sections-panel";
import { PortfolioSettingsPanel } from "@/components/portfolio/portfolio-settings-panel";
import type { TeacherPortfolioWorkspace } from "@/lib/portfolio/portfolio-read-model";
import type { PortfolioCustomEvidence, PortfolioWorkspaceItem } from "@/lib/portfolio/portfolio-types";

const tabs = ["نظرة عامة", "إعدادات الملف", "التصميم", "المحتوى", "المؤهلات والدورات", "التقارير والشواهد", "ترتيب الأقسام", "المعاينة"] as const;
type Tab = (typeof tabs)[number];

export function PortfolioWorkspace({ initialData }: { initialData: TeacherPortfolioWorkspace }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Tab>("نظرة عامة");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PortfolioFeedback | null>(null);
  useEffect(() => setData(initialData), [initialData]);
  const base = `/api/dashboard/portfolio/${data.portfolio.id}`;

  async function request(url: string, init: RequestInit, success = "تم حفظ التغييرات بنجاح.") {
    setBusy(true);
    try {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر إكمال العملية.");
      setFeedback({ type: "success", title: "تم الحفظ", description: success });
      router.refresh();
    } catch (error) {
      setFeedback({ type: "error", title: "تعذر الحفظ", description: error instanceof Error ? error.message : "حاول مرة أخرى." });
      throw error;
    } finally { setBusy(false); }
  }

  const savePortfolio = (body: unknown) => request(base, { method: "PATCH", body: JSON.stringify(body) });
  const createItem = (body: unknown) => request(`${base}/items`, { method: "POST", body: JSON.stringify(body) }, "تمت إضافة العنصر.");
  const updateItem = (id: string, body: unknown) => request(`${base}/items/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  const moveItem = (id: string, direction: "up" | "down") => request(`${base}/items/${id}`, { method: "PATCH", body: JSON.stringify({ action: "move", direction }) }, "تم تحديث ترتيب العناصر.");
  const toggleSection = (id: string, isEnabled: boolean) => request(`${base}/sections/${id}`, { method: "PATCH", body: JSON.stringify({ isEnabled }) });
  const moveSection = (id: string, direction: "up" | "down") => request(`${base}/sections/${id}/move`, { method: "POST", body: JSON.stringify({ direction }) }, "تم تحديث ترتيب الأقسام.");
  const syncReports = () => request(`${base}/reports/sync`, { method: "POST" }, "تمت مزامنة التقارير المتاحة.");
  const reportVisibility = (id: string, isVisible: boolean) => request(`${base}/reports/${id}`, { method: "PATCH", body: JSON.stringify({ isVisible }) });
  const reportMove = (id: string, direction: "up" | "down") => request(`${base}/reports/${id}/move`, { method: "POST", body: JSON.stringify({ direction }) }, "تم تحديث ترتيب التقارير.");
  const evidenceUpdate = (itemId: string, evidenceId: string, body: unknown) => request(`${base}/reports/${itemId}/evidence/${encodeURIComponent(evidenceId)}`, { method: "PATCH", body: JSON.stringify(body) });
  const evidenceMove = (itemId: string, evidenceId: string, direction: "up" | "down") => request(`${base}/reports/${itemId}/evidence/${encodeURIComponent(evidenceId)}/move`, { method: "POST", body: JSON.stringify({ direction }) }, "تم تحديث ترتيب الشواهد.");
  const customCreate = (body: unknown) => request(`${base}/custom-evidence`, { method: "POST", body: JSON.stringify(body) }, "تمت إضافة الشاهد المستقل.");
  const customUpdate = (id: string, body: unknown) => request(`${base}/custom-evidence/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  const customMove = (id: string, direction: "up" | "down") => request(`${base}/custom-evidence/${id}/move`, { method: "POST", body: JSON.stringify({ direction }) }, "تم تحديث ترتيب الشواهد المستقلة.");

  async function uploadQualificationImage(file: File) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch(`${base}/uploads`, { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر رفع الصورة.");
      return payload as { attachmentUrl: string; attachmentMimeType: "image/jpeg" | "image/png" | "image/webp"; attachmentKind: "IMAGE" };
    } catch (error) {
      setFeedback({ type: "error", title: "تعذر رفع الصورة", description: error instanceof Error ? error.message : "حاول مرة أخرى." });
      throw error;
    } finally { setBusy(false); }
  }

  function confirmDelete(item: PortfolioWorkspaceItem) {
    setFeedback({ type: "confirm", title: "حذف العنصر؟", description: `سيتم حذف «${item.title}» من ملف الإنجاز.`, confirmLabel: "حذف", onConfirm: () => { void request(`${base}/items/${item.id}`, { method: "DELETE" }, "تم حذف العنصر.").then(() => setFeedback(null)); } });
  }

  function confirmCustomDelete(item: PortfolioCustomEvidence) {
    setFeedback({ type: "confirm", title: "حذف الشاهد المستقل؟", description: `سيُحذف «${item.title}» من ملف الإنجاز فقط، ولن يُحذف الملف الأصلي.`, confirmLabel: "حذف", onConfirm: () => { void request(`${base}/custom-evidence/${item.id}`, { method: "DELETE" }, "تم حذف الشاهد المستقل.").then(() => setFeedback(null)); } });
  }

  return <main dir="rtl" className="space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"><div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-sm font-black text-teal-700">مساحة المعلم</p><h1 className="mt-2 text-3xl font-black text-slate-950">{data.portfolio.title}</h1><p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">{data.portfolio.description || "أدر محتوى ملف الإنجاز وترتيبه ثم راجع النسخة الحية قبل الطباعة."}</p></div><Link href={`/teacher/portfolio/print?portfolioId=${data.portfolio.id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"><Printer className="h-4 w-4" />معاينة الملف</Link></div></section>
    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === item ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{item}</button>)}</nav>
    {tab === "نظرة عامة" ? <Overview data={data} /> : null}
    {tab === "إعدادات الملف" ? <PortfolioSettingsPanel key={`${data.portfolio.id}-${data.portfolio.title}`} data={data} busy={busy} onSave={savePortfolio} /> : null}
    {tab === "التصميم" ? <PortfolioDesignPanel data={data} busy={busy} onSave={savePortfolio} /> : null}
    {tab === "المحتوى" ? <PortfolioContentPanel key={`${data.portfolio.id}-${data.portfolio.introText}-${JSON.stringify(data.educationIdentity)}`} data={data} busy={busy} onSave={savePortfolio} /> : null}
    {tab === "المؤهلات والدورات" ? <PortfolioQualificationsPanel items={data.qualificationItems} busy={busy} onUpload={uploadQualificationImage} onCreate={createItem} onUpdate={updateItem} onMove={moveItem} onDelete={confirmDelete} /> : null}
    {tab === "التقارير والشواهد" ? <PortfolioReportsEvidencePanel data={data} busy={busy} onSync={syncReports} onReportVisibility={reportVisibility} onReportMove={reportMove} onEvidenceUpdate={evidenceUpdate} onEvidenceMove={evidenceMove} onCustomCreate={customCreate} onCustomUpdate={customUpdate} onCustomMove={customMove} onCustomDelete={confirmCustomDelete} /> : null}
    {tab === "ترتيب الأقسام" ? <PortfolioSectionsPanel sections={data.sections} busy={busy} onToggle={toggleSection} onMove={moveSection} /> : null}
    {tab === "المعاينة" ? <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">المعاينة الحية</h2><p className="mt-2 text-sm font-bold text-slate-500">افتح المعاينة المستقلة لرؤية صفحات A4 دون ترويسة أو شريط لوحة التحكم.</p><Link href={`/teacher/portfolio/print?portfolioId=${data.portfolio.id}`} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"><ExternalLink className="h-4 w-4" />فتح المعاينة</Link></section> : null}
    <PortfolioFeedbackPopCard feedback={feedback} loading={busy} onClose={() => !busy && setFeedback(null)} />
  </main>;
}

function Overview({ data }: { data: TeacherPortfolioWorkspace }) {
  const cards = [[UserRound, "صاحب الملف", data.owner.name], [BookOpenCheck, "الفصل", data.portfolio.term], [FileText, "التقارير", String(data.totals.reports)], [Award, "الشواهد", String(data.totals.evidences)]] as const;
  return <div className="space-y-5"><section className="grid gap-4 md:grid-cols-4">{cards.map(([Icon, label, value]) => <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-6 w-6 text-teal-700" /><p className="mt-3 text-xs font-black text-slate-400">{label}</p><strong className="mt-1 block text-lg font-black text-slate-900">{value}</strong></div>)}</section><section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black text-slate-950">عناصر الأداء</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{data.performanceSections.map((section) => <div key={section.key} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">{section.title}</h3><p className="mt-1 text-xs font-bold text-slate-400">الوزن {section.weight}% · {section.isEnabled ? "ظاهر" : "مخفي"}</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{section.reports.length}</span></div></div>)}</div></section></div>;
}
