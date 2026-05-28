"use client";

import { useState } from "react";
import { Save, Send } from "lucide-react";

import { StudentContextCard } from "@/components/service-ui/student-context-card";
import { WorkflowStepCard } from "@/components/workflow/workflow-step-card";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";

type DynamicFormRendererProps = {
  workflow: RuntimeWorkflow;
  serviceId: string;
  requiresStudent?: boolean;
  title?: string;
};

function extractStudentId(values: RuntimeValues) {
  const student = values.student;

  if (
    student &&
    typeof student === "object" &&
    "id" in student &&
    typeof student.id === "string"
  ) {
    return student.id;
  }

  return null;
}

export function DynamicFormRenderer({
  workflow,
  serviceId,
  requiresStudent = false,
  title,
}: DynamicFormRendererProps) {
  const [values, setValues] = useState<RuntimeValues>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleChange(key: string, value: unknown) {
    setValues((current) => ({
      ...current,
      [key]: value as RuntimeValues[string],
    }));
  }

  async function persistCase(type: "draft" | "submit") {
    setIsSaving(true);
    setMessage(null);

    try {
      const endpoint =
        type === "draft"
          ? "/api/dashboard/cases/save-draft"
          : "/api/dashboard/cases/submit";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: workflow.id,
          serviceId,
          title: title || workflow.name,
          studentId: extractStudentId(values),
          values,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ أثناء الحفظ.");
      }

      setMessage(data.message || "تمت العملية بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "حدث خطأ غير معروف.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
        <p className="text-sm font-semibold text-sky-100">Workflow Runtime</p>
        <h1 className="mt-3 text-4xl font-black">{workflow.name}</h1>
        <p className="mt-4 max-w-3xl leading-8 text-sky-50">
          هذا النموذج مرسوم بالكامل من Workflow ديناميكي، ويحفظ الآن داخل CaseEntry و CaseValue.
        </p>
      </section>

      {requiresStudent ? (
        <StudentContextCard
          onStudentChange={(student) => {
            handleChange("student", student);
          }}
        />
      ) : null}

      {workflow.steps.map((step) => (
        <WorkflowStepCard
          key={step.id}
          step={step}
          values={values}
          onChange={handleChange}
        />
      ))}

      {message ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-sky-800">
          {message}
        </div>
      ) : null}

      <div className="sticky bottom-4 z-20 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => persistCase("draft")}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "جاري الحفظ..." : "حفظ كمسودة"}
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => persistCase("submit")}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {isSaving ? "جاري الإرسال..." : "إرسال نهائي"}
          </button>
        </div>
      </div>
    </div>
  );
}