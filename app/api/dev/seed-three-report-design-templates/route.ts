import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function block(id: string, kind: string, title: string, options: Record<string, any> = {}) {
  return {
    id,
    kind,
    title,
    content: options.content || "",
    variant: options.variant || "card",
    align: options.align || "right",
    showTitle: options.showTitle !== false,
    showMeta: options.showMeta ?? false,
    placement: options.placement || "flow",
    settings: {
      smartBlockKind: kind,
      style: options.variant || "card",
      showTitle: options.showTitle !== false,
      showMeta: options.showMeta ?? false,
      align: options.align || "right",
      placement: options.placement || "flow",
      fieldGroup: options.fieldGroup || kind,
      evidenceLayout: options.evidenceLayout || "GRID_2X2",
      evidenceFit: options.evidenceFit || "contain",
      evidenceAspectRatio: options.evidenceAspectRatio || "LANDSCAPE_4_3",
      evidenceShowCaptions: options.evidenceShowCaptions ?? true,
      evidenceAutoCreatePages: options.evidenceAutoCreatePages ?? true,
      evidenceEmptyBehavior: options.evidenceEmptyBehavior || "message",
    },
  };
}

function buildTemplate({
  id,
  name,
  description,
  designTemplateId,
}: {
  id: string;
  name: string;
  description: string;
  designTemplateId: string;
}) {
  const templateJson = {
    id,
    name,
    description,
    scope: "GLOBAL",
    serviceSlug: null,
    status: "PUBLISHED",
    documentType: "REPORT",
    designTemplateId,
    designPreset: designTemplateId,
    updatedAt: new Date().toISOString().slice(0, 10),
    officialLayout: {
      pageSize: "A4",
      multiPage: true,
      headerLocked: true,
      identityLocked: false,
    },
    workflowBinding: {
      scope: "GLOBAL",
      serviceSlug: null,
      workflowSlug: null,
      locationKey: "reports.new",
      fields: [],
      usedFieldKeys: [],
    },
    pages: [
      {
        id: `${id}-page-summary`,
        kind: "content",
        title: "ملخص التقرير",
        description: "صفحة تعرض عنوان التقرير وبيانات الحالة والطالب.",
        blocks: [
          block(`${id}-hero`, "hero-title", "عنوان التقرير", {
            content: "{{case.title}}",
            variant: "hero",
            align: "center",
            showTitle: false,
          }),
          block(`${id}-case-meta`, "field-list", "بيانات الحالة", {
            variant: "soft",
            fieldGroup: "case-meta",
          }),
          block(`${id}-student`, "field-list", "بيانات الطالب/الطالبة", {
            variant: "card",
            fieldGroup: "student-summary",
          }),
        ],
      },
      {
        id: `${id}-page-values`,
        kind: "content",
        title: "القيم والتفاصيل",
        description: "صفحة تعرض القيم المحفوظة من Workflow.",
        blocks: [
          block(`${id}-intro`, "multi-paragraph", "تمهيد التقرير", {
            variant: "outline",
            content:
              "تم إعداد هذا التقرير اعتمادًا على البيانات المدخلة في الحالة المرتبطة بخدمة {{service.name}}.\n\nتعرض الصفحة التالية القيم والتفاصيل كما تم حفظها داخل النظام دون الحاجة لإعادة إدخالها يدويًا.",
          }),
          block(`${id}-values`, "field-list", "القيم المسجلة", {
            variant: "card",
            fieldGroup: "field-list",
          }),
        ],
      },
      {
        id: `${id}-page-evidence`,
        kind: "evidence",
        title: "الشواهد والمرفقات",
        description: "صفحة تعرض الشواهد المرتبطة بالحالة.",
        blocks: [
          block(`${id}-evidence`, "evidence-gallery", "الشواهد والمرفقات", {
            variant: "card",
            evidenceLayout: "GRID_2X2",
            evidenceFit: "contain",
            evidenceAspectRatio: "LANDSCAPE_4_3",
            evidenceShowCaptions: true,
            evidenceAutoCreatePages: true,
            evidenceEmptyBehavior: "message",
          }),
        ],
      },
      {
        id: `${id}-page-approval`,
        kind: "approval",
        title: "الخاتمة والاعتماد",
        description: "صفحة ختامية للتقرير.",
        blocks: [
          block(`${id}-closing`, "closing-note", "الخاتمة", {
            variant: "quote",
            content:
              "تم إعداد هذا التقرير من Teachix بناءً على بيانات الحالة والشواهد المرتبطة بها، ويمكن مراجعته واعتماده وفق الإجراءات المعمول بها.",
          }),
        ],
      },
    ],
    smartStudio: {
      version: 2,
      mode: "fixed-report-template",
      designTemplateId,
    },
  };

  return {
    id,
    name,
    description,
    serviceSlug: null,
    type: "SYSTEM" as const,
    content: JSON.stringify(templateJson),
    templateJson,
    genderAware: true,
    isActive: true,
  };
}

const templates = [
  buildTemplate({
    id: "tpl-report-official-archive",
    name: "قالب تقرير رسمي منظم",
    description: "قالب رسمي صارم يعرض نفس بيانات التقرير في جداول وخانات اعتماد واضحة.",
    designTemplateId: "report-official-archive",
  }),
  buildTemplate({
    id: "tpl-report-playful-cards",
    name: "قالب تقرير مرح بالبطاقات",
    description: "قالب بصري مرح يعرض نفس بيانات التقرير كبطاقات نشاط وكروت واضحة.",
    designTemplateId: "report-playful-cards",
  }),
  buildTemplate({
    id: "tpl-report-calm-reader",
    name: "قالب تقرير مريح للقراءة",
    description: "قالب هادئ واسع يعرض نفس بيانات التقرير بأسلوب مريح ومنظم.",
    designTemplateId: "report-calm-reader",
  }),
];

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, message: "Dev endpoint is disabled in production." },
      { status: 404 },
    );
  }

  const seeded = [];

  for (const template of templates) {
    const saved = await prisma.reportTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        description: template.description,
        serviceSlug: template.serviceSlug,
        type: template.type,
        content: template.content,
        templateJson: template.templateJson,
        genderAware: template.genderAware,
        isActive: template.isActive,
      },
      create: template,
    });

    seeded.push({
      id: saved.id,
      name: saved.name,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "تم زرع قوالب التقارير الثلاثة بنجاح.",
    seeded,
  });
}
