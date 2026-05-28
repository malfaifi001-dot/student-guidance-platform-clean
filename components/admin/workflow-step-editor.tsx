"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";

type WorkflowStepEditorProps = {
  workflowId: string;

  steps: Array<{
    id: string;
    title: string;
    description: string | null;
    order: number;

    fields: Array<{
      id: string;
      label: string;
      key: string;
      type: string;
    }>;
  }>;
};

export function WorkflowStepEditor({
  workflowId,
  steps,
}: WorkflowStepEditorProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  async function createStep() {
    setLoading(true);

    try {
      const response = await fetch(
        "/api/dashboard/workflow-builder/create-step",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            workflowId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("فشل إنشاء الخطوة.");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={createStep}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {loading ? "جاري الإنشاء..." : "إضافة خطوة"}
        </button>
      </div>

      {steps.map((step) => (
        <section
          key={step.id}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow"
        >
          <div className="mb-5 border-b border-slate-100 pb-4">
            <p className="text-sm font-bold text-sky-700">
              الخطوة {step.order}
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {step.title}
            </h2>

            {step.description ? (
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {step.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {step.fields.map((field) => (
              <div
                key={field.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <p className="text-xs font-bold text-slate-400">
                  {field.type}
                </p>

                <h3 className="mt-2 text-sm font-black text-slate-900">
                  {field.label}
                </h3>

                <p className="mt-2 text-xs text-slate-500">
                  key: {field.key}
                </p>
              </div>
            ))}

            {step.fields.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
                لا توجد حقول داخل هذه الخطوة.
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}