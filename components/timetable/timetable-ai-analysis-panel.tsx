"use client";

import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getChangeTypeArabicLabel,
  getFailureKindArabicLabel,
} from "@/lib/timetable/timetable-constraint-labels";

type AnalysisMode =
  | "FULL_REVIEW"
  | "PRE_GENERATION"
  | "GENERATION_FAILURE"
  | "WORKLOAD_REVIEW";

type Finding = {
  id: string;

  severity:
    | "CRITICAL"
    | "HIGH"
    | "MEDIUM"
    | "LOW"
    | "INFO";

  category: string;
  title: string;
  explanation: string;
  evidence: string[];

  affectedEntities: Array<{
    type: string;
    name: string;
  }>;

  relatedConstraintIds: string[];
  relatedConstraints: Array<{
    reference: string;
    title: string;
  }>;
  confidence: number;
};

type Recommendation = {
  id: string;
  priority: number;
  title: string;
  action: string;
  expectedImpact: string;

  risk:
    | "LOW"
    | "MEDIUM"
    | "HIGH";

  changeType: string;
  requiresApproval: boolean;
  relatedFindingIds: string[];
};

type Analysis = {
  summary: string;
  likelyRootCause: string;
  healthScore: number;

  readiness:
    | "READY"
    | "READY_WITH_WARNINGS"
    | "NOT_READY"
    | "UNKNOWN";

  failureKind:
    | "NONE"
    | "VALIDATION_ERROR"
    | "PROVEN_CONFLICT"
    | "LIKELY_CONSTRAINT_CONFLICT"
    | "SEARCH_TIMEOUT"
    | "CAPACITY_PROBLEM"
    | "ASSIGNMENT_PROBLEM"
    | "UNKNOWN";

  findings: Finding[];
  recommendations: Recommendation[];
  safeNextStep: string;
  assumptions: string[];
  disclaimer: string;
};

type StoredGenerationFailure = {
  projectId: string;
  errors: string[];
  occurredAt: string;
  autoAnalyze: boolean;
};

const modes: Array<{
  id: AnalysisMode;
  label: string;
  description: string;
}> = [
  {
    id: "FULL_REVIEW",
    label: "مراجعة شاملة",
    description:
      "البيانات والقيود وقابلية إنشاء الجدول.",
  },
  {
    id: "PRE_GENERATION",
    label: "قبل التوليد",
    description:
      "اكتشاف المشكلات قبل تشغيل المحرك.",
  },
  {
    id: "GENERATION_FAILURE",
    label: "تحليل فشل التوليد",
    description:
      "تحديد السبب والقيود المؤثرة والحلول.",
  },
  {
    id: "WORKLOAD_REVIEW",
    label: "النصاب والتوزيع",
    description:
      "مراجعة أحمال المعلمين وسعة الفصول.",
  },
];

export function TimetableAiAnalysisPanel({
  projectId,
}: {
  projectId: string;
}) {
  const [mode, setMode] =
    useState<AnalysisMode>(
      "FULL_REVIEW",
    );

  const [question, setQuestion] =
    useState("");

  const [
    generationErrors,
    setGenerationErrors,
  ] = useState<string[]>([]);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const autoAnalysisStartedRef =
    useRef<string | null>(null);
  const activeRequestRef =
    useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const mountedRef = useRef(false);

  const storageKey =
    getGenerationFailureStorageKey(
      projectId,
    );

  const runAnalysis = useCallback(
    async (options: {
      selectedMode: AnalysisMode;
      errors: string[];
      selectedQuestion?: string;
      automaticFailure?: StoredGenerationFailure;
    }) => {
      activeRequestRef.current?.abort();
      const controller = new AbortController();
      activeRequestRef.current = controller;
      const requestSequence = ++requestSequenceRef.current;
      let timedOut = false;
      const timeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 130_000);

      setBusy(true);
      setError("");

      try {
        const response = await fetch(
          `/api/dashboard/principal/timetable/projects/${projectId}/ai-analysis`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              mode: options.selectedMode,

              question:
                options.selectedQuestion?.trim() ||
                undefined,

              generationErrors:
                options.errors,
            }),
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const result =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.error ||
              "تعذر تشغيل التحليل الذكي.",
          );
        }

        if (!result.analysis || typeof result.analysis !== "object") {
          throw new Error(
            "وصل رد غير منظم من المساعد الذكي. أعد المحاولة.",
          );
        }

        if (
          !mountedRef.current ||
          requestSequence !== requestSequenceRef.current
        ) {
          return;
        }

        setAnalysis(result.analysis);

        if (options.automaticFailure) {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              ...options.automaticFailure,
              autoAnalyze: false,
            }),
          );
        }
      } catch (caughtError) {
        if (
          !mountedRef.current ||
          requestSequence !== requestSequenceRef.current
        ) {
          return;
        }

        if (
          caughtError instanceof Error &&
          caughtError.name === "AbortError"
        ) {
          if (timedOut) {
            setError(
              "استغرق التحليل وقتًا أطول من المتوقع. أعد المحاولة.",
            );
          }
          return;
        }

        if (caughtError instanceof TypeError) {
          setError(
            "تعذر الاتصال بخدمة التحليل الذكي. تحقق من اتصال الخادم ثم أعد المحاولة.",
          );
          return;
        }

        setError(
          caughtError instanceof Error && /[\u0600-\u06ff]/.test(caughtError.message)
            ? caughtError.message
            : "تعذر الاتصال بخدمة التحليل الذكي. تحقق من اتصال الخادم ثم أعد المحاولة.",
        );
      } finally {
        window.clearTimeout(timeout);
        if (
          mountedRef.current &&
          requestSequence === requestSequenceRef.current
        ) {
          setBusy(false);
          activeRequestRef.current = null;
        }
      }
    },
    [projectId, storageKey],
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      activeRequestRef.current?.abort();
    };
  }, []);

  const startAutomaticAnalysis = useCallback(
    (stored: StoredGenerationFailure) => {
      const fingerprint = getFailureFingerprint(stored);
      const fingerprintStorageKey = getAnalyzedFingerprintStorageKey(projectId);

      if (
        autoAnalysisStartedRef.current === fingerprint ||
        sessionStorage.getItem(fingerprintStorageKey) === fingerprint
      ) {
        return;
      }

      autoAnalysisStartedRef.current = fingerprint;
      sessionStorage.setItem(fingerprintStorageKey, fingerprint);
      setGenerationErrors(stored.errors);
      setMode("GENERATION_FAILURE");
      void runAnalysis({
        selectedMode: "GENERATION_FAILURE",
        errors: stored.errors,
        automaticFailure: stored,
      });
    },
    [projectId, runAnalysis],
  );

  useEffect(() => {
    const stored =
      readStoredFailure(
        storageKey,
        projectId,
      );

    if (!stored?.errors.length) {
      return;
    }

    setGenerationErrors(
      stored.errors,
    );

    setMode(
      "GENERATION_FAILURE",
    );

    if (stored.autoAnalyze) {
      startAutomaticAnalysis(stored);
    }
  }, [
    projectId,
    startAutomaticAnalysis,
    storageKey,
  ]);

  useEffect(() => {
    function handleFailure(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          projectId?: string;
          errors?: string[];
          occurredAt?: string;
          autoAnalyze?: boolean;
        }>;

      if (
        customEvent.detail
          ?.projectId !== projectId
      ) {
        return;
      }

      const errors =
        Array.isArray(
          customEvent.detail.errors,
        )
          ? customEvent.detail.errors
          : [];

      if (!errors.length) {
        return;
      }

      setGenerationErrors(errors);
      setMode("GENERATION_FAILURE");

      startAutomaticAnalysis({
        projectId,
        errors,
        occurredAt:
          customEvent.detail.occurredAt || new Date().toISOString(),
        autoAnalyze: true,
      });
    }

    window.addEventListener(
      "timetable:generation-failed",
      handleFailure,
    );

    return () => {
      window.removeEventListener(
        "timetable:generation-failed",
        handleFailure,
      );
    };
  }, [projectId, startAutomaticAnalysis]);

  function clearFailure() {
    sessionStorage.removeItem(
      storageKey,
    );
    sessionStorage.removeItem(
      getAnalyzedFingerprintStorageKey(projectId),
    );
    autoAnalysisStartedRef.current = null;

    setGenerationErrors([]);
    setAnalysis(null);
    setMode("FULL_REVIEW");
  }

  return (
    <section
      dir="rtl"
      className="mt-6 overflow-hidden rounded-[28px] border border-sky-200 bg-white shadow-sm"
    >
      <header className="border-b border-sky-100 bg-gradient-to-l from-sky-50 via-white to-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg">
              <BrainCircuit size={22} />
            </span>

            <div>
              <p className="text-xs font-black text-sky-700">
                DeepSeek · تحليل إنشاء الجدول
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                المستشار الذكي للتوليد
              </h2>

              <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-500">
                يحلل القيود والأنصبة والإسنادات
                وأوقات عدم التوفر وأسباب فشل
                محرك التوليد، دون تطبيق أي تغيير.
              </p>
            </div>
          </div>

          {analysis ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-bold text-slate-500">
                  جاهزية المشروع
                </p>

                <p className="text-2xl font-black text-slate-950">
                  {analysis.healthScore}%
                </p>
              </div>

              <ReadinessBadge
                readiness={
                  analysis.readiness
                }
              />
            </div>
          ) : null}
        </div>
      </header>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modes.map((item) => {
            const selected =
              item.id === mode;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setMode(item.id)
                }
                className={
                  selected
                    ? "rounded-2xl border border-sky-300 bg-sky-50 p-4 text-right ring-2 ring-sky-100"
                    : "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-right transition hover:border-sky-200 hover:bg-white"
                }
              >
                <p className="text-sm font-black text-slate-950">
                  {item.label}
                </p>

                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>

        {generationErrors.length ? (
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="flex gap-3">
                <AlertTriangle
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <p className="text-sm font-black text-amber-950">
                    تم التقاط آخر فشل في التوليد
                  </p>

                  <ul className="mt-2 space-y-1 text-xs font-bold leading-6 text-amber-800">
                    {generationErrors.map(
                      (item) => (
                        <li key={item}>
                          • {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={clearFailure}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-800"
              >
                <RotateCcw size={14} />
                مسح الفشل
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-700">
              سؤال للخبير الذكي
            </span>

            <textarea
              rows={3}
              value={question}
              onChange={(event) =>
                setQuestion(
                  event.target.value,
                )
              }
              placeholder="مثال: ما القيد الأرجح الذي يمنع إنشاء الجدول؟ وما أقل تعديل آمن؟"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-emerald-700"
                size={20}
              />

              <div>
                <p className="text-sm font-black text-emerald-900">
                  تحليل استشاري آمن
                </p>

                <p className="mt-1 text-xs font-bold leading-6 text-emerald-700">
                  لا يغير القيود أو الأنصبة أو
                  الإسنادات أو الجدول. ولا يحلل
                  الغياب أو الانتظار أو المناوبات.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void runAnalysis({
              selectedMode: mode,
              errors: generationErrors,
              selectedQuestion: question,
            })
          }
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-sky-500 to-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Sparkles size={18} />
          )}

          {busy
            ? "جارٍ تحليل القيود والتعارضات..."
            : mode ===
                "GENERATION_FAILURE"
              ? "تحليل سبب الفشل"
              : "تحليل المشروع"}
        </button>

        {error ? (
          <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <ShieldAlert
              size={20}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm font-bold leading-6">
              {error}
            </p>
          </div>
        ) : null}

        {analysis ? (
          <AnalysisResult
            analysis={analysis}
          />
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <BrainCircuit
              className="mx-auto text-slate-400"
              size={34}
            />

            <p className="mt-3 font-black text-slate-950">
              لم يُشغّل التحليل بعد
            </p>

            <p className="mt-2 text-sm font-medium text-slate-500">
              اختر نوع المراجعة أو انتقل إلى
              إنشاء الجدول لتجربة التوليد.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function AnalysisResult({
  analysis,
}: {
  analysis: Analysis;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-5">
          <p className="text-xs font-black text-sky-700">
            الخلاصة التنفيذية
          </p>

          <p className="mt-2 text-sm font-bold leading-7 text-slate-800">
            {analysis.summary}
          </p>
        </div>

        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black text-amber-700">
            السبب الأرجح
          </p>

          <p className="mt-2 text-sm font-black leading-7 text-amber-950">
            {analysis.likelyRootCause}
          </p>

          <div className="mt-3">
            <FailureBadge
              failureKind={
                analysis.failureKind
              }
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-950">
            المشكلات والقيود المؤثرة
          </h3>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {analysis.findings.length}
          </span>
        </div>

        {!analysis.findings.length ? (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            لم يكتشف التحليل تعارضًا واضحًا
            في البيانات المتاحة.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {analysis.findings.map(
              (finding) => (
                <article
                  key={finding.id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <SeverityIcon
                        severity={
                          finding.severity
                        }
                      />

                      <div>
                        <p className="font-black text-slate-950">
                          {finding.title}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          ثقة التحليل{" "}
                          {finding.confidence}%
                        </p>
                      </div>
                    </div>

                    <SeverityBadge
                      severity={
                        finding.severity
                      }
                    />
                  </div>

                  <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                    {finding.explanation}
                  </p>

                  {finding.affectedEntities.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {finding.affectedEntities.map((entity) => (
                        <span
                          key={`${entity.type}:${entity.name}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-700"
                        >
                          {entity.type}: {entity.name}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {finding.relatedConstraints
                    .length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {finding.relatedConstraints.map(
                        (constraint) => (
                          <span
                            key={
                              constraint.reference
                            }
                            className="rounded-full bg-violet-50 px-3 py-1.5 text-[11px] font-black text-violet-700"
                          >
                            {constraint.reference} — {constraint.title}
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}

                  {finding.evidence.length ? (
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-black text-slate-700">
                        الأدلة
                      </p>

                      <ul className="mt-2 space-y-1 text-xs font-bold leading-5 text-slate-500">
                        {finding.evidence.map(
                          (evidence) => (
                            <li key={evidence}>
                              • {evidence}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ),
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-950">
            الحلول المقترحة
          </h3>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {analysis.recommendations.length}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {[...analysis.recommendations]
            .sort(
              (first, second) =>
                first.priority -
                second.priority,
            )
            .map(
              (recommendation) => (
                <article
                  key={recommendation.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
                        {
                          recommendation.priority
                        }
                      </span>

                      <div>
                        <p className="font-black text-slate-950">
                          {
                            recommendation.title
                          }
                        </p>

                        <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                          {
                            recommendation.action
                          }
                        </p>
                      </div>
                    </div>

                    <RiskBadge
                      risk={
                        recommendation.risk
                      }
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">
                      {getChangeTypeArabicLabel(
                        recommendation.changeType,
                      )}
                    </span>

                    {recommendation.requiresApproval ? (
                      <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700">
                        يتطلب موافقة المدير
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-500">
                    الأثر المتوقع:{" "}
                    {
                      recommendation.expectedImpact
                    }
                  </p>
                </article>
              ),
            )}
        </div>
      </div>

      <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-xs font-black text-emerald-700">
          أقل خطوة آمنة الآن
        </p>

        <p className="mt-2 text-sm font-black leading-7 text-emerald-950">
          {analysis.safeNextStep}
        </p>
      </div>

      <p className="text-xs font-bold leading-6 text-slate-400">
        {analysis.disclaimer}
      </p>
    </div>
  );
}

function ReadinessBadge({
  readiness,
}: {
  readiness: Analysis["readiness"];
}) {
  const labels = {
    READY: "جاهز",
    READY_WITH_WARNINGS:
      "جاهز مع ملاحظات",
    NOT_READY: "غير جاهز",
    UNKNOWN: "غير محدد",
  };

  const className =
    readiness === "READY"
      ? "bg-emerald-50 text-emerald-700"
      : readiness ===
          "READY_WITH_WARNINGS"
        ? "bg-amber-50 text-amber-700"
        : readiness === "NOT_READY"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-black ${className}`}
    >
      {labels[readiness]}
    </span>
  );
}

function FailureBadge({
  failureKind,
}: {
  failureKind:
    Analysis["failureKind"];
}) {
  return (
    <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-black text-amber-800">
      {getFailureKindArabicLabel(failureKind)}
    </span>
  );
}

function SeverityIcon({
  severity,
}: {
  severity: Finding["severity"];
}) {
  const critical =
    severity === "CRITICAL" ||
    severity === "HIGH";

  return (
    <span
      className={
        critical
          ? "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-700"
          : "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700"
      }
    >
      {critical ? (
        <ShieldAlert size={19} />
      ) : (
        <AlertTriangle size={19} />
      )}
    </span>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: Finding["severity"];
}) {
  const labels = {
    CRITICAL: "حرج",
    HIGH: "مرتفع",
    MEDIUM: "متوسط",
    LOW: "منخفض",
    INFO: "معلومة",
  };

  const className =
    severity === "CRITICAL" ||
    severity === "HIGH"
      ? "bg-rose-50 text-rose-700"
      : severity === "MEDIUM"
        ? "bg-amber-50 text-amber-700"
        : "bg-sky-50 text-sky-700";

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${className}`}
    >
      {labels[severity]}
    </span>
  );
}

function RiskBadge({
  risk,
}: {
  risk: Recommendation["risk"];
}) {
  const labels = {
    LOW: "مخاطرة منخفضة",
    MEDIUM: "مخاطرة متوسطة",
    HIGH: "مخاطرة مرتفعة",
  };

  const className =
    risk === "LOW"
      ? "bg-emerald-50 text-emerald-700"
      : risk === "MEDIUM"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${className}`}
    >
      {labels[risk]}
    </span>
  );
}

function getGenerationFailureStorageKey(
  projectId: string,
) {
  return `timetable:generation-failure:${projectId}`;
}

function getAnalyzedFingerprintStorageKey(projectId: string) {
  return `timetable:generation-failure:last-analyzed:${projectId}`;
}

function getFailureFingerprint(failure: StoredGenerationFailure) {
  const source = JSON.stringify([
    failure.projectId,
    failure.occurredAt,
    failure.errors,
  ]);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${failure.occurredAt}:${(hash >>> 0).toString(16)}`;
}

function readStoredFailure(
  storageKey: string,
  projectId: string,
): StoredGenerationFailure | null {
  try {
    const raw =
      sessionStorage.getItem(
        storageKey,
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw) as
        StoredGenerationFailure;

    if (
      parsed.projectId !== projectId ||
      !Array.isArray(parsed.errors)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
