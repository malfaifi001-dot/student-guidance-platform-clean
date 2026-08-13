"use client";

import { Save, X } from "lucide-react";
import { useState } from "react";

import type { RuntimeField } from "@/engine/runtime/runtime-resolver";
import {
  DEFAULT_WORKFLOW_FIELD_AI_CONFIG,
  parseWorkflowFieldBehaviorConfig,
  supportsWorkflowFieldAi,
  WORKFLOW_AI_ACTION_LABELS,
  WORKFLOW_AI_ACTIONS,
  type WorkflowFieldBehaviorConfig,
} from "@/lib/workflows/field-behavior-config";

type Props = {
  field: RuntimeField;
  availableFields: RuntimeField[];
  saving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (config: WorkflowFieldBehaviorConfig) => Promise<void> | void;
};

export function WorkflowFieldSettingsPanel({ field, availableFields, saving, error, onClose, onSave }: Props) {
  const [ai, setAi] = useState(() =>
    parseWorkflowFieldBehaviorConfig(field.behaviorConfig).ai ?? DEFAULT_WORKFLOW_FIELD_AI_CONFIG,
  );
  const supported = supportsWorkflowFieldAi(field.type, field.isRepeater);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-md overflow-y-auto border-r border-slate-200 bg-white p-6 shadow-2xl" dir="rtl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-black text-sky-600">إعدادات الحقل</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">{field.label}</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">{field.key}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600" aria-label="إغلاق">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!supported ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
          المساعد الذكي متاح للحقول النصية فقط. يمكن إعادة ترتيب هذا الحقل دون تغيير سلوكه الحالي.
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          <label className="flex items-center justify-between gap-4 rounded-2xl bg-sky-50 p-4 font-black text-slate-800">
            تفعيل المساعد الذكي
            <input type="checkbox" checked={ai.enabled} onChange={(event) => setAi((current) => ({ ...current, enabled: event.target.checked }))} />
          </label>

          <section>
            <h3 className="text-sm font-black text-slate-900">الإجراءات المتاحة</h3>
            <div className="mt-3 grid gap-2">
              {WORKFLOW_AI_ACTIONS.map((action) => (
                <label key={action} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={ai.actions.includes(action)}
                    onChange={(event) => setAi((current) => ({
                      ...current,
                      actions: event.target.checked
                        ? [...new Set([...current.actions, action])]
                        : current.actions.filter((item) => item !== action),
                    }))}
                  />
                  {WORKFLOW_AI_ACTION_LABELS[action]}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black text-slate-900">مصدر البيانات</h3>
            <div className="mt-3 space-y-2">
              {[
                ["PREVIOUS_FIELDS", "الحقول السابقة"],
                ["CURRENT_STEP", "جميع حقول الخطوة الحالية"],
                ["SELECTED_FIELDS", "حقول محددة"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-700">
                  <input type="radio" name="contextMode" checked={ai.contextMode === value} onChange={() => setAi((current) => ({ ...current, contextMode: value as typeof current.contextMode }))} />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {ai.contextMode === "SELECTED_FIELDS" ? (
            <section>
              <h3 className="text-sm font-black text-slate-900">حقول المصدر</h3>
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                {availableFields.filter((item) => item.id !== field.id).map((item) => (
                  <label key={item.id} className="flex items-start gap-3 rounded-xl p-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={ai.sourceFieldKeys.includes(item.key)}
                      onChange={(event) => setAi((current) => ({
                        ...current,
                        sourceFieldKeys: event.target.checked
                          ? [...new Set([...current.sourceFieldKeys, item.key])]
                          : current.sourceFieldKeys.filter((key) => key !== item.key),
                      }))}
                    />
                    <span>{item.label}<span className="mt-1 block text-[10px] text-slate-400">{item.key}</span></span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <label className="block text-sm font-black text-slate-900">
            التعليمات الخاصة
            <textarea value={ai.instruction ?? ""} onChange={(event) => setAi((current) => ({ ...current, instruction: event.target.value }))} rows={5} maxLength={2000} className="mt-3 w-full rounded-2xl border border-slate-200 p-4 text-sm font-medium leading-7 outline-none focus:border-sky-400" placeholder="اكتب تعليمات اختيارية، مع تجنب طلب اختلاق أي معلومات." />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-black text-slate-900">نبرة النص
              <select value={ai.tone} onChange={(event) => setAi((current) => ({ ...current, tone: event.target.value as typeof current.tone }))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm">
                <option value="PROFESSIONAL">مهنية</option><option value="FORMAL">رسمية</option><option value="CONCISE">موجزة</option><option value="EDUCATIONAL">تربوية</option>
              </select>
            </label>
            <label className="text-sm font-black text-slate-900">الحد الأقصى
              <input type="number" min={50} max={4000} value={ai.maxLength} onChange={(event) => setAi((current) => ({ ...current, maxLength: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" />
            </label>
          </div>
        </div>
      )}

      {error ? <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
      {supported ? (
        <button type="button" disabled={saving} onClick={() => void onSave({ ai })} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3.5 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-60">
          <Save className="h-4 w-4" />{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      ) : null}
    </aside>
  );
}
