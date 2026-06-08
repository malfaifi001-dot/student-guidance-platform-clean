"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  SmartActionFeedbackModal,
  useSmartActionFeedback,
} from "@/components/ui/smart-action-feedback";

async function readApiResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: text || "تعذر قراءة استجابة الخادم.",
    };
  }
}

export function DeleteAssessmentAnalysisButton({
  analysisId,
  title,
}: {
  analysisId: string;
  title: string;
}) {
  const router = useRouter();

  const {
    actionState,
    processing,
    confirmAction,
    closeActionFeedback,
    runConfirmedAction,
  } = useSmartActionFeedback();

  function handleDelete() {
    confirmAction({
      title: "حذف التحليل؟",
      description: `سيتم حذف التحليل "${title}" نهائيًا من مركز التحليل والاختبارات. هذا الإجراء لا يحذف بيانات الطلاب الأصلية.`,
      variant: "danger",
      confirmLabel: "حذف التحليل",
      errorTitle: "تعذر حذف التحليل",
      run: async () => {
        const response = await fetch(
          `/api/dashboard/assessment-center/${analysisId}/delete`,
          {
            method: "DELETE",
          }
        );

        const data = await readApiResponse(response);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر حذف التحليل.");
        }

        router.refresh();

        return {
          title: "تم حذف التحليل",
          description: "تم حذف التحليل بنجاح من مركز التحليل والاختبارات.",
          variant: "success" as const,
        };
      },
      afterSuccess: async () => {
        router.refresh();
      },
    });
  }

  return (
    <>
      <SmartActionFeedbackModal
        state={actionState}
        processing={processing}
        onClose={closeActionFeedback}
        onConfirm={runConfirmedAction}
      />

      <button
        type="button"
        onClick={handleDelete}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100"
      >
        <Trash2 className="h-4 w-4" />
        حذف
      </button>
    </>
  );
}