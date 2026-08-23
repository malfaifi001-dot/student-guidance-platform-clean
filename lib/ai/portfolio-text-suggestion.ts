import { callDeepSeekChat } from "@/lib/ai/deepseek-client";

export const PORTFOLIO_TEXT_CONTENT_TYPES = ["INTRODUCTION", "CONCLUSION"] as const;
export const PORTFOLIO_TEXT_LENGTHS = ["SHORT", "MEDIUM", "LONG"] as const;
export const PORTFOLIO_TEXT_TONES = ["FORMAL", "PEDAGOGICAL", "EDUCATIONAL"] as const;

export type PortfolioTextContentType = (typeof PORTFOLIO_TEXT_CONTENT_TYPES)[number];
export type PortfolioTextLength = (typeof PORTFOLIO_TEXT_LENGTHS)[number];
export type PortfolioTextTone = (typeof PORTFOLIO_TEXT_TONES)[number];

const lengthInstructions: Record<PortfolioTextLength, string> = {
  SHORT: "نص موجز في حدود 60 إلى 90 كلمة عربية.",
  MEDIUM: "نص متوسط في حدود 120 إلى 180 كلمة عربية.",
  LONG: "نص موسع في حدود 220 إلى 320 كلمة عربية.",
};

const toneInstructions: Record<PortfolioTextTone, string> = {
  FORMAL: "استخدم أسلوبًا رسميًا إداريًا واضحًا ومهنيًا، دون مبالغة عاطفية.",
  PEDAGOGICAL: "استخدم أسلوبًا تربويًا يبرز نمو الطالب والقيم والمشاركة والبيئة التعليمية والأثر التربوي مع بقاء اللغة مهنية.",
  EDUCATIONAL: "استخدم أسلوبًا تعليميًا يبرز التعلم والمهارات والمعارف والأهداف والإثراء وتنمية القدرات دون تحويل النص إلى بحث أكاديمي.",
};

const contentInstructions: Record<PortfolioTextContentType, string> = {
  INTRODUCTION: "اكتب مقدمة لملف إنجاز تربوي توضح غرض الملف وتوثيق الجهود والمنجزات والمبادرات والأعمال والبرامج والشواهد، وتبين قيمة النشاط المدرسي والتحسين المستمر بصورة طبيعية.",
  CONCLUSION: "اكتب خاتمة طبيعية لملف إنجاز تربوي تلخص الرحلة التعليمية والعمل الموثق، وتبرز قيمة النشاط المدرسي والتطوير المستمر والعمل الجماعي والالتزام بممارسة تعليمية أفضل وأثر يتمحور حول الطالب.",
};

function cleanGeneratedText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*(?:المقدمة|الخاتمة)\s*[:：-]\s*/i, "")
    .replace(/^\s*[-*#]+\s*/gm, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

export async function generatePortfolioTextSuggestion(input: {
  contentType: PortfolioTextContentType;
  length: PortfolioTextLength;
  tone: PortfolioTextTone;
}) {
  const result = await callDeepSeekChat({
    temperature: 0.55,
    maxTokens: input.length === "LONG" ? 900 : input.length === "MEDIUM" ? 600 : 360,
    timeoutMs: 60000,
    messages: [
      {
        role: "system",
        content: [
          "أنت مساعد كتابة تربوية محترف متخصص في التوثيق المدرسي وملفات الإنجاز في البيئة التعليمية السعودية.",
          "اكتب بالعربية الفصحى الحديثة بلغة تعليمية مصقولة ومناسبة للإدارة التعليمية السعودية.",
          "اكتب نصًا جاهزًا للصق مباشرة في ملف الإنجاز، وأعد النص العربي النهائي فقط دون عنوان أو شرح أو Markdown.",
          "لا تذكر الذكاء الاصطناعي، ولا تستخدم شعارات أو عبارات تسويقية أو مبالغة أو ادعاءات غير قابلة للتحقق.",
          "لا تخترع أرقامًا أو إحصاءات أو جوائز أو تواريخ أو أسماء أو أنشطة محددة أو إنجازات لم تُذكر.",
          "لا تستخدم placeholders أو أقواسًا فارغة، ولا تضف عنوانًا مثل المقدمة أو الخاتمة.",
          "اجعل النص متزنًا وغير متكلف، ومناسبًا لملف إنجاز رسمي يركز على الطالب والتعلم والتوثيق والتحسين.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          "السياق الثابت: ملف إنجاز تربوي في مدرسة سعودية.",
          contentInstructions[input.contentType],
          lengthInstructions[input.length],
          toneInstructions[input.tone],
          "لا تعتمد على أي حقول أو اختيارات سابقة أو بيانات طلاب أو بيانات Workflow؛ اكتب صياغة عامة قابلة للتخصيص دون اختلاق وقائع.",
        ].join("\n"),
      },
    ],
  });

  const text = cleanGeneratedText(result);
  if (!text) {
    throw new Error("EMPTY_PORTFOLIO_SUGGESTION");
  }

  return text;
}
