"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";

import type { DynamicFormRendererSaveHandler } from "@/components/workflow/dynamic-form-renderer";
import { DynamicFormRenderer } from "@/components/workflow/dynamic-form-renderer";
import {
  buildAiReportInitialValues,
  buildAiReportRuntimeWorkflow,
  buildAiReportSubmissionValues,
  normalizeAiReportSchema,
  type AiReportSchema,
} from "@/lib/ai-report/ai-report-runtime-adapter";
import { sanitizeAiReportSchema } from "@/lib/ai-report/ai-report-text-sanitizer";

type SuggestResult = {
  success: boolean;
  error?: string;
  schema?: AiReportSchema;
};

type SaveResult = {
  caseId?: string;
  redirectTo?: string;
  error?: string;
};

export function AiReportWorkspace() {
  const router = useRouter();

  function goBackToAiReportHome() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard/ai-report");
  }

  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState("");
  const [subject, setSubject] = useState("");
  const [reportType, setReportType] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const [schema, setSchema] = useState<AiReportSchema | null>(null);
  const [modalOpen, setModalOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [runtimeRevision, setRuntimeRevision] = useState(0);

  useEffect(() => {
    if (!loading) {
      setSeconds(0);
      return;
    }

    setSeconds(1);

    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading]);

  const runtimeWorkflow = useMemo(() => {
    return schema ? buildAiReportRuntimeWorkflow(schema) : null;
  }, [schema]);

  const initialValues = useMemo(() => {
    return schema ? buildAiReportInitialValues(schema) : undefined;
  }, [schema]);

  async function generateReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/ai-report/suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          context: {
            stage,
            subject,
            reportType,
            targetAudience,
          },
        }),
      });

      const data = (await response.json()) as SuggestResult;

      if (!response.ok || !data.success || !data.schema) {
        throw new Error(data.error || "تعذر توليد التقرير المخصص.");
      }

      setSchema(normalizeAiReportSchema(sanitizeAiReportSchema(data.schema)));
      setRuntimeRevision((current) => current + 1);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر توليد التقرير المخصص.");
    } finally {
      setLoading(false);
    }
  }

  const handleSave: DynamicFormRendererSaveHandler = async ({
    type,
    values,
  }) => {
    if (!schema) {
      throw new Error("ولّد التقرير أولًا قبل الحفظ.");
    }

    const response = await fetch("/api/dashboard/custom-report/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schema: normalizeAiReportSchema(sanitizeAiReportSchema(schema)),
        values: buildAiReportSubmissionValues(schema, values),
        status: type === "submit" ? "SUBMITTED" : "DRAFT",
      }),
    });

    const data = (await response.json()) as SaveResult;

    if (!response.ok || !data.redirectTo) {
      throw new Error(data.error || "تعذر حفظ التقرير.");
    }

    return {
      redirectTo: data.redirectTo,
      feedbackTitle: type === "submit" ? "تم إرسال التقرير" : "تم حفظ المسودة",
      feedbackMessage:
        type === "submit"
          ? "تم حفظ التقرير وإرساله بنجاح."
          : "تم حفظ التقرير كمسودة بنجاح.",
    };
  };

  return (
    <main className="space-y-6" dir="rtl">
      {modalOpen ? (
        <AiReportPromptModal
          prompt={prompt}
          stage={stage}
          subject={subject}
          reportType={reportType}
          targetAudience={targetAudience}
          loading={loading}
          seconds={seconds}
          error={error}
          canClose={Boolean(schema) && !loading}
          onPromptChange={setPrompt}
          onStageChange={setStage}
          onSubjectChange={setSubject}
          onReportTypeChange={setReportType}
          onTargetAudienceChange={setTargetAudience}
          onGenerate={generateReport}
          onBack={goBackToAiReportHome}
          onClose={() => {
            if (!loading && schema) {
              setModalOpen(false);
            }
          }}
        />
      ) : null}

      {runtimeWorkflow && schema && initialValues ? (
        <DynamicFormRenderer
          key={`ai-report-runtime-${runtimeRevision}`}
          workflow={runtimeWorkflow}
          serviceId="custom-report"
          requiresStudent={false}
          title={schema.title}
          initialValues={initialValues}
          onSave={handleSave}
        />
      ) : (
        <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <Sparkles className="h-8 w-8" />
          </div>

          <h1 className="mt-5 text-3xl font-black text-slate-950">
            ابدأ بوصف التقرير المطلوب
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-500">
            سيظهر النموذج الرسمي نفسه المستخدم في خدمات تقييم الأداء بعد توليد
            schema التقرير.
          </p>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4" />
            إنشاء تقرير مخصص
          </button>
        </section>
      )}
    </main>
  );
}

function AiReportPromptModal({
  prompt,
  stage,
  subject,
  reportType,
  targetAudience,
  loading,
  seconds,
  error,
  canClose,
  onPromptChange,
  onStageChange,
  onSubjectChange,
  onReportTypeChange,
  onTargetAudienceChange,
  onGenerate,
  onBack,
  onClose,
}: {
  prompt: string;
  stage: string;
  subject: string;
  reportType: string;
  targetAudience: string;
  loading: boolean;
  seconds: number;
  error: string;
  canClose: boolean;
  onPromptChange: (value: string) => void;
  onStageChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onReportTypeChange: (value: string) => void;
  onTargetAudienceChange: (value: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      
    >
      <section
        className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
        dir="rtl"
      >
        <div className="bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="mt-2 text-3xl font-black">
                صف التقرير الذي تريد إنشاءه
              </h2>
            </div>

            {!loading ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full bg-white/10 p-2 text-white ring-1 ring-white/10 transition hover:bg-white/20"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="space-y-3">
            <label className="text-sm font-black text-slate-900">
              وصف التقرير
            </label>

            <textarea
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              rows={5}
              placeholder="مثال: أريد تقريرًا عن نتائج نهاية الوحدة يتضمن مستوى الإتقان، أبرز الفجوات، والتوصيات العلاجية."
              className="w-full rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PromptInput
              label="المرحلة"
              value={stage}
              onChange={onStageChange}
              placeholder="ابتدائي / متوسط / ثانوي"
            />

            <PromptInput
              label="المادة"
              value={subject}
              onChange={onSubjectChange}
              placeholder="رياضيات / علوم / لغة عربية"
            />

            <PromptInput
              label="نوع التقرير"
              value={reportType}
              onChange={onReportTypeChange}
              placeholder="تحصيلي / سلوكي / إشرافي"
            />

            <PromptInput
              label="الفئة المستهدفة"
              value={targetAudience}
              onChange={onTargetAudienceChange}
              placeholder="القيادة المدرسية / المعلم / ولي الأمر"
            />
          </div>

          {error ? (
            <div className="rounded-2xl bg-rose-50 p-4 text-sm font-black text-rose-700 ring-1 ring-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <div className="text-xs font-black text-slate-500">
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-sky-700 ring-1 ring-sky-100">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري بناء التقرير... {seconds}
                </span>
              ) : (
                ""
              )}
            </div>

            <button
              type="button"
              onClick={onGenerate}
              disabled={loading || prompt.trim().length < 10}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? `جاري التجهيز ${seconds}` : "إنشاء حقول التقرير"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PromptInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-black text-slate-900">{label}</span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}
