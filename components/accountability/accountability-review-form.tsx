"use client";

import { useState } from "react";
import { DynamicFieldRenderer } from "@/components/workflow/dynamic-field-renderer";
import type { RuntimeField, RuntimeStep, RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";

export function AccountabilityReviewForm({ requestId, workflow, reviewStep, managerValues, respondentValues, initialValues }: { requestId: string; workflow: RuntimeWorkflow; reviewStep: RuntimeStep; managerValues: Record<string, unknown>; respondentValues: Record<string, unknown>; initialValues: Record<string, unknown> }) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [action, setAction] = useState<"RETURN" | "CLOSE" | "REFER" | null>(null);
  const [returnedReason, setReturnedReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const allValues = { ...managerValues, ...respondentValues, ...values };

  async function submit(nextAction: "RETURN" | "CLOSE" | "REFER") {
    if (nextAction === "RETURN" && !returnedReason.trim()) { setMessage("يرجى كتابة سبب طلب الاستكمال."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/dashboard/principal/accountability/${requestId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: nextAction, values, returnedReason }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "تعذر حفظ قرار المراجعة.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر حفظ قرار المراجعة."); setBusy(false); }
  }

  return <section className="space-y-5 rounded-[2rem] border border-indigo-100 bg-indigo-50/50 p-5"><div><p className="text-xs font-black text-indigo-700">الإجراء الإداري</p><h2 className="mt-1 text-2xl font-black text-indigo-950">مراجعة الإفادة</h2></div><div className="grid gap-5 md:grid-cols-2">{reviewStep.fields.map((field: RuntimeField) => isConditionalWorkflowFieldVisible(field, allValues) ? <DynamicFieldRenderer key={field.id} field={field} workflow={workflow} value={values[field.key]} values={allValues} onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} /> : null)}</div>{action === "RETURN" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><label className="text-sm font-black text-amber-950">سبب طلب الاستكمال</label><textarea value={returnedReason} onChange={(event) => setReturnedReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm font-bold outline-none" /></div> : null}{message ? <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{message}</p> : null}<div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => { setAction("RETURN"); if (returnedReason.trim()) void submit("RETURN"); }} className="min-h-11 rounded-xl bg-amber-600 px-5 text-sm font-black text-white disabled:opacity-50">طلب استكمال الإفادة</button><button type="button" disabled={busy} onClick={() => void submit("CLOSE")} className="min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white disabled:opacity-50">إغلاق المتابعة</button><button type="button" disabled={busy} onClick={() => void submit("REFER")} className="min-h-11 rounded-xl bg-slate-700 px-5 text-sm font-black text-white disabled:opacity-50">إحالة</button></div></section>;
}
