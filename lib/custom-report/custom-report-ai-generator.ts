import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { extractJsonObject, normalizeCustomReportSchema } from "./custom-report-normalizer";
import type { CustomReportSchema } from "./custom-report-types";

function fallbackSchema(prompt: string): CustomReportSchema {
  return normalizeCustomReportSchema({
    title: "تقرير متابعة طالب",
    description: prompt,
    sections: [
      {
        title: "بيانات الطالب",
        fields: [
          { key: "student_name", label: "اسم الطالب", type: "text", required: true },
          { key: "classroom", label: "الصف / الفصل", type: "text" },
          { key: "absence_days_count", label: "عدد أيام الغياب", type: "number", required: true }
        ],
      },
      {
        title: "متابعة الغياب",
        fields: [
          { key: "absence_reasons", label: "أسباب الغياب", type: "multi_select", required: true },
          { key: "actions_taken", label: "الإجراءات المتخذة", type: "multi_select", required: true },
          { key: "guardian_contact", label: "تواصل ولي الأمر", type: "select" },
          { key: "recommendations", label: "التوصيات", type: "multi_select" },
          { key: "follow_up_plan", label: "خطة المتابعة", type: "multi_select" }
        ],
      },
    ],
  });
}

export async function generateCustomReportSchema(prompt: string) {
  try {
    const content = await callDeepSeekChat({
      temperature: 0.15,
      maxTokens: 2400,
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد تربوي داخل منصة مدرسية. المستخدم غالبًا معلم أو موجه أو رائد نشاط. مهمتك تحويل وصفه إلى نموذج تقرير ديناميكي مختصر وواضح. أعد JSON فقط بدون Markdown وبدون HTML. لا تضف حقولًا كثيرة. لا تشتت المستخدم. التزم بما طلبه فقط.",
        },
        {
          role: "user",
          content: `
حوّل الوصف التالي إلى هيكل تقرير مدرسي ديناميكي:

${prompt}

القواعد الصارمة:
- أعد JSON فقط.
- لا تتجاوز 3 أقسام.
- لا تتجاوز 12 حقلًا إجمالًا.
- لا تضف حقولًا غير مطلوبة إلا إذا كانت ضرورية تربويًا مثل التاريخ أو اسم الطالب.
- اجعل اللغة عربية تربوية مختصرة وواضحة.
- إذا كان الحقل من نوع أسباب أو إجراءات أو توصيات أو خطة متابعة أو تواصل ولي أمر، استخدم select أو multi_select.
- لكل حقل اختياري أعط 5 إلى 10 خيارات مناسبة للبيئة التعليمية.
- أضف دائمًا خيار {"label":"أخرى","value":"other"} في هذه الحقول.
- لا تكتب فقرات طويلة داخل الخيارات.
- لا تجعل المعلم يكتب كثيرًا؛ اجعله يختار قدر الإمكان.
- استخدم textarea فقط عندما يكون الوصف الحر ضروريًا.

الشكل المطلوب:
{
  "title": "اسم التقرير",
  "description": "وصف مختصر",
  "sections": [
    {
      "title": "اسم القسم",
      "description": "",
      "fields": [
        {
          "key": "english_snake_case",
          "label": "اسم الحقل بالعربية",
          "type": "text | textarea | number | date | select | multi_select | checkbox | radio",
          "required": true,
          "placeholder": "",
          "helpText": "",
          "reportLabel": "اسم الظهور في التقرير",
          "showInReport": true,
          "options": [{"label":"اختيار","value":"option"}]
        }
      ]
    }
  ]
}
          `.trim(),
        },
      ],
    });

    return {
      schema: normalizeCustomReportSchema(extractJsonObject(content)),
      source: "AI",
    };
  } catch {
    return {
      schema: fallbackSchema(prompt),
      source: "FALLBACK",
    };
  }
}