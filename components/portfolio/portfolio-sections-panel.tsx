"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, LockKeyhole } from "lucide-react";
import type { PortfolioWorkspaceData } from "@/lib/portfolio/portfolio-read-model";

export function PortfolioSectionsPanel({ sections, showWeights, busy, onToggle, onMove }: {
  sections: PortfolioWorkspaceData["sections"]; busy: boolean;
  showWeights: boolean;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onMove: (id: string, direction: "up" | "down") => Promise<void>;
}) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-xl font-black text-slate-950">ترتيب الأقسام</h2><p className="mt-1 text-sm font-bold text-slate-500">الغلاف ثابت دائمًا، ويمكن إدارة بقية الأقسام.</p></div>
    <div className="mt-5 space-y-3"><div className="flex items-center justify-between rounded-2xl border border-teal-100 bg-teal-50 p-4"><strong className="text-sm text-teal-900">الغلاف</strong><span className="inline-flex items-center gap-2 text-xs font-black text-teal-700"><LockKeyhole className="h-4 w-4" />إلزامي</span></div>
      {sections.map((section, index) => <article key={section.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4"><div><strong className="text-sm text-slate-900">{section.title}</strong><p className="mt-1 text-xs font-bold text-slate-400">{section.kind === "PERFORMANCE_ELEMENT" ? (showWeights ? "عنصر أداء" : "قسم خدمات") : "قسم تعريفي"}</p></div><div className="flex gap-2"><button disabled={busy || index === 0} onClick={() => void onMove(section.id, "up")} className="rounded-xl border p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button><button disabled={busy || index === sections.length - 1} onClick={() => void onMove(section.id, "down")} className="rounded-xl border p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button><button disabled={busy} onClick={() => void onToggle(section.id, !section.isEnabled)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${section.isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{section.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{section.isEnabled ? "ظاهر" : "مخفي"}</button></div></article>)}
    </div></section>;
}
