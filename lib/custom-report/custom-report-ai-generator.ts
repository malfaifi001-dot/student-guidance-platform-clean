import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import { extractJsonObject, normalizeCustomReportSchema } from "./custom-report-normalizer";
import type { CustomReportSchema } from "./custom-report-types";

export type CustomReportGenerationContext = {
  subject?: string;
  stage?: string;
  reportType?: string;
  targetAudience?: string;
  stages?: string[];
  specialties?: string[];
  subjects?: string[];
  mode?: "create" | "regenerate";
  previousPrompt?: string;
  regenerationInstruction?: string;
  previousSchema?: CustomReportSchema | null;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 30);
}

function buildContextBlock(context?: CustomReportGenerationContext) {
  const rows: Array<[string, string]> = [];

  const stages = cleanList(context?.stages);
  const specialties = cleanList(context?.specialties);
  const subjects = cleanList(context?.subjects);

  if (stages.length) rows.push(["المراحل التعليمية من بروفايل المستخدم", stages.join("، ")]);
  if (specialties.length) rows.push(["التخصصات من بروفايل المستخدم", specialties.join("، ")]);
  if (subjects.length) rows.push(["المواد التي يدرسها المستخدم", subjects.join("، ")]);

  const directRows: Array<[string, string]> = [
    ["التخصص", cleanText(context?.subject)],
    ["المرحلة التعليمية", cleanText(context?.stage)],
    ["نوع التقرير", cleanText(context?.reportType)],
    ["الفئة المستهدفة", cleanText(context?.targetAudience)],
  ];

  for (const [label, value] of directRows) {
    if (value) rows.push([label, value]);
  }

  if (!rows.length) return "لا يوجد سياق إضافي. اعتمد على وصف المستخدم فقط.";

  return rows.map(([label, value]) => `- ${label}: ${value}`).join("\n");
}

function buildPreviousSchemaBlock(schema?: CustomReportSchema | null) {
  if (!schema) return "لا يوجد هيكل سابق.";

  const compact = {
    title: schema.title,
    description: schema.description || "",
    sections: schema.sections.map((section) => ({
      title: section.title,
      fields: section.fields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        options: Array.isArray(field.options)
          ? field.options.slice(0, 8).map((option) => option.label)
          : [],
      })),
    })),
  };

  return JSON.stringify(compact, null, 2).slice(0, 7000);
}

function fallbackSchema(prompt: string): CustomReportSchema {
  return normalizeCustomReportSchema({
    title: "تقرير خاص",
    description: prompt,
    sections: [
      {
        title: "بيانات التقرير",
        description: "",
        fields: [
          {
            key: "report_content",
            label: "محتوى التقرير المطلوب",
            type: "textarea",
            required: true,
            placeholder: "اكتب تفاصيل التقرير حسب المطلوب.",
            reportLabel: "محتوى التقرير",
            showInReport: true,
            options: [],
          },
        ],
      },
    ],
  });
}

export async function generateCustomReportSchema(
  prompt: string,
  context?: CustomReportGenerationContext,
) {
  const mode = context?.mode === "regenerate" ? "regenerate" : "create";
  const regenerationInstruction = cleanText(context?.regenerationInstruction);
  const previousPrompt = cleanText(context?.previousPrompt);

  try {
    const content = await callDeepSeekChat({
      temperature: mode === "regenerate" ? 0.12 : 0.1,
      maxTokens: 2800,
      messages: [
        {
          role: "system",
          content:
            "أنت محرك تصميم نماذج تقارير مدرسية ديناميكية. وظيفتك تحويل وصف المستخدم إلى JSON فقط. لا تكتب Markdown ولا HTML. لا تخترع حقولًا غير مذكورة أو غير لازمة. لا تستخدم قوالب ثابتة. استخدم بيانات البروفايل لتخصيص المصطلحات والخيارات فقط، وليس لإضافة حقول غير مطلوبة. إذا كان الطلب إعادة توليد، افهم أن المستخدم غير راضٍ عن النسخة السابقة ويريد تعديل الحقول أو استبدالها أو تحسينها. لا تكرر نفس الهيكل السابق إلا إذا كان مناسبًا بوضوح.",
        },
        {
          role: "user",
          content: `
حوّل وصف المستخدم إلى هيكل تقرير مدرسي ديناميكي.

وضع الطلب:
${mode === "regenerate" ? "إعادة توليد الحقول بناءً على نسخة سابقة وتعليمات تعديل من المستخدم." : "إنشاء أولي."}

سياق المستخدم من البروفايل أو الطلب:
${buildContextBlock(context)}

الوصف الأصلي:
${previousPrompt || prompt}

تعليمات المستخدم الحالية:
${mode === "regenerate" ? regenerationInstruction || prompt : prompt}

الهيكل السابق عند إعادة التوليد:
${mode === "regenerate" ? buildPreviousSchemaBlock(context?.previousSchema) : "لا يوجد."}

قواعد صارمة:
- أعد JSON فقط.
- التزم بما طلبه المستخدم ولا تضف حقولًا من عندك.
- إذا كان الطلب إعادة توليد: لا تكرر نفس الحقول السابقة بنفس الترتيب إلا إذا طلب المستخدم الإبقاء عليها.
- إذا طلب المستخدم إضافة شيء، أضفه مع الحفاظ على الحقول المناسبة فقط.
- إذا طلب حذف شيء، احذفه ولا تعوضه بحقل مشابه.
- إذا طلب "حقول أخرى"، قدم بدائل مختلفة فعلًا عن النسخة السابقة.
- لا تستخدم قالب غياب أو سلوك أو ولي أمر إلا إذا كان الوصف يطلب ذلك.
- لا تتجاوز 3 أقسام.
- لا تتجاوز 12 حقلًا إجمالًا.
- اجعل الحقول والخيارات مناسبة لتخصص المستخدم ومادته ومرحلته إن وُجدت.
- إذا طلب المستخدم "خيارات"، اجعل الحقول المناسبة select أو multi_select.
- إذا لم يطلب خيارات، لا تحول كل شيء إلى اختيارات.
- الخيارات يجب أن تكون خاصة بموضوع التقرير، لا عامة مكررة.
- لكل حقل اختياري من نوع select أو multi_select أو radio أضف {"label":"أخرى","value":"other"}.
- استخدم textarea فقط عند الحاجة لوصف حر.
- مفاتيح الحقول تكون english_snake_case.
- التسميات بالعربية الواضحة المختصرة.

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