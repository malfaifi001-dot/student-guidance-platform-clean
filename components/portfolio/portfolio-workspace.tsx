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

  return <main dir="rtl" className="space-y-4">
    <section className="rounded-2xl border border-sky-100 bg-white px-4 py-4 shadow-sm dark:border-sky-900/50 dark:bg-slate-950 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black text-sky-700 dark:text-sky-300">ملف الإنجاز</p>
          <h1 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">{data.portfolio.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="إحصاءات ملف الإنجاز">
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <FileText className="h-4 w-4 text-sky-600 dark:text-sky-300" aria-hidden="true" />
            التقارير: {data.totals.reports}
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
            <Award className="h-4 w-4 text-sky-600 dark:text-sky-300" aria-hidden="true" />
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
    <nav aria-label="التنقل بين خطوات ملف الإنجاز" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <button type="button" disabled={activeStepIndex === 0} onClick={() => goToStep(steps[activeStepIndex - 1]?.id || activeStepId)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"><ArrowRight className="h-4 w-4" />السابق</button>
      <p className="text-xs font-black text-slate-400">الخطوة {activeStepIndex + 1} من {steps.length}</p>
      <button type="button" disabled={activeStepIndex === steps.length - 1} onClick={() => goToStep(steps[activeStepIndex + 1]?.id || activeStepId)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-black text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">التالي<ArrowLeft className="h-4 w-4" /></button>
    </nav>
    <PortfolioFeedbackPopCard feedback={feedback} loading={busy} onClose={() => !busy && setFeedback(null)} />
  </main>;
}

function Overview({ data }: { data: PortfolioWorkspaceData }) {
  const groupedSections = Array.from(
    data.performanceSections.reduce((groups, section) => {
      const key = section.group?.key || "services";
      const current = groups.get(key) || {
        key,
        title: section.group?.title || null,
        order: section.group?.order ?? Number.MAX_SAFE_INTEGER,
        sections: [],
      };
      current.sections.push(section);
      groups.set(key, current);
      return groups;
    }, new Map<string, {
      key: string;
      title: string | null;
      order: number;
      sections: PortfolioWorkspaceData["performanceSections"];
    }>()),
  )
    .map(([, group]) => group)
    .sort((first, second) => first.order - second.order);
  const hasNamedGroups = groupedSections.some((group) => group.title);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">
        {data.showWeights ? "عناصر الأداء" : "أقسام الخدمات"}
      </h2>
      {data.performanceSections.length ? (
        hasNamedGroups ? (
          <div className="mt-4 space-y-4">
            {groupedSections.map((group) => (
              <section
                key={group.key}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">{group.title}</h3>
                  <span className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">
                    {group.sections.length} خدمة
                  </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {group.sections.map((section) => (
                    <ServiceSectionCard
                      key={section.key}
                      section={section}
                      showWeights={data.showWeights}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {data.performanceSections.map((section) => (
              <ServiceSectionCard
                key={section.key}
                section={section}
                showWeights={data.showWeights}
              />
            ))}
          </div>
        )
      ) : (
        <p className="mt-3 text-sm font-bold text-slate-500">
          لا توجد أقسام خدمات مضافة لهذا الدور حاليًا.
        </p>
      )}
    </section>
  );
}

function ServiceSectionCard({
  section,
  showWeights,
}: {
  section: PortfolioWorkspaceData["performanceSections"][number];
  showWeights: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${section.reports.length + section.linkedOutputs.length > 0 ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" : "border-slate-100 bg-slate-50/60 opacity-65 dark:border-slate-800 dark:bg-slate-900/50"}`}>
      <div className="flex justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">{section.title}</h4>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            {showWeights ? `الوزن ${section.weight}%` : "قسم الخدمة"}
          </p>
        </div>
        <span className={`h-fit rounded-lg px-2.5 py-1 text-xs font-black ${section.reports.length + section.linkedOutputs.length > 0 ? "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
          {section.reports.length + section.linkedOutputs.length}
        </span>
      </div>
    </div>
  );
}
