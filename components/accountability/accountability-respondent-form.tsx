"use client";

import { useState } from "react";
import { DynamicFieldRenderer } from "@/components/workflow/dynamic-field-renderer";
import { isConditionalWorkflowFieldVisible } from "@/engine/runtime/workflow-conditional-logic";
import type { RuntimeField, RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

type Attachment = { fileName: string; fileUrl: string; mimeType: string; size: number };

export function AccountabilityRespondentForm({ token, workflow, respondentStep, dependencyValues, initialValues, initialEvidenceItems }: { token: string; workflow: RuntimeWorkflow; respondentStep: RuntimeWorkflow["steps"][number]; dependencyValues: Record<string, unknown>; initialValues: Record<string, unknown>; initialEvidenceItems: Attachment[] }) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [attachments, setAttachments] = useState<Attachment[]>(initialEvidenceItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const allValues = { ...dependencyValues, ...values };

  async function change(field: RuntimeField, value: unknown) {
    if (value instanceof File) {
      const data = new FormData(); data.append("file", value); setBusy(true); setMessage("");
      try { const response = await fetch(`/api/accountability/respond/${encodeURIComponent(token)}/upload`, { method: "POST", body: data }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || "تعذر رفع الملف."); setAttachments((current) => [...current, result.item]); setValues((current) => ({ ...current, [field.key]: result.item.fileUrl })); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر رفع الملف."); } finally { setBusy(false); }
      return;
    }
    setValues((current) => ({ ...current, [field.key]: value }));
  }

  async function submit() {
    setBusy(true); setMessage("");
    try { const response = await fetch(`/api/accountability/respond/${encodeURIComponent(token)}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ respondentValues: values, evidenceItems: attachments }) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || "تعذر إرسال الإفادة."); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر إرسال الإفادة."); } finally { setBusy(false); }
  }

  return <section className="space-y-5"><div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black text-indigo-700">بيانات الإفادة</p><div className="mt-5 grid gap-5 md:grid-cols-2">{respondentStep.fields.map((field) => isConditionalWorkflowFieldVisible(field, allValues) ? <DynamicFieldRenderer key={field.id} field={field} workflow={workflow} value={values[field.key]} values={allValues} onChange={(_key, value) => void change(field, value)} /> : null)}</div></div>{attachments.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-600">تم إرفاق {attachments.length} ملف.</p> : null}{message ? <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{message}</p> : null}<button type="button" disabled={busy} onClick={() => void submit()} className="min-h-12 w-full rounded-2xl bg-indigo-700 px-6 text-sm font-black text-white disabled:opacity-50">{busy ? "جارٍ المعالجة..." : "إرسال الإفادة"}</button></section>;
}
