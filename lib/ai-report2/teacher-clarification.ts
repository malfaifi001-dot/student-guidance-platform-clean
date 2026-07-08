import { sanitizeAiReportText } from "@/lib/ai-report/ai-report-text-sanitizer";

import type { TeacherIntentAnalysis } from "./teacher-intent-engine";

export type TeacherClarificationQuestionType =
  | "single_select"
  | "multi_select"
  | "text";

export type TeacherClarificationOption = {
  label: string;
  value: string;
};

export type TeacherClarificationQuestion = {
  id: string;
  label: string;
  type: TeacherClarificationQuestionType;
  required: boolean;
  helpText?: string;
  options?: TeacherClarificationOption[];
};

export type TeacherClarificationAnswer = {
  id: string;
  question: string;
  type: TeacherClarificationQuestionType;
  value: string | string[];
};

function clean(value: unknown) {
  return sanitizeAiReportText(String(value ?? "").trim());
}

function normalizeId(value: unknown, fallback: string) {
  const id = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return id || fallback;
}

function normalizeType(value: unknown): TeacherClarificationQuestionType {
  const raw = String(value ?? "").trim();

  if (raw === "multi_select" || raw === "multiple" || raw === "checkbox") {
    return "multi_select";
  }

  if (raw === "text" || raw === "textarea" || raw === "short_text") {
    return "text";
  }

  return "single_select";
}

function option(label: string, value?: string): TeacherClarificationOption {
  return {
    label,
    value:
      value ||
      label
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .slice(0, 48),
  };
}

function fallbackQuestions(analysis: TeacherIntentAnalysis): TeacherClarificationQuestion[] {
  const code = analysis.primaryIntent.code;

  if (code === "ASSESSMENT_PRACTICE") {
    return [
      {
        id: "assessment_purpose",
        label: "ما الغرض الأقرب من التقويم؟",
        type: "single_select",
        required: false,
        options: [
          option("قياس فهم الدرس"),
          option("تقديم تغذية راجعة"),
          option("تحديد الطلاب المحتاجين للدعم"),
          option("دعم قرار إعادة الشرح"),
        ],
      },
      {
        id: "target_audience",
        label: "من الفئة المستهدفة؟",
        type: "single_select",
        required: false,
        options: [
          option("جميع الطلاب"),
          option("طلاب بحاجة إلى دعم"),
          option("مجموعة محددة من الطلاب"),
          option("طلاب متقدمون"),
        ],
      },
      {
        id: "needs_impact",
        label: "هل تريد إظهار أثر التقويم في التقرير؟",
        type: "single_select",
        required: false,
        options: [option("نعم"), option("لا")],
      },
    ];
  }

  if (code === "RESULTS_ANALYSIS") {
    return [
      {
        id: "analysis_focus",
        label: "ما محور التحليل الأهم؟",
        type: "single_select",
        required: false,
        options: [
          option("مستويات الإتقان"),
          option("الفجوات التعليمية"),
          option("الطلاب المستهدفون بالدعم"),
          option("مقارنة الأداء"),
        ],
      },
      {
        id: "support_level",
        label: "من الطلاب الذين تريد التركيز عليهم؟",
        type: "single_select",
        required: false,
        options: [
          option("الطلاب منخفضو الإتقان"),
          option("الطلاب متوسطو الإتقان"),
          option("الطلاب المتقدمون"),
          option("جميع الطلاب"),
        ],
      },
      {
        id: "needs_followup_actions",
        label: "هل تريد تضمين إجراءات لاحقة بعد التحليل؟",
        type: "single_select",
        required: false,
        options: [option("نعم"), option("لا")],
      },
    ];
  }

  if (code === "REMEDIAL_PLAN") {
    return [
      {
        id: "target_skill",
        label: "ما المهارة أو جانب الضعف الأهم؟",
        type: "text",
        required: false,
        helpText: "مثال: القراءة الجهرية، الإملاء، القسمة المطولة.",
      },
      {
        id: "intervention_type",
        label: "ما نوع الدعم الأقرب؟",
        type: "single_select",
        required: false,
        options: [
          option("خطة علاجية"),
          option("برنامج دعم فردي"),
          option("برنامج إثرائي"),
          option("متابعة تقدم الطالب"),
        ],
      },
      {
        id: "target_group",
        label: "من الفئة المستهدفة؟",
        type: "single_select",
        required: false,
        options: [
          option("طالب محدد"),
          option("طلاب بحاجة إلى دعم"),
          option("مجموعة علاجية"),
          option("طلاب متقدمون"),
        ],
      },
    ];
  }

  if (code === "PARENT_COMMUNICATION") {
    return [
      {
        id: "communication_reason",
        label: "ما سبب التواصل الأقرب؟",
        type: "single_select",
        required: false,
        options: [
          option("متابعة التحصيل"),
          option("معالجة ضعف التحصيل"),
          option("متابعة الغياب"),
          option("تعزيز تحسن الطالب"),
        ],
      },
      {
        id: "communication_parties",
        label: "من الأطراف المشاركة؟",
        type: "multi_select",
        required: false,
        options: [
          option("ولي الأمر"),
          option("الطالب"),
          option("المعلم"),
          option("المرشد الطلابي"),
        ],
      },
      {
        id: "needs_followup",
        label: "هل توجد متابعة لاحقة؟",
        type: "single_select",
        required: false,
        options: [option("نعم"), option("لا")],
      },
    ];
  }

  if (code === "DUTY_FOLLOWUP") {
    return [
      {
        id: "duty_type",
        label: "ما نوع المهمة؟",
        type: "single_select",
        required: false,
        options: [
          option("مناوبة"),
          option("حصة انتظار"),
          option("تكليف مدرسي"),
          option("متابعة التزام"),
        ],
      },
      {
        id: "target_audience",
        label: "من الفئة المستفيدة؟",
        type: "single_select",
        required: false,
        options: [
          option("جميع الطلاب"),
          option("طلاب الصف"),
          option("طلاب أثناء الدخول والخروج"),
          option("مجموعة محددة"),
        ],
      },
      {
        id: "target_value",
        label: "هل توجد قيمة أو سلوك مستهدف؟",
        type: "text",
        required: false,
        helpText: "مثال: احترام النظام، الانضباط، تحمل المسؤولية.",
      },
    ];
  }

  if (code === "PROFESSIONAL_COMMUNITY") {
    return [
      {
        id: "professional_goal",
        label: "ما هدف المشاركة المهنية؟",
        type: "single_select",
        required: false,
        options: [
          option("تبادل الخبرات"),
          option("تحسين الممارسات التعليمية"),
          option("توحيد أساليب الدعم"),
          option("تطوير نواتج التعلم"),
        ],
      },
      {
        id: "professional_parties",
        label: "من الأطراف المشاركة؟",
        type: "multi_select",
        required: false,
        options: [
          option("المعلمون"),
          option("المشرف التربوي"),
          option("قائد المدرسة"),
          option("فريق المجتمع المهني"),
        ],
      },
      {
        id: "needs_professional_impact",
        label: "هل تريد تضمين الأثر المهني؟",
        type: "single_select",
        required: false,
        options: [option("نعم"), option("لا")],
      },
    ];
  }

  return [
    {
      id: "main_purpose",
      label: "ما الغرض الأقرب من التقرير؟",
      type: "single_select",
      required: false,
      options: [
        option("توثيق تنفيذ"),
        option("قياس أثر"),
        option("تحسين أداء"),
        option("متابعة تقدم"),
      ],
    },
    {
      id: "target_audience",
      label: "من الفئة المستهدفة؟",
      type: "single_select",
      required: false,
      options: [
        option("جميع الطلاب"),
        option("طلاب الصف"),
        option("مجموعة محددة"),
        option("أطراف مشاركة"),
      ],
    },
    {
      id: "needs_impact",
      label: "هل تريد إظهار الأثر أو النتائج؟",
      type: "single_select",
      required: false,
      options: [option("نعم"), option("لا")],
    },
  ];
}

export function normalizeTeacherClarificationQuestions({
  value,
  analysis,
  maxQuestions,
}: {
  value: unknown;
  analysis: TeacherIntentAnalysis;
  maxQuestions: number;
}): TeacherClarificationQuestion[] {
  const rawQuestions = Array.isArray(value) ? value : [];
  const questions: TeacherClarificationQuestion[] = [];

  for (const rawQuestion of rawQuestions) {
    if (!rawQuestion || typeof rawQuestion !== "object") {
      continue;
    }

    const record = rawQuestion as Record<string, unknown>;
    const label = clean(record.label || record.question || record.title);

    if (!label) {
      continue;
    }

    const type = normalizeType(record.type);
    const rawOptions = Array.isArray(record.options) ? record.options : [];

    const options = rawOptions
      .map((rawOption, optionIndex) => {
        if (typeof rawOption === "string") {
          const label = clean(rawOption);
          return label ? option(label, `option_${optionIndex + 1}`) : null;
        }

        if (rawOption && typeof rawOption === "object") {
          const optionRecord = rawOption as Record<string, unknown>;
          const label = clean(optionRecord.label || optionRecord.value);

          if (!label) {
            return null;
          }

          return option(label, clean(optionRecord.value) || `option_${optionIndex + 1}`);
        }

        return null;
      })
      .filter((item): item is TeacherClarificationOption => item !== null)
      .slice(0, 6);

    if ((type === "single_select" || type === "multi_select") && options.length < 2) {
      continue;
    }

    questions.push({
      id: normalizeId(record.id, `clarification_${questions.length + 1}`),
      label,
      type,
      required: false,
      helpText: clean(record.helpText || record.why),
      options: type === "text" ? [] : options,
    });

    if (questions.length >= maxQuestions) {
      break;
    }
  }

  const fallback = fallbackQuestions(analysis);

  for (const question of fallback) {
    if (questions.length >= Math.max(2, maxQuestions)) {
      break;
    }

    if (!questions.some((item) => item.id === question.id || item.label === question.label)) {
      questions.push(question);
    }
  }

  return questions.slice(0, maxQuestions);
}

export function normalizeTeacherClarificationAnswers(
  value: unknown,
): TeacherClarificationAnswer[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map<TeacherClarificationAnswer | null>((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const id = clean(record.id);
      const question = clean(record.question);
      const type = normalizeType(record.type);
      const rawValue = record.value;

      if (!id || !question) {
        return null;
      }

      if (Array.isArray(rawValue)) {
        const values = rawValue.map(clean).filter(Boolean).slice(0, 6);

        if (!values.length) {
          return null;
        }

        return {
          id,
          question,
          type: "multi_select",
          value: values,
        };
      }

      const textValue = clean(rawValue);

      if (!textValue) {
        return null;
      }

      return {
        id,
        question,
        type,
        value: textValue,
      };
    })
    .filter((item): item is TeacherClarificationAnswer => item !== null)
    .slice(0, 4);
}

export function formatTeacherClarificationAnswers(
  answers: TeacherClarificationAnswer[],
) {
  if (!answers.length) {
    return "";
  }

  return answers
    .map((answer, index) => {
      const value = Array.isArray(answer.value)
        ? answer.value.join("، ")
        : answer.value;

      return `${index + 1}. ${answer.question}: ${value}`;
    })
    .join("\n");
}

export function appendTeacherClarificationAnswersToPrompt({
  prompt,
  answers,
}: {
  prompt: string;
  answers: TeacherClarificationAnswer[];
}) {
  const formattedAnswers = formatTeacherClarificationAnswers(answers);

  if (!formattedAnswers) {
    return prompt;
  }

  return [
    prompt,
    "",
    "إجابات المعلم على أسئلة تضييق النية:",
    formattedAnswers,
    "",
    "استخدم هذه الإجابات لتضييق الحقول والقيم، ولا تنشئ حقولًا إضافية لم يطلبها المعلم.",
  ].join("\n");
}