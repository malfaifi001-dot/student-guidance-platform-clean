"use client";

import { GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import type { RuntimeField, RuntimeOption } from "@/engine/runtime/runtime-resolver";
import {
  DEFAULT_WORKFLOW_FIELD_AI_CONFIG,
  parseWorkflowFieldBehaviorConfig,
  supportsWorkflowFieldAi,
  WORKFLOW_AI_ACTION_LABELS,
  WORKFLOW_AI_ACTIONS,
  type WorkflowFieldBehaviorConfig,
} from "@/lib/workflows/field-behavior-config";
import { supportsWorkflowFieldOptions } from "@/lib/workflows/workflow-field-options";

export type WorkflowFieldSettingsInput = {
  label: string;
  placeholder: string | null;
  helpText: string | null;
  isRequired: boolean;
  allowOther: boolean;
  behaviorConfig: WorkflowFieldBehaviorConfig;
};

type Props = {
  field: RuntimeField;
  availableFields: RuntimeField[];
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (input: WorkflowFieldSettingsInput) => Promise<void> | void;
  onAddOption: (label: string) => Promise<void>;
  onRenameOption: (optionId: string, label: string) => Promise<void>;
  onReorderOptions: (optionIds: string[]) => Promise<void>;
  onDeleteOption: (option: RuntimeOption) => Promise<void>;
  onDeleteField: () => Promise<void>;
};

const textFieldTypes = new Set(["TEXT", "TEXTAREA", "RICH_TEXT"]);

export function WorkflowFieldSettingsPanel({
  field, availableFields, saving, error, onClose, onSave, onAddOption,
  onRenameOption, onReorderOptions, onDeleteOption, onDeleteField,
}: Props) {
  const [label, setLabel] = useState(field.label);
  const [placeholder, setPlaceholder] = useState(field.placeholder ?? "");
  const [helpText, setHelpText] = useState(field.helpText ?? "");
  const [isRequired, setIsRequired] = useState(field.isRequired);
  const [allowOther, setAllowOther] = useState(field.allowOther);
  const [ai, setAi] = useState(() => parseWorkflowFieldBehaviorConfig(field.behaviorConfig).ai ?? DEFAULT_WORKFLOW_FIELD_AI_CONFIG);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>(() => Object.fromEntries(field.options.map((option) => [option.id, option.label])));
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ kind: "field" } | { kind: "option"; option: RuntimeOption } | null>(null);
  const optionField = supportsWorkflowFieldOptions(field.type);
  const aiSupported = supportsWorkflowFieldAi(field.type, field.isRepeater);

  async function addOption() {
    const cleanLabel = newOptionLabel.trim();
    if (!cleanLabel) return;
    await onAddOption(cleanLabel);
    setNewOptionLabel("");
  }

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    if (target.kind === "field") await onDeleteField();
    else await onDeleteOption(target.option);
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-lg overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl" dir="rtl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div><p className="text-xs font-black text-sky-600">إعدادات الحقل</p><h2 className="mt-2 text-xl font-black text-slate-950">{field.label}</h2><p className="mt-1 text-xs font-bold text-slate-400">المعرّف ثابت: {field.key}</p></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600" aria-label="إغلاق"><X className="h-4 w-4" /></button>
        </div>

        <section className="mt-6 space-y-4">
          <h3 className="text-sm font-black text-slate-900">إعدادات الحقل</h3>
          <label className="block text-sm font-bold text-slate-700">عنوان الحقل
            <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={500} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-sky-400" />
          </label>
          {textFieldTypes.has(field.type) ? <label className="block text-sm font-bold text-slate-700">النص الإرشادي
            <input value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} maxLength={500} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-sky-400" />
          </label> : null}
          <label className="block text-sm font-bold text-slate-700">نص المساعدة
            <textarea value={helpText} onChange={(event) => setHelpText(event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-sky-400" />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} /> حقل إلزامي</label>
          {optionField ? <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={allowOther} onChange={(event) => setAllowOther(event.target.checked)} /> السماح بخيار «أخرى»</label> : null}
        </section>

        {optionField ? <section className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-black text-slate-900">خيارات الحقل</h3>
          <p className="mt-1 text-xs leading-6 text-slate-500">يمكن تغيير الاسم الظاهر، بينما يبقى معرّف الخيار ثابتًا لحماية البيانات والارتباطات.</p>
          <div className="mt-4 space-y-3">
            {field.options.map((option) => <div key={option.id} draggable onDragStart={() => setDraggedOptionId(option.id)} onDragEnd={() => setDraggedOptionId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => {
              if (!draggedOptionId || draggedOptionId === option.id) return;
              const ids = field.options.map((item) => item.id);
              const from = ids.indexOf(draggedOptionId); const to = ids.indexOf(option.id);
              if (from < 0 || to < 0) return;
              ids.splice(from, 1); ids.splice(to, 0, draggedOptionId); void onReorderOptions(ids);
            }} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" />
                <input value={optionDrafts[option.id] ?? option.label} onChange={(event) => setOptionDrafts((current) => ({ ...current, [option.id]: event.target.value }))} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-bold" />
                <button type="button" disabled={saving || !(optionDrafts[option.id] ?? "").trim()} onClick={() => void onRenameOption(option.id, optionDrafts[option.id] ?? option.label)} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 disabled:opacity-50">حفظ</button>
                <button type="button" disabled={saving} onClick={() => setPendingDelete({ kind: "option", option })} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600" aria-label={`حذف ${option.label}`}><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 break-all text-[10px] font-bold text-slate-400">المعرّف الثابت: {option.value}</p>
            </div>)}
          </div>
          <div className="mt-4 flex gap-2"><input value={newOptionLabel} onChange={(event) => setNewOptionLabel(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addOption(); } }} placeholder="اسم الخيار الجديد" maxLength={500} className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-sm" /><button type="button" disabled={saving || !newOptionLabel.trim()} onClick={() => void addOption()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" /> إضافة خيار</button></div>
        </section> : null}

        <section className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="text-sm font-black text-slate-900">المساعد الذكي</h3>
          {!aiSupported ? <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">المساعد الذكي متاح للحقول النصية فقط.</div> : <div className="mt-4 space-y-6">
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-sky-50 p-4 font-black text-slate-800">تفعيل المساعد الذكي<input type="checkbox" checked={ai.enabled} onChange={(event) => setAi((current) => ({ ...current, enabled: event.target.checked }))} /></label>
            <div><h4 className="text-sm font-black text-slate-900">الإجراءات المتاحة</h4><div className="mt-3 grid gap-2">{WORKFLOW_AI_ACTIONS.map((action) => <label key={action} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={ai.actions.includes(action)} onChange={(event) => setAi((current) => ({ ...current, actions: event.target.checked ? [...new Set([...current.actions, action])] : current.actions.filter((item) => item !== action) }))} />{WORKFLOW_AI_ACTION_LABELS[action]}</label>)}</div></div>
            <div><h4 className="text-sm font-black text-slate-900">مصدر البيانات</h4><div className="mt-3 space-y-2">{[["PREVIOUS_FIELDS", "الحقول السابقة"], ["CURRENT_STEP", "جميع حقول الخطوة الحالية"], ["SELECTED_FIELDS", "حقول محددة"]].map(([value, text]) => <label key={value} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700"><input type="radio" name="contextMode" checked={ai.contextMode === value} onChange={() => setAi((current) => ({ ...current, contextMode: value as typeof current.contextMode }))} />{text}</label>)}</div></div>
            {ai.contextMode === "SELECTED_FIELDS" ? <div><h4 className="text-sm font-black text-slate-900">حقول المصدر</h4><div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">{availableFields.filter((item) => item.id !== field.id).map((item) => <label key={item.id} className="flex items-start gap-3 rounded-xl p-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={ai.sourceFieldKeys.includes(item.key)} onChange={(event) => setAi((current) => ({ ...current, sourceFieldKeys: event.target.checked ? [...new Set([...current.sourceFieldKeys, item.key])] : current.sourceFieldKeys.filter((key) => key !== item.key) }))} /><span>{item.label}<span className="mt-1 block text-[10px] text-slate-400">{item.key}</span></span></label>)}</div></div> : null}
            <label className="block text-sm font-black text-slate-900">التعليمات الخاصة<textarea value={ai.instruction ?? ""} onChange={(event) => setAi((current) => ({ ...current, instruction: event.target.value }))} rows={5} maxLength={2000} className="mt-3 w-full rounded-2xl border border-slate-200 p-4 text-sm font-medium leading-7" /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-black text-slate-900">نبرة النص<select value={ai.tone} onChange={(event) => setAi((current) => ({ ...current, tone: event.target.value as typeof current.tone }))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"><option value="PROFESSIONAL">مهنية</option><option value="FORMAL">رسمية</option><option value="CONCISE">موجزة</option><option value="EDUCATIONAL">تربوية</option></select></label><label className="text-sm font-black text-slate-900">الحد الأقصى<input type="number" min={50} max={4000} value={ai.maxLength} onChange={(event) => setAi((current) => ({ ...current, maxLength: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" /></label></div>
          </div>}
        </section>

        {error ? <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
        <button type="button" disabled={saving || !label.trim()} onClick={() => void onSave({ label: label.trim(), placeholder: placeholder.trim() || null, helpText: helpText.trim() || null, isRequired, allowOther, behaviorConfig: { ai } })} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3.5 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</button>

        <section className="mt-8 border-t border-rose-100 pt-6"><h3 className="text-sm font-black text-rose-700">منطقة الحذف</h3><p className="mt-2 text-xs leading-6 text-slate-500">لن يُحذف الحقل إذا كانت حقول أخرى تعتمد عليه، ولن تُحذف قيم الحالات التاريخية.</p><button type="button" disabled={saving} onClick={() => setPendingDelete({ kind: "field" })} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"><Trash2 className="h-4 w-4" /> حذف الحقل</button></section>
      </aside>

      <SmartFeedbackModal open={pendingDelete !== null} type="warning" title={pendingDelete?.kind === "field" ? "تأكيد حذف الحقل" : "تأكيد حذف الخيار"} description={pendingDelete?.kind === "field" ? "سيُحذف الحقل من النموذج الحالي مع الحفاظ على القيم التاريخية. لا يمكن التراجع عن هذا الإجراء." : "سيُحذف الخيار من الحقل الحالي. لن تتغير القيم المحفوظة سابقًا."} primaryActionLabel="تأكيد الحذف" secondaryActionLabel="إلغاء" onPrimaryAction={() => void confirmDelete()} onSecondaryAction={() => setPendingDelete(null)} onOpenChange={(open) => { if (!open) setPendingDelete(null); }} />
    </>
  );
}
