import { NextResponse } from "next/server";

import { findRelevantAiReportKnowledge } from "@/lib/ai-report/ai-report-knowledge-retriever";
import { normalizeAiReportSchema } from "@/lib/ai-report/ai-report-runtime-adapter";
import { sanitizeAiReportSchema } from "@/lib/ai-report/ai-report-text-sanitizer";
import { requireCustomReportContext } from "@/lib/custom-report/custom-report-auth";
import {
  generateCustomReportSchema,
  type CustomReportGenerationContext,
} from "@/lib/custom-report/custom-report-ai-generator";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeList(value: unknown) {
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

function readBodyContext(
  value: unknown,
): CustomReportGenerationContext | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;

  return {
    subject: cleanText(record.subject),
    stage: cleanText(record.stage),
    reportType: cleanText(record.reportType),
    targetAudience: cleanText(record.targetAudience),
  };
}

function buildKnowledgeGuidedPrompt({
  prompt,
  topReports,
  items,
}: {
  prompt: string;
  topReports: ReturnType<typeof findRelevantAiReportKnowledge>["topReports"];
  items: ReturnType<typeof findRelevantAiReportKnowledge>["items"];
}) {
  const reportsBlock = topReports
    .slice(0, 10)
    .map((report, index) => {
      return `${index + 1}. ${report.reportName} — ${report.performanceElement} — درجة ${report.score}`;
    })
    .join("\n");

  const itemsBlock = items
    .slice(0, 90)
    .map((item, index) => {
      return [
        `${index + 1}.`,
        `id=${item.id}`,
        `report=${item.reportName}`,
        `element=${item.performanceElement}`,
        `field=${item.fieldLabel}`,
        `type=${item.inputType}`,
        `value=${item.optionLabel}`,
      ].join(" | ");
    })
    .join("\n");

  return `
طلب المستخدم:
${prompt}

أنت تبني تقريرًا ذكيًا داخل منصة تعليمية.
لديك بنك قيم مرشح من المنصة. استخدمه كأساس ولا تخرج عنه في الخيارات الرسمية.

التقارير الأقرب من بنك المنصة:
${reportsBlock || "لا توجد تقارير مرشحة كافية."}

القيم والخيارات المرشحة:
${itemsBlock || "لا توجد قيم مرشحة كافية."}

قواعد إلزامية:
- ابنِ التقرير اعتمادًا على القيم المرشحة أعلاه.
- لا تستخدم خيارات رسمية بعيدة عن بنك المنصة.
- أعد المخرج في قسم واحد فقط.
- لا تنشئ أكثر من 12 حقلًا إجمالًا.
- اجعل جميع الحقول اختيارية، ولا تعلّم أي حقل بأنه required.
- لا تنشئ حقول شواهد أو مرفقات أو رفع ملفات أو رفع صور.
- لا تضف حقل "الشواهد المقترحة" أو أي حقل بالمعنى نفسه.
- الشواهد مدعومة من المنصة بشكل منفصل، لذا لا تمثلها كحقل عادي داخل الـ schema.
- مسموح تضيف لمسة تحسين نصية مناسبة فقط في الحقول النصية.
- اجعل الخيارات من القيم المرشحة قدر الإمكان.
- عند الحاجة لخيار مفتوح أضف خيار "أخرى" فقط مرة واحدة وبقيمة other.
- اجعل العناوين عربية رسمية ومناسبة للمدرسة.
`.trim();
}

export async function POST(request: Request) {
  const authContext = await requireCustomReportContext();

  if (!authContext.ok) {
    return NextResponse.json(
      { success: false, error: authContext.message },
      { status: authContext.status },
    );
  }

  const body = await request.json().catch(() => null);
  const prompt = cleanText(body?.prompt);

  if (prompt.length < 10) {
    return NextResponse.json(
      {
        success: false,
        error: "اكتب وصفًا أوضح للتقرير لا يقل عن 10 أحرف.",
      },
      { status: 400 },
    );
  }

  const bodyContext = readBodyContext(body?.context);

  const knowledge = findRelevantAiReportKnowledge({
    prompt,
    limit: 150,
  });

  const guidedPrompt = buildKnowledgeGuidedPrompt({
    prompt,
    topReports: knowledge.topReports,
    items: knowledge.items,
  });

  const generationContext: CustomReportGenerationContext = {
    ...bodyContext,
    mode: "create",
    previousPrompt: prompt,
    stages: normalizeList((authContext.user as any)?.teachingStages),
    specialties: normalizeList((authContext.user as any)?.teachingSpecialties),
    subjects: normalizeList((authContext.user as any)?.teachingSubjects),
  };

  const result = await generateCustomReportSchema(
    guidedPrompt,
    generationContext,
  );
  const sanitizedSchema = normalizeAiReportSchema(
    sanitizeAiReportSchema(result.schema),
  );

  return NextResponse.json({
    success: true,
    schema: sanitizedSchema,
    source: result.source,
    knowledge: {
      normalizedPrompt: knowledge.normalizedPrompt,
      matchedItemsCount: knowledge.items.length,
      topReports: knowledge.topReports.slice(0, 8),
      items: knowledge.items.slice(0, 60).map((item) => ({
        id: item.id,
        score: item.score,
        reportName: item.reportName,
        performanceElement: item.performanceElement,
        fieldLabel: item.fieldLabel,
        inputType: item.inputType,
        optionLabel: item.optionLabel,
        matchedTerms: item.matchedTerms,
      })),
    },
  });
}
