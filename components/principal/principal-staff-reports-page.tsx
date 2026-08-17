"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText, Link2, X } from "lucide-react";

import type { PrincipalStaffReportsWorkspace } from "@/lib/principal/principal-teachers-service";
import { getArabicUserRoleLabel } from "@/lib/auth/user-role-display";
import { PRINCIPAL_PERFORMANCE_ITEMS } from "@/lib/principal/performance-items";
import { PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES } from "@/lib/principal/evaluation-accreditation-services";
import { PortfolioPreviewFit } from "@/components/portfolio/portfolio-preview-fit";
import { MobileFeedbackPopCard } from "@/components/mobile-app/mobile-feedback-pop-card";

type WorkspaceProps = {
  workspace: PrincipalStaffReportsWorkspace;
};

const dateFormatter = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
});

const statusLabels: Record<string, string> = {
  GENERATED: "مُصدر",
  APPROVED: "معتمد",
  ARCHIVED: "مؤرشف",
};

export function PrincipalStaffReportsPage({ workspace }: WorkspaceProps) {
  const [selectedService, setSelectedService] = useState("all");
  const [previewReport, setPreviewReport] = useState<PrincipalStaffReportsWorkspace["reports"][number] | null>(null);
  const [linkReport, setLinkReport] = useState<PrincipalStaffReportsWorkspace["reports"][number] | null>(null);
  const [linkSaved, setLinkSaved] = useState(false);

  useEffect(() => {
    if (!linkSaved) return;
    const timeoutId = window.setTimeout(() => setLinkSaved(false), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [linkSaved]);

  const services = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const report of workspace.reports) {
      const current = map.get(report.serviceKey);
      map.set(report.serviceKey, {
        title: report.serviceTitle,
        count: (current?.count || 0) + 1,
      });
    }
    return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
  }, [workspace.reports]);

  const visibleReports = workspace.reports.filter(
    (report) => selectedService === "all" || report.serviceKey === selectedService,
  );

  return (
    <main dir="rtl" className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/principal/teachers"
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
          aria-label="العودة إلى منسوبي المدرسة"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">تقارير منسوب المدرسة</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{workspace.staff.name}</h1>
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">
              {getArabicUserRoleLabel({ role: workspace.staff.role, gender: workspace.staff.gender })}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Summary label="التقارير الصادرة" value={workspace.reports.length} />
            {workspace.staff.lastActivityAt ? (
              <Summary label="آخر نشاط" value={dateFormatter.format(new Date(workspace.staff.lastActivityAt))} />
            ) : null}
          </div>
        </div>
      </section>

      {services.length ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">الخدمات ذات التقارير</h2>
            {selectedService !== "all" ? (
              <button type="button" onClick={() => setSelectedService("all")} className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                عرض الكل
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedService("all")}
              className={serviceButtonClass(selectedService === "all")}
            >
              الكل <span>{workspace.reports.length}</span>
            </button>
            {services.map((service) => (
              <button
                key={service.key}
                type="button"
                onClick={() => setSelectedService(service.key)}
                className={serviceButtonClass(selectedService === service.key)}
              >
                {service.title} <span>{service.count}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        {visibleReports.length ? visibleReports.map((report) => (
          <article key={`${report.source}:${report.id}`} className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{report.serviceTitle}</span>
                  {statusLabels[report.status] ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{statusLabels[report.status]}</span> : null}
                </div>
                <h2 className="mt-3 text-lg font-black text-slate-950 dark:text-white">{report.title}</h2>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">صدر في {dateFormatter.format(new Date(report.issuedAt))}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => setPreviewReport(report)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-700 px-3 text-xs font-black text-white transition hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                  <FileText className="h-4 w-4" /> معاينة
                </button>
                <button type="button" onClick={() => setLinkReport(report)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-indigo-200 px-3 text-xs font-black text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50">
                  <Link2 className="h-4 w-4" /> ربط
                </button>
              </div>
            </div>
          </article>
        )) : (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-950">
            <FileText className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
            <h2 className="mt-3 text-lg font-black text-slate-900 dark:text-white">لا توجد تقارير صادرة</h2>
          </section>
        )}
      </section>

      {previewReport ? <PreviewDialog report={previewReport} onClose={() => setPreviewReport(null)} /> : null}
      {linkReport ? <LinkDialog userId={workspace.staff.id} report={linkReport} onClose={() => setLinkReport(null)} onSaved={() => {
        setPreviewReport(null);
        setLinkReport(null);
        setLinkSaved(true);
      }} /> : null}
      {linkSaved ? <MobileFeedbackPopCard kind="success" title="تم حفظ الربط" message="تم ربط التقرير بالعناصر المحددة." onDismiss={() => setLinkSaved(false)} /> : null}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-[11px] font-black text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{typeof value === "number" ? new Intl.NumberFormat("ar-SA").format(value) : value}</p></div>;
}

function serviceButtonClass(active: boolean) {
  return [
    "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
    active
      ? "border-indigo-700 bg-indigo-700 text-white"
      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
  ].join(" ");
}

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-slate-900" aria-label="إغلاق"><X className="h-5 w-5" /></button>
      </div>
      {children}
    </section>
  </div>;
}

function PreviewDialog({ report, onClose }: { report: PrincipalStaffReportsWorkspace["reports"][number]; onClose: () => void }) {
  return <DialogShell title={report.title} onClose={onClose}>
    <div className="max-h-[calc(92vh-5rem)] overflow-y-auto bg-slate-100 p-3 dark:bg-slate-900 sm:p-6">
      {report.previewHtml ? <PortfolioPreviewFit><div className="bg-white shadow-sm" dangerouslySetInnerHTML={{ __html: report.previewHtml }} /></PortfolioPreviewFit> : <p className="p-10 text-center font-bold text-slate-500">لا تتوفر معاينة لهذا التقرير.</p>}
    </div>
  </DialogShell>;
}

function LinkDialog({
  report,
  userId,
  onClose,
  onSaved,
}: {
  report: PrincipalStaffReportsWorkspace["reports"][number];
  userId: string;
  onClose: () => void;
  onSaved: (targetIds: string[]) => void;
}) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>(report.linkedTargetIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleTarget(targetId: string) {
    setSelectedTargets((current) => current.includes(targetId)
      ? current.filter((item) => item !== targetId)
      : [...current, targetId]);
  }

  async function saveLinks() {
    if (!selectedTargets.length) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/dashboard/principal/teachers/${encodeURIComponent(userId)}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: report.source, sourceId: report.id, targetIds: selectedTargets }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "تعذر حفظ الربط.");
      onSaved(selectedTargets);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الربط.");
    } finally {
      setSaving(false);
    }
  }

  return <DialogShell title={`ربط التقرير: ${report.title}`} onClose={onClose}>
    <div className="space-y-5 p-5" dir="rtl">
      <p className="text-sm font-bold leading-7 text-slate-500 dark:text-slate-400">اختر عنصرًا أو أكثر. سيُحفظ مرجع للتقرير دون نقله أو تغيير ملكيته.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <TargetGroup title="تقويم الأداء" items={PRINCIPAL_PERFORMANCE_ITEMS} selectedTargets={selectedTargets} onToggle={toggleTarget} />
        <TargetGroup title="التقييم والاعتماد" items={PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES} selectedTargets={selectedTargets} onToggle={toggleTarget} />
      </div>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900">إلغاء</button>
        <button type="button" disabled={!selectedTargets.length || saving} onClick={saveLinks} className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-black text-white transition hover:bg-indigo-800 disabled:opacity-50">{saving ? "جارٍ الحفظ..." : "حفظ الربط"}</button>
      </div>
    </div>
  </DialogShell>;
}

function TargetGroup({ title, items, selectedTargets, onToggle }: { title: string; items: ReadonlyArray<{ serviceSlug: string; shortTitle: string }>; selectedTargets: string[]; onToggle: (targetId: string) => void }) {
  return <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
    <h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
    <div className="mt-3 space-y-2">{items.map((item) => {
      const checked = selectedTargets.includes(item.serviceSlug);
      return <label key={item.serviceSlug} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-xs font-black transition ${checked ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200" : "border-slate-100 bg-slate-50 text-slate-700 hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"}`}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(item.serviceSlug)} className="h-4 w-4 accent-indigo-700" />
        <span>{item.shortTitle}</span>
      </label>;
    })}</div>
  </div>;
}
