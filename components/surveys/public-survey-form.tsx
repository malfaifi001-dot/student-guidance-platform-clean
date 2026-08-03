"use client";

import { FormEvent, useRef, useState } from "react";
import { FormFeedbackModal } from "@/components/feedback/form-feedback-modal";
import { parseSurveyQuestionHelpText } from "@/lib/surveys/survey-config";

type SurveyQuestionOption = {
  id: string;
  label: string;
  value: string;
};

type SurveyQuestion = {
  id: string;
  label: string;
  type: string;
  helpText?: string | null;
  isRequired: boolean;
  scaleMin?: number | null;
  scaleMax?: number | null;
  options: SurveyQuestionOption[];
};

type PublicSurvey = {
  id: string;
  token: string;
  audienceType: string;
  isAnonymous: boolean;
  questions: SurveyQuestion[];
};

type PublicSurveyFormProps = {
  survey: PublicSurvey;
};

type FeedbackModalState = {
  type: "error" | "warning" | "success";
  title: string;
  message: string;
  fieldId?: string;
};

const RESPONDENT_NAME_FIELD = "respondent-name";
const RESPONDENT_PHONE_FIELD = "respondent-phone";

const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
const easternArabicDigits = "۰۱۲۳۴۵۶۷۸۹";

function normalizeArabicDigits(value: string) {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const arabicIndex = arabicIndicDigits.indexOf(digit);
    return String(arabicIndex >= 0 ? arabicIndex : easternArabicDigits.indexOf(digit));
  });
}

function normalizeSaudiMobile(value: string) {
  const normalizedDigits = normalizeArabicDigits(value.trim());
  const compact = normalizedDigits.replace(/[\s()-]/g, "");

  if (!/^\+?\d+$/.test(compact)) {
    return { normalized: compact, isValid: false };
  }

  const localNumber = compact.startsWith("+966")
    ? `0${compact.slice(4)}`
    : compact.startsWith("00966")
      ? `0${compact.slice(5)}`
      : compact.startsWith("966")
        ? `0${compact.slice(3)}`
        : compact;

  return {
    normalized: localNumber,
    isValid: /^05\d{8}$/.test(localNumber),
  };
}

function isAnswerEmpty(value: string | string[] | undefined) {
  return Array.isArray(value)
    ? value.every((item) => !item.trim())
    : !value?.trim();
}

function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getScaleRange(question: SurveyQuestion) {
  const min = question.scaleMin && question.scaleMin > 0 ? question.scaleMin : 1;
  const max = question.scaleMax && question.scaleMax > min ? question.scaleMax : 5;

  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function isScaleLike(type: string) {
  return type === "RATING" || type === "SCALE";
}

function createSubmissionKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function PublicSurveyForm({ survey }: PublicSurveyFormProps) {
  const [respondentName, setRespondentName] = useState("");
  const [respondentPhone, setRespondentPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedbackModal, setFeedbackModal] =
    useState<FeedbackModalState | null>(null);
  const submissionPendingRef = useRef(false);
  const submissionKeyRef = useRef<string | null>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  function clearFieldError(fieldId: string) {
    setFieldErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }

  function scrollToField(fieldId: string) {
    setFeedbackModal(null);

    window.setTimeout(() => {
      const field = fieldRefs.current[fieldId];
      if (!field) return;

      field.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusTarget = field.matches("input, textarea, button")
        ? field
        : field.querySelector<HTMLElement>(
            "input, textarea, button, [tabindex]:not([tabindex='-1'])",
          );
      window.setTimeout(() => focusTarget?.focus({ preventScroll: true }), 350);
    }, 0);
  }

  function setAnswer(questionId: string, value: string | string[]) {
    clearFieldError(questionId);
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function toggleMultiAnswer(questionId: string, value: string) {
    const currentValue = answers[questionId];
    const currentItems = Array.isArray(currentValue) ? currentValue : [];

    if (currentItems.includes(value)) {
      setAnswer(
        questionId,
        currentItems.filter((item) => item !== value),
      );
      return;
    }

    setAnswer(questionId, [...currentItems, value]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionPendingRef.current || isSubmitting || isSubmitted) {
      return;
    }

    setFeedback(null);
    const nextErrors: Record<string, string> = {};
    let normalizedPhone = respondentPhone.trim();
    const normalizedAnswers = { ...answers };

    if (!survey.isAnonymous) {
      if (!respondentName.trim()) {
        nextErrors[RESPONDENT_NAME_FIELD] = "الاسم مطلوب لإرسال هذا الاستبيان.";
      }

      if (!respondentPhone.trim()) {
        nextErrors[RESPONDENT_PHONE_FIELD] = "رقم الجوال مطلوب لإرسال هذا الاستبيان.";
      } else {
        const mobileResult = normalizeSaudiMobile(respondentPhone);
        normalizedPhone = mobileResult.normalized;
        if (!mobileResult.isValid) {
          nextErrors[RESPONDENT_PHONE_FIELD] =
            "رقم الجوال يجب أن يحتوي على أرقام صحيحة.";
        }
      }
    }

    for (const question of survey.questions) {
      const answer = answers[question.id];

      if (question.isRequired && isAnswerEmpty(answer)) {
        nextErrors[question.id] = `السؤال «${question.label}» مطلوب.`;
        continue;
      }

      if (typeof answer !== "string" || !answer.trim()) continue;

      if (question.type === "TEXT" && question.label.includes("جوال")) {
        const mobileResult = normalizeSaudiMobile(answer);
        if (!mobileResult.isValid) {
          nextErrors[question.id] =
            "رقم الجوال يجب أن يحتوي على أرقام صحيحة.";
        } else {
          normalizedAnswers[question.id] = mobileResult.normalized;
        }
      }

      if (question.type === "NUMBER" && !Number.isFinite(Number(answer))) {
        nextErrors[question.id] = "أدخل رقمًا صحيحًا لهذا السؤال.";
      }

      if (
        question.type === "DATE" &&
        !isValidIsoDate(answer)
      ) {
        nextErrors[question.id] = "أدخل تاريخًا صحيحًا لهذا السؤال.";
      }
    }

    const orderedFieldIds = [
      ...(survey.isAnonymous
        ? []
        : [RESPONDENT_NAME_FIELD, RESPONDENT_PHONE_FIELD]),
      ...survey.questions.map((question) => question.id),
    ];
    const firstInvalidField = orderedFieldIds.find(
      (fieldId) => nextErrors[fieldId],
    );

    if (firstInvalidField) {
      const errorCount = Object.keys(nextErrors).length;
      setFieldErrors(nextErrors);
      setFeedbackModal({
        type: "error",
        title: "تعذر إرسال الاستبيان",
        message: `${nextErrors[firstInvalidField]}${
          errorCount > 1 ? `\nيوجد ${errorCount} حقول تحتاج إلى مراجعة.` : ""
        }`,
        fieldId: firstInvalidField,
      });
      return;
    }

    setFieldErrors({});

    submissionPendingRef.current = true;
    setIsSubmitting(true);
    submissionKeyRef.current ||= createSubmissionKey();

    try {
      const response = await fetch(`/api/survey/${survey.token}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionKey: submissionKeyRef.current,
          respondentType: survey.audienceType,
          respondentName,
          respondentPhone: normalizedPhone,
          answers: normalizedAnswers,
        }),
      });

      const responseText = await response.text().catch(() => "");
      let data: { error?: string; message?: string } | null = null;

      if (responseText) {
        try {
          data = JSON.parse(responseText) as {
            error?: string;
            message?: string;
          };
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        const message = data?.error || "تعذر إرسال الرد بسبب خطأ في الخادم.";
        const relatedQuestion = survey.questions.find((question) =>
          message.includes(question.label),
        );
        if (relatedQuestion) {
          setFieldErrors((current) => ({
            ...current,
            [relatedQuestion.id]: message,
          }));
        }
        setFeedbackModal({
          type: "error",
          title: "تعذر إرسال الاستبيان",
          message,
          fieldId: relatedQuestion?.id,
        });
        return;
      }

      setFeedbackModal(null);
      setFeedback(
        data?.message || "تم إرسال الاستجابة بنجاح، شكرًا لتعاونك.",
      );
      setIsSubmitted(true);
    } catch {
      setFeedbackModal({
        type: "error",
        title: "تعذر إرسال الاستبيان",
        message: "تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت ثم حاول مرة أخرى.",
      });
    } finally {
      submissionPendingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-center shadow-sm">
        <p className="text-sm font-bold text-emerald-700">تم إرسال الاستجابة</p>
        <h2 className="mt-3 text-2xl font-bold text-slate-950">شكرًا لتعاونك</h2>
        <p className="mt-3 text-sm leading-7 text-emerald-800">
          {feedback || "تم إرسال الاستجابة بنجاح، شكرًا لتعاونك."}
        </p>
      </section>
    );
  }

  return (
    <>
      <FormFeedbackModal
        open={Boolean(feedbackModal)}
        type={feedbackModal?.type || "error"}
        title={feedbackModal?.title || ""}
        message={feedbackModal?.message || ""}
        primaryActionLabel={
          feedbackModal?.fieldId ? "الذهاب إلى الحقل" : "إغلاق"
        }
        secondaryActionLabel={feedbackModal?.fieldId ? "إغلاق" : undefined}
        onPrimaryAction={() => {
          if (feedbackModal?.fieldId) {
            scrollToField(feedbackModal.fieldId);
          } else {
            setFeedbackModal(null);
          }
        }}
        onClose={() => setFeedbackModal(null)}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {!survey.isAnonymous ? (
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <label
            ref={(element) => {
              fieldRefs.current[RESPONDENT_NAME_FIELD] = element;
            }}
            className="space-y-2 text-sm font-semibold text-slate-700"
          >
            <span>
              الاسم <span className="text-rose-600">*</span>
            </span>
            <input
              value={respondentName}
              onChange={(event) => {
                setRespondentName(event.target.value);
                clearFieldError(RESPONDENT_NAME_FIELD);
              }}
              required
              aria-invalid={Boolean(fieldErrors[RESPONDENT_NAME_FIELD])}
              className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-400 ${
                fieldErrors[RESPONDENT_NAME_FIELD]
                  ? "border-rose-400 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
              placeholder="اكتب الاسم"
            />
            {fieldErrors[RESPONDENT_NAME_FIELD] ? (
              <span className="block text-xs font-bold leading-6 text-rose-600">
                {fieldErrors[RESPONDENT_NAME_FIELD]}
              </span>
            ) : null}
          </label>

          <label
            ref={(element) => {
              fieldRefs.current[RESPONDENT_PHONE_FIELD] = element;
            }}
            className="space-y-2 text-sm font-semibold text-slate-700"
          >
            <span>
              رقم الجوال <span className="text-rose-600">*</span>
            </span>
            <input
              value={respondentPhone}
              onChange={(event) => {
                setRespondentPhone(event.target.value);
                clearFieldError(RESPONDENT_PHONE_FIELD);
              }}
              required
              inputMode="tel"
              aria-invalid={Boolean(fieldErrors[RESPONDENT_PHONE_FIELD])}
              className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-400 ${
                fieldErrors[RESPONDENT_PHONE_FIELD]
                  ? "border-rose-400 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
              placeholder="05xxxxxxxx"
            />
            {fieldErrors[RESPONDENT_PHONE_FIELD] ? (
              <span className="block text-xs font-bold leading-6 text-rose-600">
                {fieldErrors[RESPONDENT_PHONE_FIELD]}
              </span>
            ) : null}
          </label>
        </section>
      ) : null}

      {survey.questions.map((question, index) => {
        const currentAnswer = answers[question.id];
        const metadata = parseSurveyQuestionHelpText(question.helpText);

        return (
          <div key={question.id} className="space-y-4">
            {metadata.sectionTitle ? (
              <section className="rounded-3xl border border-sky-200 bg-sky-50 px-6 py-5">
                <h2 className="text-xl font-bold text-slate-950">{metadata.sectionTitle}</h2>
              </section>
            ) : null}

            <section
              ref={(element) => {
                fieldRefs.current[question.id] = element;
              }}
              data-invalid={fieldErrors[question.id] ? "true" : undefined}
              className={`rounded-3xl border p-6 shadow-sm transition ${
                fieldErrors[question.id]
                  ? "border-rose-400 bg-rose-50/60 ring-2 ring-rose-100"
                  : "border-slate-200 bg-white"
              }`}
            >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-bold text-sky-700">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold leading-8 text-slate-950">
                  {metadata.fullLabel || question.label}
                  {question.isRequired ? <span className="mr-1 text-rose-600">*</span> : null}
                </h2>

                {metadata.helpText ? (
                  <p className="mt-1 text-sm leading-7 text-slate-500">{metadata.helpText}</p>
                ) : null}

                {isScaleLike(question.type) ? (
                  <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                    1 أقل قيمة — 5 أفضل قيمة
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              {question.type === "TEXT" ? (
                <input
                  value={typeof currentAnswer === "string" ? currentAnswer : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  required={question.isRequired}
                  aria-invalid={Boolean(fieldErrors[question.id])}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-400 ${
                    fieldErrors[question.id]
                      ? "border-rose-400 bg-rose-50"
                      : "border-slate-200 bg-white"
                  }`}
                  placeholder="اكتب إجابتك"
                />
              ) : null}

              {question.type === "TEXTAREA" ? (
                <textarea
                  value={typeof currentAnswer === "string" ? currentAnswer : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  required={question.isRequired}
                  aria-invalid={Boolean(fieldErrors[question.id])}
                  className={`min-h-28 w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-400 ${
                    fieldErrors[question.id]
                      ? "border-rose-400 bg-rose-50"
                      : "border-slate-200 bg-white"
                  }`}
                  placeholder="اكتب إجابتك"
                />
              ) : null}

              {question.type === "NUMBER" ? (
                <input
                  type="number"
                  value={typeof currentAnswer === "string" ? currentAnswer : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  required={question.isRequired}
                  aria-invalid={Boolean(fieldErrors[question.id])}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-400 ${
                    fieldErrors[question.id]
                      ? "border-rose-400 bg-rose-50"
                      : "border-slate-200 bg-white"
                  }`}
                  placeholder="اكتب الرقم"
                />
              ) : null}

              {question.type === "DATE" ? (
                <input
                  type="date"
                  value={typeof currentAnswer === "string" ? currentAnswer : ""}
                  onChange={(event) => setAnswer(question.id, event.target.value)}
                  required={question.isRequired}
                  aria-invalid={Boolean(fieldErrors[question.id])}
                  className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-400 ${
                    fieldErrors[question.id]
                      ? "border-rose-400 bg-rose-50"
                      : "border-slate-200 bg-white"
                  }`}
                />
              ) : null}

              {question.type === "YES_NO" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {["نعم", "لا"].map((option) => {
                    const selected = currentAnswer === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAnswer(question.id, option)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                          selected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {question.type === "SINGLE_CHOICE" ? (
                <div className="grid gap-3">
                  {question.options.map((option) => {
                    const selected = currentAnswer === option.label;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setAnswer(question.id, option.label)}
                        className={`rounded-2xl border px-4 py-3 text-right text-sm font-bold transition ${
                          selected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {question.type === "MULTIPLE_CHOICE" ? (
                <div className="grid gap-3">
                  {question.options.map((option) => {
                    const currentItems = Array.isArray(currentAnswer) ? currentAnswer : [];
                    const selected = currentItems.includes(option.label);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleMultiAnswer(question.id, option.label)}
                        className={`rounded-2xl border px-4 py-3 text-right text-sm font-bold transition ${
                          selected
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {isScaleLike(question.type) ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {getScaleRange(question).map((value) => {
                      const selected = currentAnswer === String(value);

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAnswer(question.id, String(value))}
                          className={`flex h-14 w-14 items-center justify-center rounded-full border text-lg font-bold transition ${
                            selected
                              ? "border-sky-600 bg-sky-600 text-white ring-4 ring-sky-100"
                              : "border-slate-200 bg-white text-slate-950 hover:bg-slate-50"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex max-w-md justify-between px-2 text-xs font-bold text-slate-500">
                    <span>أقل قيمة</span>
                    <span>أفضل قيمة</span>
                  </div>
                </div>
              ) : null}
            </div>
            {fieldErrors[question.id] ? (
              <p className="mt-3 text-xs font-bold leading-6 text-rose-600">
                {fieldErrors[question.id]}
              </p>
            ) : null}
            </section>
          </div>
        );
      })}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-slate-900 px-5 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "جاري الإرسال..." : "إرسال الرد"}
      </button>
      </form>
    </>
  );
}
