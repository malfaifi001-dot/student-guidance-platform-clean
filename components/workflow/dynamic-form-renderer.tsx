"use client";

import { useMemo, useState } from "react";
import { Save, Send } from "lucide-react";

import { RuntimeProgressSidebar } from "@/components/runtime/runtime-progress-sidebar";
import { RuntimeStatusBar } from "@/components/runtime/runtime-status-bar";
import { RuntimeStepNavigation } from "@/components/runtime/runtime-step-navigation";
import { StudentContextCard } from "@/components/service-ui/student-context-card";
import { WorkflowStepCard } from "@/components/workflow/workflow-step-card";
import type { RuntimeValues } from "@/engine/runtime/field-dependency-engine";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import { useRuntimeProgress } from "@/hooks/use-runtime-progress";

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

function isSerializableValue(value: unknown): value is RuntimeValues[string] {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "string");
  }

  if (typeof value === "object") {
    return true;
  }

  return false;
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
  const [currentStep, setCurrentStep] = useState(0);

  const sortedSteps = useMemo(
    () => [...workflow.steps].sort((a, b) => a.order - b.order),
    [workflow.steps]
  );

  const safeCurrentStep = Math.min(
    Math.max(currentStep, 0),
    Math.max(sortedSteps.length - 1, 0)
  );

  const visibleStep = sortedSteps[safeCurrentStep];

  const runtimeProgress = useRuntimeProgress({
    steps: sortedSteps,
    values,
  });

  function handleChange(key: string, value: unknown) {
    setValues((current) => ({
      ...current,
      [key]: isSerializableValue(value) ? value : null,
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
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <RuntimeProgressSidebar
          steps={runtimeProgress.stepsProgress}
          currentStep={safeCurrentStep}
          onSelectStep={setCurrentStep}
        />

        <main className="min-w-0 space-y-6 pb-28">
          <RuntimeStatusBar
            overallPercent={runtimeProgress.overallPercent}
            completedRequired={runtimeProgress.completedRequired}
            totalRequired={runtimeProgress.totalRequired}
          />

          <section className="rounded-3xl bg-gradient-to-br from-sky-700 to-cyan-500 p-8 text-white shadow-xl">
            <p className="text-sm font-semibold text-sky-100">Workflow Runtime</p>

            <h1 className="mt-3 text-4xl font-black">{workflow.name}</h1>

            <p className="mt-4 max-w-3xl leading-8 text-sky-50">
              النموذج يعمل من Workflow ديناميكي، مع حفظ المسودات والسجلات داخل
              CaseEntry و CaseValue.
            </p>
          </section>

          {requiresStudent ? (
            <StudentContextCard
              onStudentChange={(student) => {
                handleChange("student", student);
              }}
            />
          ) : null}

          {visibleStep ? (
            <WorkflowStepCard
              key={visibleStep.id}
              step={visibleStep}
              values={values}
              onChange={handleChange}
            />
          ) : (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
              <h2 className="text-2xl font-black text-amber-800">
                لا توجد خطوات داخل هذا الـ Workflow
              </h2>

              <p className="mt-3 text-sm leading-7 text-amber-700">
                ارفع Workflow يحتوي على خطوات وحقول من لوحة الأدمن.
              </p>
            </section>
          )}

          {sortedSteps.length > 0 ? (
            <RuntimeStepNavigation
              currentStep={safeCurrentStep}
              totalSteps={sortedSteps.length}
              onNext={() =>
                setCurrentStep((previous) =>
                  Math.min(previous + 1, sortedSteps.length - 1)
                )
              }
              onPrevious={() =>
                setCurrentStep((previous) => Math.max(previous - 1, 0))
              }
            />
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-bold text-sky-800">
              {message}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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
        </main>
      </div>
    </div>
  );
}