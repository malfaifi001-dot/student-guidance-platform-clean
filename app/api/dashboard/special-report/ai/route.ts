import { NextResponse } from "next/server";

import { requireDashboardUser } from "@/lib/auth/require-auth";

import {
  SPECIAL_REPORT_FIELD_BANK,
  isSpecialReportAiDisabledFieldKey,
  isValidPerformanceElement,
} from "@/lib/special-report/catalog";

type AiMode =
  | "suggest"
  | "refine";

type AiRequestBody = {
  mode?: unknown;
  fieldKey?: unknown;

  reportTitle?: unknown;

  performanceElement?: unknown;

  currentText?: unknown;

  reportContext?: unknown;
};

function cleanText(
  value: unknown,
  maxLength: number
) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function getDeepSeekUrl() {
  return (
    process.env.DEEPSEEK_API_URL?.trim() ||
    `${
      process.env.DEEPSEEK_BASE_URL?.trim() ||
      "https://api.deepseek.com"
    }/chat/completions`
  );
}

export async function POST(request: Request) {
  await requireDashboardUser();

  const apiKey =
    process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "مفتاح DeepSeek غير مضبوط على الخادم.",
      },
      {
        status: 503,
      }
    );
  }

  try {
    const body =
      (await request.json()) as AiRequestBody;

    const mode =
      String(body.mode ?? "") as AiMode;

    const fieldKey = cleanText(
      body.fieldKey,
      120
    );

    const reportTitle = cleanText(
      body.reportTitle,
      300
    );

    const performanceElement =
      cleanText(
        body.performanceElement,
        300
      );

    const currentText = cleanText(
      body.currentText,
      8000
    );

    const reportContext = cleanText(
      body.reportContext,
      5000
    );

    const field =
      SPECIAL_REPORT_FIELD_BANK.find(
        (item) =>
          item.key === fieldKey
      );

    if (
      !field ||
      isSpecialReportAiDisabledFieldKey(fieldKey) ||
      !["TEXT", "TEXTAREA"].includes(
        field.type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "هذا الحقل لا يدعم المساعد الذكي.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      mode !== "suggest" &&
      mode !== "refine"
    ) {
      return NextResponse.json(
        {
          error:
            "نوع طلب المساعد غير صالح.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidPerformanceElement(
        performanceElement
      )
    ) {
      return NextResponse.json(
        {
          error:
            "عنصر الأداء غير صالح.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      mode === "refine" &&
      !currentText
    ) {
      return NextResponse.json(
        {
          error:
            "اكتب نصًا أولًا قبل طلب التنقيح.",
        },
        {
          status: 400,
        }
      );
    }

    const task =
      mode === "suggest"
        ? [
            "المطلوب: اقترح نصًا عربيًا مهنيًا مناسبًا للحقل الحالي.",
            "اجعل النص مناسبًا لتقرير مدرسي سعودي.",
            "استخدم المعلومات المتاحة فقط.",
            "لا تخترع أرقامًا أو نتائج أو أسماء.",
            "لا تذكر أنك ذكاء اصطناعي.",
            "لا تضف مقدمة مثل: بالتأكيد أو إليك النص.",
            "أعد النص المقترح فقط.",
          ].join("\n")
        : [
            "المطلوب: نقّح النص الحالي لغويًا ومهنيًا فقط.",
            "حافظ على المعنى الأصلي.",
            "لا تضف معلومات جديدة.",
            "لا تخترع نتائج أو أرقامًا.",
            "لا تحذف معلومة جوهرية.",
            "أعد النص المنقح فقط.",
          ].join("\n");

    const prompt = [
      `عنوان التقرير: ${
        reportTitle || "غير محدد بعد"
      }`,

      `عنصر الأداء: ${performanceElement}`,

      `اسم الحقل: ${field.label}`,

      reportContext
        ? `سياق التقرير:\n${reportContext}`
        : "",

      mode === "refine"
        ? `النص الحالي:\n${currentText}`
        : "",

      "",

      task,
    ]
      .filter(Boolean)
      .join("\n");

    const deepSeekResponse =
      await fetch(getDeepSeekUrl(), {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model:
            process.env.DEEPSEEK_MODEL?.trim() ||
            "deepseek-chat",

          messages: [
            {
              role: "system",

              content:
                "أنت مساعد صياغة تربوية عربي محترف. اكتب بلغة عربية سليمة وواضحة ومناسبة للتقارير المدرسية السعودية. لا تخترع معلومات.",
            },

            {
              role: "user",

              content: prompt,
            },
          ],

          temperature: 0.35,

          max_tokens: 700,

          stream: false,
        }),

        cache: "no-store",
      });

    const payload =
      (await deepSeekResponse.json()) as {
        error?: {
          message?: string;
        };

        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      };

    if (!deepSeekResponse.ok) {
      console.error(
        "DeepSeek API error",
        payload
      );

      return NextResponse.json(
        {
          error:
            payload.error?.message ||
            "تعذر الاتصال بالمساعد الذكي.",
        },
        {
          status: 502,
        }
      );
    }

    const text =
      payload.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return NextResponse.json(
        {
          error:
            "لم يرجع المساعد نصًا صالحًا.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      text,
    });
  } catch (error) {
    console.error(
      "special-report AI failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "تعذر تنفيذ طلب المساعد الذكي.",
      },
      {
        status: 500,
      }
    );
  }
}
