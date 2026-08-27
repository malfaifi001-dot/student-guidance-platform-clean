"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ServiceOutputLinkActions } from "@/components/performance-links/service-output-link-actions";

type TargetItem = { key: string; title: string; serviceSlug?: string; kind?: string };
type ExistingLink = { id: string; performanceItemKey: string; targetSectionKey?: string | null };

export function PerformanceItemLinkPopCard({
  open,
  serviceSlug,
  roleContext,
  resourceType,
  sourceReference,
  displayTitle,
  existingLink,
  targetType = "performance-item",
  defaultTargetKey,
  onClose,
  onSaved,
  onDeleted,
  showDelete = false,
}: {
  open: boolean;
  serviceSlug: string;
  roleContext: string;
  resourceType: string;
  sourceReference: Record<string, unknown>;
  displayTitle: string;
  existingLink?: ExistingLink | null;
  targetType?: "performance-item" | "portfolio-section";
  defaultTargetKey?: string;
  onClose: () => void;
  onSaved: (link: ExistingLink) => void;
  onDeleted?: () => void;
  showDelete?: boolean;
}) {
  const [items, setItems] = useState<TargetItem[]>([]);
  const [selected, setSelected] = useState(
    existingLink?.targetSectionKey || existingLink?.performanceItemKey || defaultTargetKey || "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sectionTarget = targetType === "portfolio-section";
  const canDeleteLink = showDelete || serviceSlug === "student-activity-plan";
  const dialogTitle = sectionTarget ? "ربط بملف الإنجاز" : "ربط بعنصر أداء";

  useEffect(() => {
    if (!open) return;
    setSelected(existingLink?.targetSectionKey || existingLink?.performanceItemKey || defaultTargetKey || "");
    setError("");
    setBusy(true);
    const query = new URLSearchParams({
      serviceSlug,
      roleContext,
      ...(sectionTarget ? { targetType: "portfolio-section" } : {}),
    });
    fetch(`/api/dashboard/performance-links?${query.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "تعذر تحميل وجهات الربط.");
        setItems(sectionTarget ? payload.portfolioSections || [] : payload.performanceItems || []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر تحميل وجهات الربط."))
      .finally(() => setBusy(false));
  }, [defaultTargetKey, existingLink?.id, existingLink?.performanceItemKey, existingLink?.targetSectionKey, open, roleContext, sectionTarget, serviceSlug]);

  if (!open) return null;

  async function save() {
    if (!selected) {
      setError(sectionTarget ? "اختر قسمًا من ملف الإنجاز أولًا." : "اختر عنصر أداء أولًا.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        existingLink
          ? `/api/dashboard/performance-links/${encodeURIComponent(existingLink.id)}`
          : "/api/dashboard/performance-links",
        {
          method: existingLink ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceSlug,
            roleContext,
            resourceType,
            sourceReference,
            displayTitle,
            sourceKey: "school-account",
            ...(sectionTarget
              ? { targetType: "portfolio-section", targetSectionKey: selected }
              : { performanceItemKey: selected }),
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حفظ الربط.");
      onSaved(payload.link);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر حفظ الربط.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      dir="rtl"
      onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="performance-link-title" className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-2xl sm:max-h-[72vh] sm:p-5">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div>
            <h2 id="performance-link-title" className="text-lg font-black text-slate-950">{dialogTitle}</h2>
            <p className="mt-0.5 text-xs font-bold text-slate-500">{displayTitle}</p>
          </div>
          <button type="button" title="إغلاق" aria-label="إغلاق" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pe-1">
          {items.map((item) => (
            <label key={item.key} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${selected === item.key ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:bg-slate-50"}`}>
              <input className="h-4 w-4 shrink-0" type="radio" name="portfolio-link-target" checked={selected === item.key} onChange={() => setSelected(item.key)} />
              <span className="min-w-0 flex-1 text-sm font-bold text-slate-800">{item.title}</span>
              {selected === item.key ? <Check className="h-4 w-4 shrink-0 text-sky-700" /> : null}
            </label>
          ))}
          {busy && !items.length ? <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل وجهات الربط</p> : null}
        </div>
        {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
        <div className="mt-3 flex shrink-0 items-center gap-2">
          {existingLink && canDeleteLink ? <ServiceOutputLinkActions link={existingLink} onDeleted={() => { onDeleted?.(); onClose(); }} /> : null}
          <button type="button" onClick={onClose} disabled={busy} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50">
            إلغاء
          </button>
          <button type="button" disabled={busy || !selected} onClick={() => void save()} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}حفظ الربط
          </button>
        </div>
      </section>
    </div>
  );
}
