"use client";

import { ArrowLeft, ArrowRight, Award, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PortfolioContentPanel } from "@/components/portfolio/portfolio-content-panel";
import { PortfolioApproveVersion } from "@/components/portfolio/portfolio-approve-version";
import { PortfolioDesignPanel } from "@/components/portfolio/portfolio-design-panel";
import { PortfolioFeedbackPopCard, type PortfolioFeedback } from "@/components/portfolio/portfolio-feedback-pop-card";
import { PortfolioQualificationsPanel } from "@/components/portfolio/portfolio-qualifications-panel";
import { PortfolioReportsEvidencePanel } from "@/components/portfolio/portfolio-reports-evidence-panel";
import { PortfolioSectionsPanel } from "@/components/portfolio/portfolio-sections-panel";
import { PortfolioSavedCopies } from "@/components/portfolio/portfolio-saved-copies";
import { PortfolioSettingsPanel } from "@/components/portfolio/portfolio-settings-panel";
import { PortfolioWizardStepper, type PortfolioWizardStep } from "@/components/portfolio/portfolio-wizard-stepper";
import type { PortfolioWorkspaceData } from "@/lib/portfolio/portfolio-read-model";
import type { PortfolioCustomEvidence, PortfolioWorkspaceItem } from "@/lib/portfolio/portfolio-types";

const steps = [
  { id: "overview", label: "نظرة عامة" },
  { id: "settings", label: "إعدادات الملف" },
  { id: "content", label: "المحتوى" },
  { id: "qualifications", label: "المؤهلات والدورات" },
  { id: "reports", label: "التقارير والشواهد" },
  { id: "order", label: "ترتيب الأقسام" },
  { id: "preview", label: "المعاينة" },
  { id: "approve", label: "اعتماد النسخة" },
  { id: "saved", label: "النسخ المحفوظة" },
] as const satisfies readonly PortfolioWizardStep[];

type StepId = (typeof steps)[number]["id"];

export function PortfolioWorkspace({ initialData }: { initialData: PortfolioWorkspaceData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [activeStepId, setActiveStepId] = useState<StepId>("overview");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<PortfolioFeedback | null>(null);
  const [snapshotApproved, setSnapshotApproved] = useState(false);
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);
  useEffect(() => setData(initialData), [initialData]);
  const base = `/api/dashboard/portfolio/${data.portfolio.id}`;
  const activeStepIndex = steps.findIndex((step) => step.id === activeStepId);
  const completedStepIds = steps
    .filter((step, index) => index < activeStepIndex && (step.id !== "approve" || snapshotApproved))
    .map((step) => step.id);

  function goToStep(stepId: string) {
    if (steps.some((step) => step.id === stepId)) {
      setActiveStepId(stepId as StepId);
    }
  }

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

  async function approveSnapshot(input: { name: string; notes: string }) {
    setBusy(true);
    try {
      const response = await fetch(`${base}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر اعتماد نسخة ملف الإنجاز.");
      setSnapshotApproved(true);
      setSnapshotRefreshKey((value) => value + 1);
      setFeedback({
        type: "success",
        title: "تم اعتماد النسخة",
        description: "حُفظت نسخة ثابتة من ملف الإنجاز ويمكن فتحها من النسخ المحفوظة.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        title: "تعذر اعتماد النسخة",
        description: error instanceof Error ? error.message : "حاول مرة أخرى.",
      });
    } finally {
      setBusy(false);
    }
  }

  function requestSnapshotApproval(input: { name: string; notes: string }) {
    setFeedback({
      type: "confirm",
      title: "اعتماد وحفظ النسخة؟",
      description: "سيتم حفظ نسخة ثابتة من ملف الإنجاز بالحالة الحالية، ويمكن الرجوع إليها لاحقًا من النسخ المحفوظة.",
      confirmLabel: "اعتماد وحفظ النسخة",
      onConfirm: () => void approveSnapshot(input),
    });
  }

  return <main dir="rtl" className="space-y-5">
    <section className="overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sky-800 via-cyan-700 to-sky-500 p-8 text-white shadow-xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-black">{data.portfolio.title}</h1>
          <p className="mt-4 text-sm font-bold leading-8 text-sky-50">{data.portfolio.description || "أدر محتوى ملف الإنجاز وترتيبه ثم راجع النسخة الحية قبل الطباعة."}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end" aria-label="إحصاءات ملف الإنجاز">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-black text-white shadow-sm backdrop-blur-sm">
            <FileText className="h-4 w-4 text-sky-100" aria-hidden="true" />
            التقارير: {data.totals.reports}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-black text-white shadow-sm backdrop-blur-sm">
            <Award className="h-4 w-4 text-sky-100" aria-hidden="true" />
            الشواهد: {data.totals.evidences}
          </span>
        </div>
      </div>
    </section>
    <PortfolioWizardStepper steps={steps} activeStepId={activeStepId} completedStepIds={completedStepIds} onStepChange={goToStep} />
    {activeStepId === "overview" ? <Overview data={data} /> : null}
    {activeStepId === "settings" ? <PortfolioSettingsPanel key={`${data.portfolio.id}-${data.portfolio.title}`} data={data} busy={busy} onSave={savePortfolio} /> : null}
    {activeStepId === "content" ? <PortfolioContentPanel key={`${data.portfolio.id}-${data.portfolio.introText}-${JSON.stringify(data.educationIdentity)}`} data={data} busy={busy} onSave={savePortfolio} /> : null}
    {activeStepId === "qualifications" ? <PortfolioQualificationsPanel items={data.qualificationItems} busy={busy} onUpload={uploadQualificationImage} onCreate={createItem} onUpdate={updateItem} onMove={moveItem} onDelete={confirmDelete} /> : null}
    {activeStepId === "reports" ? <PortfolioReportsEvidencePanel data={data} busy={busy} onSync={syncReports} onReportVisibility={reportVisibility} onReportMove={reportMove} onEvidenceUpdate={evidenceUpdate} onEvidenceMove={evidenceMove} onCustomCreate={customCreate} onCustomUpdate={customUpdate} onCustomMove={customMove} onCustomDelete={confirmCustomDelete} /> : null}
    {activeStepId === "order" ? <PortfolioSectionsPanel sections={data.sections} showWeights={data.showWeights} busy={busy} onToggle={toggleSection} onMove={moveSection} /> : null}
    {activeStepId === "preview" ? <div className="space-y-5"><div><h2 className="text-xl font-black text-slate-950">اختيار التصميم</h2><p className="mt-1 text-sm font-bold text-slate-500">اختر الشكل النهائي واضبط خيارات العرض قبل اعتماد النسخة.</p></div><PortfolioDesignPanel data={data} busy={busy} onSave={savePortfolio} /></div> : null}
    {activeStepId === "approve" ? <PortfolioApproveVersion busy={busy} approved={snapshotApproved} onApprove={requestSnapshotApproval} onOpenSavedCopies={() => goToStep("saved")} /> : null}
    {activeStepId === "saved" ? <PortfolioSavedCopies portfolioId={data.portfolio.id} snapshotBasePath={data.routes.snapshots} refreshKey={snapshotRefreshKey} /> : null}
    <nav aria-label="التنقل بين خطوات ملف الإنجاز" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <button type="button" disabled={activeStepIndex === 0} onClick={() => goToStep(steps[activeStepIndex - 1]?.id || activeStepId)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ArrowRight className="h-4 w-4" />السابق</button>
      <p className="hidden text-xs font-black text-slate-400 sm:block">الخطوة {activeStepIndex + 1} من {steps.length}</p>
      <button type="button" disabled={activeStepIndex === steps.length - 1} onClick={() => goToStep(steps[activeStepIndex + 1]?.id || activeStepId)} className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-black text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">التالي<ArrowLeft className="h-4 w-4" /></button>
    </nav>
    <PortfolioFeedbackPopCard feedback={feedback} loading={busy} onClose={() => !busy && setFeedback(null)} />
  </main>;
}

function Overview({ data }: { data: PortfolioWorkspaceData }) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black text-slate-950">{data.showWeights ? "عناصر الأداء" : "أقسام الخدمات"}</h2>{data.performanceSections.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{data.performanceSections.map((section) => <div key={section.key} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><h3 className="text-sm font-black text-slate-900">{section.title}</h3><p className="mt-1 text-xs font-bold text-slate-400">{data.showWeights ? `الوزن ${section.weight}% · ` : ""}{section.isEnabled ? "ظاهر" : "مخفي"}</p></div><span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">{section.reports.length}</span></div></div>)}</div> : <p className="mt-4 text-sm font-bold text-slate-500">لا توجد أقسام خدمات مضافة لهذا الدور حاليًا.</p>}</section>;
}
