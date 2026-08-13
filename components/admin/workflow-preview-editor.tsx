"use client";

import { Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";

import { WorkflowFieldSettingsPanel } from "@/components/admin/workflow-field-settings-panel";
import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import type { WorkflowFieldBehaviorConfig } from "@/lib/workflows/field-behavior-config";

type Props = { workflow: RuntimeWorkflow; serviceId: string; title: string };

export function WorkflowPreviewEditor({ workflow: initialWorkflow, serviceId, title }: Props) {
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [editingMode, setEditingMode] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState("");
  const allFields = useMemo(() => workflow.steps.flatMap((step) => step.fields), [workflow]);
  const selectedField = allFields.find((field) => field.id === selectedFieldId) ?? null;

  async function saveConfig(config: WorkflowFieldBehaviorConfig) {
    if (!selectedField) return;
    try {
      setSaving(true); setError("");
      const response = await fetch(`/api/dashboard/admin/workflows/${encodeURIComponent(workflow.serviceSlug)}/fields/${encodeURIComponent(selectedField.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id, behaviorConfig: config }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ إعدادات الحقل.");
      setWorkflow((current) => ({ ...current, steps: current.steps.map((step) => ({ ...step, fields: step.fields.map((field) => field.id === selectedField.id ? { ...field, behaviorConfig: data.field.behaviorConfig } : field) })) }));
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "تعذر حفظ إعدادات الحقل."); }
    finally { setSaving(false); }
  }

  async function reorderFields(stepId: string, fieldIds: string[]) {
    if (reordering) return;
    const previous = workflow;
    const order = new Map(fieldIds.map((id, index) => [id, index + 1]));
    setWorkflow((current) => ({ ...current, steps: current.steps.map((step) => step.id === stepId ? { ...step, fields: [...step.fields].map((field) => ({ ...field, order: order.get(field.id) ?? field.order })).sort((a, b) => a.order - b.order) } : step) }));
    try {
      setReordering(true);
      setError("");
      const response = await fetch(`/api/dashboard/admin/workflows/${encodeURIComponent(workflow.serviceSlug)}/steps/${encodeURIComponent(stepId)}/reorder-fields`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workflowId: workflow.id, fieldIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ ترتيب الحقول.");
    } catch (reorderError) { setWorkflow(previous); setError(reorderError instanceof Error ? reorderError.message : "تعذر حفظ ترتيب الحقول."); }
    finally { setReordering(false); }
  }

  return (
    <section className="space-y-4">
      <div className="sticky top-3 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div><p className="text-sm font-black text-slate-900">{editingMode ? "وضع تحرير الحقول" : "معاينة التشغيل الفعلية"}</p><p className="mt-1 text-xs font-bold text-slate-500">{reordering ? "جاري حفظ ترتيب الحقول..." : editingMode ? "انقر حقلًا لضبطه، واسحبه لتغيير ترتيبه داخل الخطوة." : "تستخدم المعاينة نفس مكوّن النموذج المستخدم في التشغيل."}</p></div>
        <button type="button" onClick={() => { setEditingMode((value) => !value); setSelectedFieldId(null); setError(""); }} className={editingMode ? "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700" : "inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white"}>
          {editingMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{editingMode ? "إنهاء التحرير" : "تحرير"}
        </button>
      </div>
      {error && !selectedField ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
      <DynamicFormRenderer workflow={workflow} serviceId={serviceId} title={title} previewMode editingMode={editingMode} selectedFieldId={selectedFieldId} onSelectField={(field) => setSelectedFieldId(field.id)} onReorderFields={reorderFields} />
      {editingMode && selectedField ? <WorkflowFieldSettingsPanel key={`${selectedField.id}:${JSON.stringify(selectedField.behaviorConfig)}`} field={selectedField} availableFields={allFields} saving={saving} error={error} onClose={() => { setSelectedFieldId(null); setError(""); }} onSave={saveConfig} /> : null}
    </section>
  );
}
