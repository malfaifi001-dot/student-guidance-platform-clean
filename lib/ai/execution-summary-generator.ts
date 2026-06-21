import { callDeepSeekChat } from "@/lib/ai/deepseek-client";
import {
  applyReportLanguageModeToText,
  getReportLanguageModeInstruction,
  getReportLanguageModeLabel,
  normalizeReportLanguageMode,
} from "@/lib/report-engine/report-language-mode";
import type {
  ReportFlowPrepareContext,
  ReportFlowSummaryField,
} from "@/lib/report-flow/report-flow-types";

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function getArabicWordCount(value: string) {
  return cleanText(value)
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean).length;
}

function limitArabicWords(value: string, maxWords = 80) {
  const words = cleanText(value)
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean);

  return words.slice(0, maxWords).join(" ");
}

function buildFallbackSummary({
  context,
  fields,
}: {
  context: ReportFlowPrepareContext;
  fields: ReportFlowSummaryField[];
}) {
  const languageMode = normalizeReportLanguageMode(context.languageMode);
  const title = cleanText(context.title);
  const serviceName = cleanText(context.serviceName);

  const useful = fields
    .filter((field) => cleanText(field.label) && cleanText(field.value))
    .slice(0, 5)
    .map((field) =>
      applyReportLanguageModeToText(`${field.label}: ${field.value}`, languageMode),
    );

  const details = useful.length ? `، وشملت البيانات: ${useful.join("، ")}.` : ".";

  return limitArabicWords(
    applyReportLanguageModeToText(
      `تم تنفيذ ${title || serviceName || "البرنامج"} وفق البيانات المعتمدة في الحالة${details}`,
      languageMode,
    ),
  );
}

export async function generateExecutionSummary({
  context,
  fields,
}: {
  context: ReportFlowPrepareContext;
  fields: ReportFlowSummaryField[];
}) {
  const languageMode = normalizeReportLanguageMode(context.languageMode);
  const safeFields = fields
    .filter((field) => cleanText(field.label) && cleanText(field.value))
    .slice(0, 20);

  if (!safeFields.length) {
    return {
      summary: buildFallbackSummary({ context, fields: safeFields }),
      source: "FALLBACK" as const,
    };
  }

  const fieldLines = safeFields
    .map((field) => `- ${field.label}: ${field.value}`)
    .join("\n");

  const prompt = `
اكتب وصف تنفيذ رسمي عربي كافيًا وواضحًا، بصياغة سياقية مترابطة وليس مجرد سرد لحقول النموذج.
استخدم فقط البيانات المقدمة ولا تضف أي معلومة من خارجها. افهم سياق التقرير من عنوان الخدمة، اسم البرنامج، طريقة التنفيذ، التاريخ، الفصل الدراسي، المنفذ، والفئة أو المستفيدين إن وجدت.
لا تذكر الذكاء الاصطناعي، ولا تذكر Workflow، ولا تقل "البيانات المختارة" أو "الحقول".
اجعل الوصف بين 60 و80 كلمة. لا تكتب أقل من 60 كلمة إذا كانت البيانات كافية، ولا تتجاوز 80 كلمة.
اجعل النص مناسبًا للتقرير الرسمي، وكأنه وصف فعلي لما تم تنفيذه في المدرسة، مع صياغة تربوية جميلة تشعر المنفذ بقيمة العمل وأثره. أضف سياقًا تربويًا مناسبًا في النهاية دون اختراع نتائج غير مذكورة.
لا تذكر اسم المستخدم أو اسم المنفذ أو اسم المعلم داخل الوصف نهائيًا، حتى لو كان موجودًا في البيانات. استخدم صياغة محايدة مثل: تم تنفيذ البرنامج، جرى تنفيذ النشاط، تم تفعيل المبادرة.
صيغة التقرير المطلوبة: ${getReportLanguageModeLabel(languageMode)}
${getReportLanguageModeInstruction(languageMode)}

سياق التقرير:
- عنوان التقرير: ${context.title}
- اسم الخدمة: ${context.serviceName}
- اسم الطالب إن وجد: ${context.studentName || "غير محدد"}
- اسم المنفذ إن وجد: محجوب ولا يستخدم في صياغة الوصف

البيانات المختارة التي يجب تحويلها إلى سياق تنفيذي طبيعي ومترابط:
${fieldLines}
`.trim();

  try {
    const summary = await callDeepSeekChat({
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد صياغة تقارير مدرسية عربية رسمية. لا تخترع أي معلومة. التزم بالبيانات المقدمة فقط.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.35,
      maxTokens: 320,
    });

    let finalSummary = applyReportLanguageModeToText(summary, languageMode);
    finalSummary = limitArabicWords(finalSummary, 80);

    if (getArabicWordCount(finalSummary) < 60) {
      const expandedSummary = await callDeepSeekChat({
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد صياغة تقارير مدرسية عربية رسمية. وسّع النص دون اختراع أي معلومة، ولا تذكر أسماء الأشخاص أو أسماء المستخدمين.",
          },
          {
            role: "user",
            content: `وسّع وصف التنفيذ التالي ليصبح بين 60 و80 كلمة، بصياغة تربوية مدرسية جميلة ومترابطة، دون إضافة معلومات غير موجودة، ودون ذكر أسماء الأشخاص أو المستخدمين، ودون تجاوز 80 كلمة.
صيغة التقرير المطلوبة: ${getReportLanguageModeLabel(languageMode)}
${getReportLanguageModeInstruction(languageMode)}

${finalSummary}`,
          },
        ],
        temperature: 0.35,
        maxTokens: 320,
      });

      finalSummary = applyReportLanguageModeToText(expandedSummary, languageMode);
      finalSummary = limitArabicWords(finalSummary, 80);
    }

    return {
      summary: finalSummary,
      source: "AI" as const,
    };
  } catch {
    return {
      summary: buildFallbackSummary({ context, fields: safeFields }),
      source: "FALLBACK" as const,
    };
  }
}
