"use client";

import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

type PerformanceItem = { key: string; title: string; serviceSlug: string };
type ExistingLink = { id: string; performanceItemKey: string };

export function PerformanceItemLinkPopCard({ open, serviceSlug, roleContext, resourceType, sourceReference, displayTitle, existingLink, onClose, onSaved }: {
  open: boolean;
  serviceSlug: string;
  roleContext: string;
  resourceType: string;
  sourceReference: Record<string, unknown>;
  displayTitle: string;
  existingLink?: ExistingLink | null;
  onClose: () => void;
  onSaved: (link: ExistingLink) => void;
}) {
  const [items, setItems] = useState<PerformanceItem[]>([]);
  const [selected, setSelected] = useState(existingLink?.performanceItemKey || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!open) return; setSelected(existingLink?.performanceItemKey || ""); setError(""); setBusy(true); fetch(`/api/dashboard/performance-links?serviceSlug=${encodeURIComponent(serviceSlug)}&roleContext=${encodeURIComponent(roleContext)}`, { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "تعذر تحميل عناصر الأداء."); setItems(payload.performanceItems || []); }).catch((reason) => setError(reason instanceof Error ? reason.message : "تعذر تحميل عناصر الأداء.")).finally(() => setBusy(false)); }, [open, serviceSlug, roleContext, existingLink?.performanceItemKey]);
  if (!open) return null;
  async function save() {
    if (!selected) { setError("اختر عنصر أداء أولًا."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(existingLink ? `/api/dashboard/performance-links/${encodeURIComponent(existingLink.id)}` : "/api/dashboard/performance-links", { method: existingLink ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceSlug, roleContext, resourceType, sourceReference, performanceItemKey: selected, displayTitle, sourceKey: [sourceReference.subjectId, sourceReference.semesterId].filter(Boolean).join(":") }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر حفظ الربط.");
      onSaved(payload.link); onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذر حفظ الربط."); } finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" dir="rtl" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}><section role="dialog" aria-modal="true" aria-labelledby="performance-link-title" className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 id="performance-link-title" className="text-xl font-black text-slate-950">ربط بعنصر أداء</h2><p className="mt-1 text-sm font-bold text-slate-500">{displayTitle}</p></div><button type="button" title="إغلاق" aria-label="إغلاق" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="mt-5 space-y-2">{items.map((item) => <label key={item.key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${selected === item.key ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}><input type="radio" name="performance-item" checked={selected === item.key} onChange={() => setSelected(item.key)} /><span className="min-w-0 flex-1 text-sm font-black text-slate-800">{item.title}</span>{selected === item.key ? <Check className="h-4 w-4 text-sky-700" /> : null}</label>)}{busy && !items.length ? <p className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> جارٍ تحميل عناصر الأداء</p> : null}</div>{error ? <p role="alert" className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}<button type="button" disabled={busy || !selected} onClick={() => void save()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}حفظ الربط</button></section></div>;
}
