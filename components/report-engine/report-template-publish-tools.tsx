"use client";

import { useMemo, useState } from "react";
import type {
  GeneratedReportSnapshot,
  ReportIdentitySettings,
  ReportTemplateBuilderModel,
  ReportTemplateStatus,
  ReportTextSnippet,
} from "@/lib/report-engine/report-template-builder-types";
import { validateReportTemplateForPublishing } from "@/lib/report-engine/report-template-validation";

type ReportTemplatePublishToolsProps = {
  template: ReportTemplateBuilderModel;
  identity: ReportIdentitySettings;
  snippets: ReportTextSnippet[];
  snapshots: GeneratedReportSnapshot[];
  onTemplateStatusChange: (status: ReportTemplateStatus) => void;
  onSnapshotCreate: (snapshot: GeneratedReportSnapshot) => void;
};

export function ReportTemplatePublishTools({
  template,
  identity,
  snippets,
  snapshots,
  onTemplateStatusChange,
  onSnapshotCreate,
}: ReportTemplatePublishToolsProps) {
  const [message, setMessage] = useState<{
    type: "success" | "warning" | "error";
    title: string;
    description: string;
  } | null>(null);

  const validation = useMemo(() => {
    return validateReportTemplateForPublishing({
      template,
      identity,
      snippets,
    });
  }, [template, identity, snippets]);

  const lastSnapshot = snapshots[0];

  function publishTemplate() {
    if (!validation.canPublish) {
      setMessage({
        type: "error",
        title: "لا يمكن نشر القالب الآن",
        description:
          "اختبار القالب يحتوي على أخطاء. افتح تبويب اختبار القالب وأصلح الأخطاء أولًا.",
      });

      return;
    }

    onTemplateStatusChange("PUBLISHED");

    setMessage({
      type: "success",
      title: "تم نشر القالب",
      description:
        "القالب الآن جاهز للظهور للموجهين/الموجهات عند إصدار التقارير.",
    });
  }

  function returnToDraft() {
    onTemplateStatusChange("DRAFT");

    setMessage({
      type: "warning",
      title: "تم إرجاع القالب إلى مسودة",
      description:
        "القالب لن يكون مناسبًا للنشر النهائي حتى يتم مراجعته ونشره مرة أخرى.",
    });
  }

  function archiveTemplate() {
    onTemplateStatusChange("ARCHIVED");

    setMessage({
      type: "warning",
      title: "تمت أرشفة القالب",
      description:
        "القالب محفوظ في الصانع لكنه لا يفترض أن يظهر للموجهين عند إصدار التقارير.",
    });
  }

  function createSnapshot() {
    const snapshot: GeneratedReportSnapshot = {
      id: `snapshot-${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      templateStatus: template.status,
      templateSnapshot: structuredClone(template),
      reportDataSnapshot: {
        previewCaseId: template.previewCaseId,
        generatedFrom: template.previewCaseId ? "case" : "sample",
        note: template.previewCaseId
          ? "Snapshot تجريبي مبني على Case ID محدد للمعاينة."
          : "Snapshot تجريبي مبني على بيانات Sample مؤقتة.",
      },
      generatedAt: new Date().toISOString(),
      generatedBy: identity.counselorName || "الموجه/الموجهة الطلابية",
    };

    onSnapshotCreate(snapshot);

    setMessage({
      type: "success",
      title: "تم إنشاء Snapshot تجريبي",
      description:
        "هذا يحاكي حفظ نسخة ثابتة من القالب وبيانات التقرير وقت الإصدار.",
    });
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            النشر وإصدار التقرير
          </h2>

          <p className="mt-1 text-sm leading-7 text-slate-500">
            تحكم في حالة القالب، واختبر فكرة حفظ Snapshot ثابت عند إصدار التقرير.
          </p>
        </div>

        <div
          className={[
            "rounded-2xl px-4 py-3 text-sm font-black",
            template.status === "PUBLISHED"
              ? "bg-emerald-100 text-emerald-800"
              : template.status === "ARCHIVED"
                ? "bg-slate-200 text-slate-700"
                : "bg-amber-100 text-amber-800",
          ].join(" ")}
        >
          الحالة الحالية:{" "}
          {template.status === "PUBLISHED"
            ? "منشور"
            : template.status === "ARCHIVED"
              ? "مؤرشف"
              : "مسودة"}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <button
          type="button"
          onClick={publishTemplate}
          className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
        >
          نشر القالب
        </button>

        <button
          type="button"
          onClick={returnToDraft}
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100"
        >
          إرجاع لمسودة
        </button>

        <button
          type="button"
          onClick={archiveTemplate}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
        >
          أرشفة القالب
        </button>

        <button
          type="button"
          onClick={createSnapshot}
          className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-50"
        >
          إنشاء Snapshot
        </button>
      </div>

      {!validation.canPublish ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-black text-red-900">
            القالب غير جاهز للنشر
          </h3>

          <p className="mt-1 text-xs leading-6 text-red-700">
            يوجد أخطاء في اختبار القالب. زر النشر لن يعتمد القالب حتى يتم إصلاحها.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-black text-emerald-900">
            القالب قابل للنشر
          </h3>

          <p className="mt-1 text-xs leading-6 text-emerald-700">
            لا توجد أخطاء تمنع النشر. يمكن نشر القالب أو إنشاء Snapshot تجريبي.
          </p>
        </div>
      )}

      {message ? (
        <div
          className={[
            "mt-4 rounded-2xl border p-4",
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50"
              : message.type === "error"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50",
          ].join(" ")}
        >
          <h3
            className={[
              "text-sm font-black",
              message.type === "success"
                ? "text-emerald-900"
                : message.type === "error"
                  ? "text-red-900"
                  : "text-amber-900",
            ].join(" ")}
          >
            {message.title}
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-600">
            {message.description}
          </p>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              آخر Snapshot تجريبي
            </h3>

            <p className="mt-1 text-xs leading-6 text-slate-500">
              لاحقًا عند إصدار التقرير فعليًا، سنحفظ نسخة ثابتة من القالب وبيانات التقرير.
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
            {snapshots.length} Snapshot
          </span>
        </div>

        {lastSnapshot ? (
          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600 md:grid-cols-2">
            <div>
              <span className="font-black text-slate-900">القالب: </span>
              {lastSnapshot.templateName}
            </div>

            <div>
              <span className="font-black text-slate-900">وقت الإصدار: </span>
              {new Date(lastSnapshot.generatedAt).toLocaleString("ar-SA")}
            </div>

            <div>
              <span className="font-black text-slate-900">بواسطة: </span>
              {lastSnapshot.generatedBy}
            </div>

            <div>
              <span className="font-black text-slate-900">المصدر: </span>
              {lastSnapshot.reportDataSnapshot.generatedFrom === "case"
                ? "Case ID"
                : "Sample Data"}
            </div>

            <div className="md:col-span-2">
              <span className="font-black text-slate-900">ملاحظة: </span>
              {lastSnapshot.reportDataSnapshot.note}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            لم يتم إنشاء Snapshot بعد.
          </div>
        )}
      </div>
    </section>
  );
}