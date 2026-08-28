import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function buildTemplate() {
  const id = "tpl-report-one-page-mosaic";

  const templateJson = {
    id,
    name: "قالب تجربة: لوحة تقرير واحدة",
    description:
      "قالب اختبار مختلف جذريًا يعرض كل قيم Workflow في صفحة واحدة فقط.",
    scope: "GLOBAL",
    serviceSlug: null,
    status: "PUBLISHED",
    documentType: "REPORT",
    designTemplateId: "report-playful-cards",
    designPreset: "one-page-workflow-mosaic",
    updatedAt: new Date().toISOString().slice(0, 10),
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
        id: `${id}-page-one`,
        kind: "content",
        title: "لوحة واحدة",
        description: "كل قيم Workflow في صفحة واحدة.",
        blocks: [
          {
            id: `${id}-all-values`,
            kind: "field-list",
            title: "كل قيم Workflow",
            content: "",
            variant: "card",
            align: "right",
            showTitle: true,
            placement: "flow",
            settings: {
              smartBlockKind: "field-list",
              style: "card",
              fieldGroup: "field-list",
              showTitle: true,
              align: "right",
              placement: "flow",
            },
          },
        ],
      },
    ],
    smartStudio: {
      version: 2,
      mode: "one-page-workflow-mosaic",
      designTemplateId: "report-playful-cards",
      lockedPages: true,
    },
  };

  return {
    id,
    name: "قالب تجربة: لوحة تقرير واحدة",
    description:
      "قالب اختبار مختلف جذريًا يعرض كل قيم Workflow في صفحة واحدة فقط.",
    serviceSlug: null,
    type: "SYSTEM" as const,
    content: JSON.stringify(templateJson),
    templateJson,
    genderAware: true,
    isActive: true,
  };
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const template = buildTemplate();

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

  return NextResponse.json({
    ok: true,
    message: "تم إنشاء قالب تجربة لوحة تقرير واحدة.",
    template: {
      id: saved.id,
      name: saved.name,
    },
  });
}
