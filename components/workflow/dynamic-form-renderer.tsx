"use client";

import { useMemo, useState } from "react";
import { Save, Send } from "lucide-react";

import { EvidencePreviewGrid } from "@/components/evidence/evidence-preview-grid";
import { EvidenceUploadCard } from "@/components/evidence/evidence-upload-card";
import { RuntimeProgressSidebar } from "@/components/runtime/runtime-progress-sidebar";
import { RuntimeStatusBar } from "@/components/runtime/runtime-status-bar";
import { RuntimeStepNavigation } from "@/components/runtime/runtime-step-navigation";
import { SmartFeedbackModal } from "@/components/service-ui/smart-feedback-modal";
import { StudentContextCard } from "@/components/service-ui/student-context-card";
import { WorkflowStepCard } from "@/components/workflow/workflow-step-card";
import { createAutosavePayload } from "@/engine/autosave/autosave-engine";
import {
  validateStepRequiredFields,
  type RuntimeValues,
} from "@/engine/runtime/field-dependency-engine";
import type { RuntimeWorkflow } from "@/engine/runtime/runtime-resolver";
import { useRuntimeAutosave } from "@/hooks/use-runtime-autosave";
import { useRuntimeProgress } from "@/hooks/use-runtime-progress";

type EvidenceItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
};

type DynamicFormRendererProps = {
  workflow: RuntimeWorkflow;
  serviceId: string;
  requiresStudent?: boolean;
  title?: string;
  caseId?: string;
  initialValues?: RuntimeValues;
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

  return typeof value === "object";
}

function isEvidenceStep(stepTitle?: string | null) {
  const title = String(stepTitle ?? "").trim();
  return title.includes("الشواهد") || title.includes("المرفقات");
}

export function DynamicFormRenderer({
  workflow,
  serviceId,
  requiresStudent = false,
  title,
  caseId,
  initialValues,
}: DynamicFormRendererProps) {
  const [values, setValues] = useState<RuntimeValues>(initialValues ?? {});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);

  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    type: "success" | "error" | "warning" | "info";
    title: string;
    description?: string;
  }>({
    open: false,
    type: "success",
    title: "",
  });

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

  const autosave = useRuntimeAutosave({
    enabled: Object.keys(values).length > 0,
    payload: createAutosavePayload({
      workflowId: workflow.id,
      serviceId,
      values,
      studentId: extractStudentId(values),
    }),
  });

  const currentStepValidation = visibleStep
    ? validateStepRequiredFields({
        fields: visibleStep.fields,
        values,
      })
    : {
        valid: true,
        missingFields: [],
      };

  const shouldShowEvidence =
    workflow.serviceSlug === "guidance-programs" && isEvidenceStep(visibleStep?.title);

  function handleChange(key: string, value: unknown) {
    setValues((current) => ({
      ...current,
      [key]: isSerializableValue(value) ? value : null,
    }));
  }

  async function persistCase(type: "draft" | "submit") {
    setIsSaving(true);
    setFeedbackModal((current) => ({ ...current, open: false }));

    try {
      const endpoint = caseId
        ? `/api/dashboard/cases/${caseId}`
        : type === "draft"
          ? "/api/dashboard/cases/save-draft"
          : "/api/dashboard/cases/submit";

      const response = await fetch(endpoint, {
        method: caseId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workflowId: workflow.id,
          serviceId,
          title: title || workflow.name,
          studentId: extractStudentId(values),
          values,
          status: type === "submit" ? "SUBMITTED" : "DRAFT",
          evidenceItems:
            workflow.serviceSlug === "guidance-programs" ? evidenceItems : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "حدث خطأ أثناء الحفظ.");
      }

      setFeedbackModal({
        open: true,
        type: "success",
        title: type === "draft" ? "تم حفظ المسودة" : "تم إرسال الحالة بنجاح",
        description:
          type === "draft"
            ? "تم حفظ البيانات الحالية ويمكنك العودة لاحقًا لإكمالها."
            : "تم اعتماد الحالة وإرسالها للنظام بنجاح.",
      });
    } catch (error) {
      setFeedbackModal({
        open: true,
        type: "error",
        title: "حدث خطأ",
        description:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير معروف أثناء العملية.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="space-y-6">
        <RuntimeProgressSidebar
          steps={runtimeProgress.stepsProgress}
          currentStep={safeCurrentStep}
          onSelectStep={setCurrentStep}
        />

        <main className="space-y-6 pb-28">
          <RuntimeStatusBar
            overallPercent={runtimeProgress.overallPercent}
            completedRequired={runtimeProgress.completedRequired}
            totalRequired={runtimeProgress.totalRequired}
            isSaving={autosave.isSaving}
            lastSavedAt={autosave.lastSavedAt}
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
              onStudentChange={(student) => handleChange("student", student)}
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
            </section>
          )}

          {shouldShowEvidence ? (
            <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <p className="text-sm font-black text-sky-700">
                  شواهد البرنامج
                </p>

                <h2 className="mt-2 text-3xl font-black text-slate-900">
                  الشواهد والمرفقات
                </h2>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  أضف صور أو ملفات الشواهد الخاصة بتنفيذ البرنامج الإرشادي.
                </p>
              </div>

              <EvidenceUploadCard
                onUploaded={(items) =>
                  setEvidenceItems((current) => [...current, ...items])
                }
              />

              <EvidencePreviewGrid
                items={evidenceItems}
                onDelete={(id) =>
                  setEvidenceItems((current) =>
                    current.filter((item) => item.id !== id)
                  )
                }
              />
            </section>
          ) : null}

          {sortedSteps.length > 0 ? (
            <RuntimeStepNavigation
              currentStep={safeCurrentStep}
              totalSteps={sortedSteps.length}
              canProceed={currentStepValidation.valid}
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

        <SmartFeedbackModal
          open={feedbackModal.open}
          type={feedbackModal.type}
          title={feedbackModal.title}
          description={feedbackModal.description}
          primaryActionLabel="إغلاق"
          onPrimaryAction={() =>
            setFeedbackModal((current) => ({ ...current, open: false }))
          }
        />
      </div>
    </div>
  );
}