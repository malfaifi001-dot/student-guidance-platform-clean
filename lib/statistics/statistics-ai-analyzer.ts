import "server-only";

import { z } from "zod";

import { callDeepSeekChat } from "@/lib/ai/deepseek-client";

import type {
  StatisticsAiAnalysis,
  StatisticsPrepareResult,
  StatisticsSelectedMetric,
} from "./statistics-types";

const deepSeekAnalysisSchema = z.object({
  executiveDescription: z
    .string()
    .trim()
    .min(20)
    .max(1800),

  insights: z
    .array(
      z
        .string()
        .trim()
        .min(5)
        .max(400),
    )
    .max(6),

  recommendations: z
    .array(
      z
        .string()
        .trim()
        .min(5)
        .max(400),
    )
    .max(6),
});

function extractJson(text: string) {
  const clean = text.trim();

  if (
    clean.startsWith("{") &&
    clean.endsWith("}")
  ) {
    return clean;
  }

  const fenced = clean.match(
    /```(?:json)?\s*([\s\S]*?)```/i,
  );

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return clean.slice(start, end + 1);
  }

  throw new Error(
    "DEEPSEEK_STATISTICS_JSON_NOT_FOUND",
  );
}

function normalizeArabicDigits(text: string) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

  return text
    .replace(/[٠-٩]/g, (digit) =>
      String(arabicDigits.indexOf(digit)),
    )
    .replace(/[۰-۹]/g, (digit) =>
      String(persianDigits.indexOf(digit)),
    );
}

function extractNumbers(text: string) {
  const normalized =
    normalizeArabicDigits(text);

  return (
    normalized.match(
      /-?\d+(?:[.,]\d+)?/g,
    ) || []
  ).map((value) =>
    value.replace(",", "."),
  );
}

function containsUnknownNumbers(input: {
  sourcePayload: unknown;
  analysis: {
    executiveDescription: string;
    insights: string[];
    recommendations: string[];
  };
}) {
  const allowedNumbers = new Set(
    extractNumbers(
      JSON.stringify(input.sourcePayload),
    ),
  );

  const generatedText = [
    input.analysis.executiveDescription,
    ...input.analysis.insights,
    ...input.analysis.recommendations,
  ].join(" ");

  return extractNumbers(
    generatedText,
  ).some(
    (number) =>
      !allowedNumbers.has(number),
  );
}

function buildFallbackAnalysis(input: {
  prepared: StatisticsPrepareResult;
  selectedMetrics: StatisticsSelectedMetric[];
}): StatisticsAiAnalysis {
  const metricSentences =
    input.selectedMetrics.map(
      (metric) =>
        `${metric.valueLabel} ضمن ${metric.fieldLabel}: ${metric.caseCount} حالة`,
    );

  const executiveDescription = [
    `يعرض هذا التقرير نتائج ${input.prepared.sourceCaseCount} حالة مرتبطة بـ ${input.prepared.sourceReportCount} تقريرًا صادرًا لخدمات ${input.prepared.services.map((service) => service.name).join("، ")} خلال ${input.prepared.dateRange.label}.`,
    metricSentences.length
      ? `وشملت القيم المختارة: ${metricSentences.join("، ")}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const highestMetrics = [
    ...input.selectedMetrics,
  ]
    .sort(
      (first, second) =>
        second.caseCount -
        first.caseCount,
    )
    .slice(0, 5);

  return {
    executiveDescription,

    insights: highestMetrics.map(
      (metric) =>
        `بلغ عدد الحالات التي تضمنت ${metric.valueLabel} في حقل ${metric.fieldLabel} عدد ${metric.caseCount} حالة.`,
    ),

    recommendations: [
      "مراجعة القيم الأعلى تكرارًا وتحديد التدخلات المناسبة لها.",
      "متابعة تغير النتائج في الفترات القادمة باستخدام الحقول نفسها.",
      "الاستفادة من النتائج الرقمية في توجيه البرامج والخدمات ذات الأولوية.",
    ],

    analysisMode: "FALLBACK",
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
) {
  let timeout:
    | ReturnType<typeof setTimeout>
    | undefined;

  try {
    const timeoutPromise =
      new Promise<never>(
        (_resolve, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "DEEPSEEK_STATISTICS_TIMEOUT",
                ),
              ),
            timeoutMs,
          );
        },
      );

    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function analyzeSelectedStatistics(
  input: {
    prepared: StatisticsPrepareResult;
    selectedMetrics: StatisticsSelectedMetric[];
  },
): Promise<StatisticsAiAnalysis> {
  const fallback =
    buildFallbackAnalysis(input);

  const payload = {
    serviceName:
      input.prepared.services.map((service) => service.name).join("، "),

    dateRange:
      input.prepared.dateRange.label,

    sourceCaseCount:
      input.prepared.sourceCaseCount,

    sourceReportCount:
      input.prepared.sourceReportCount,

    selectedMetrics:
      input.selectedMetrics.map(
        (metric) => ({
          metricId: metric.metricId,
          fieldLabel:
            metric.fieldLabel,
          valueLabel:
            metric.valueLabel,
          caseCount:
            metric.caseCount,
        }),
      ),
  };

  try {
    const response = await withTimeout(
      callDeepSeekChat({
        messages: [
          {
            role: "system",
            content: [
              "أنت محرر تقارير إحصائية مدرسية باللغة العربية.",
              "اكتب وصفًا تنفيذيًا رسميًا ومختصرًا اعتمادًا على البيانات المرسلة فقط.",
              "الأرقام محسوبة مسبقًا ولا يجوز تعديلها أو إعادة حسابها.",
              "لا تضف أرقامًا أو نسبًا أو حقائق غير موجودة.",
              "لا تذكر حقولًا أو قيمًا لم يحددها المستخدم.",
              "لا تستنتج معلومات شخصية عن الطلاب.",
              "أرجع JSON صحيحًا فقط دون Markdown.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              task:
                "صياغة وصف تنفيذي واستنتاجات وتوصيات عملية للتقرير الإحصائي.",

              requiredOutput: {
                executiveDescription:
                  "نص عربي رسمي من فقرة أو فقرتين",
                insights:
                  "مصفوفة استنتاجات قصيرة",
                recommendations:
                  "مصفوفة توصيات عملية قصيرة",
              },

              rules: [
                "استخدم الأرقام نفسها دون تغيير.",
                "لا تنشئ نسبًا مئوية.",
                "لا تضف أسماء أو معرفات أو بيانات شخصية.",
                "لا تذكر أي قيمة غير موجودة في selectedMetrics.",
                "أرجع JSON فقط.",
              ],

              data: payload,
            }),
          },
        ],

        temperature: 0.15,
        maxTokens: 700,
      }),
      40000,
    );

    const parsedJson = JSON.parse(
      extractJson(response),
    ) as unknown;

    const parsed =
      deepSeekAnalysisSchema.parse(
        parsedJson,
      );

    if (
      containsUnknownNumbers({
        sourcePayload: payload,
        analysis: parsed,
      })
    ) {
      return fallback;
    }

    return {
      executiveDescription:
        parsed.executiveDescription,
      insights: parsed.insights,
      recommendations:
        parsed.recommendations,
      analysisMode: "DEEPSEEK",
    };
  } catch (error) {
    console.error(
      "statistics DeepSeek analysis failed",
      error instanceof Error
        ? error.message
        : "UNKNOWN_ERROR",
    );

    return fallback;
  }
}
