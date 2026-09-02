import { ArrowUpLeft, FileText, ListChecks, Search, Workflow } from "lucide-react";
import type { WorkflowSearchResult } from "@/lib/workflow-search/workflow-search-types";

const typeLabels = { SERVICE: "خدمة", WORKFLOW: "إجراء", STEP: "مرحلة", FIELD: "حقل" } as const;

export function WorkflowSearchResults({ results, onSelect }: { results: WorkflowSearchResult[]; onSelect: (result: WorkflowSearchResult) => void }) {
  if (!results.length) return <div className="px-4 py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400"><Search className="mx-auto mb-2 h-6 w-6 text-slate-300" />لم نجد نتيجة مطابقة. جرّب اسمًا آخر.</div>;
  return <div className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">{results.map((result) => { const Icon = result.type === "FIELD" ? FileText : result.type === "STEP" ? ListChecks : Workflow; return <button key={result.id} type="button" onClick={() => onSelect(result)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-950 dark:text-white">{result.title}</span><span className="mt-0.5 block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{result.subtitle || result.serviceTitle}</span></span><span className="flex shrink-0 items-center gap-1 text-[11px] font-black text-slate-400">{typeLabels[result.type]}<ArrowUpLeft className="h-3.5 w-3.5" /></span></button>; })}</div>;
}
