"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FIELD_TYPES } from "@/lib/workflow-builder/workflow-builder-types";

type WorkflowFieldEditorProps = {
  firstStepId?: string;
};

export function WorkflowFieldEditor({
  firstStepId,
}: WorkflowFieldEditorProps) {
  const router = useRouter();

  const [label, setLabel] = useState("");
  const [type, setType] = useState("TEXT");
  const [loading, setLoading] = useState(false);

  async function createField() {
    if (!firstStepId) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/dashboard/workflow-builder/create-field",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            stepId: firstStepId,
            label,
            type,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("فشل إنشاء الحقل.");
      }

      setLabel("");
      setType("TEXT");

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
      <div className="mb-6">
        <p className="text-sm font-bold text-sky-700">
          Field Editor
        </p>

        <h2 className="mt-2 text-3xl font-black text-slate-900">
          إنشاء حقل ديناميكي
        </h2>
      </div>

      {!firstStepId ? (
        <div className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-700">
          أنشئ خطوة أولًا قبل إضافة الحقول.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-black text-slate-800">
              اسم الحقل
            </label>

            <input
              value={label}
              onChange={(event) =>
                setLabel(event.target.value)
              }
              placeholder="مثال: سبب التواصل"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-800">
              نوع الحقل
            </label>

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            >
              {FIELD_TYPES.map((fieldType) => (
                <option
                  key={fieldType}
                  value={fieldType}
                >
                  {fieldType}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={createField}
              disabled={loading}
              className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {loading
                ? "جاري الإنشاء..."
                : "إضافة الحقل"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}