const fs = require("fs");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function patchFile(filePath, patcher) {
  const before = read(filePath);
  const after = patcher(before);

  if (after !== before) {
    write(filePath, after);
    console.log(`UPDATED: ${filePath}`);
  } else {
    console.log(`UNCHANGED: ${filePath}`);
  }
}

function ensureContains(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message);
  }
}

patchFile("app/dashboard/admin/workflows/page.tsx", (text) => {
  if (!text.includes("ensureDashboardWorkflowServices")) {
    ensureContains(
      text,
      'import { prisma } from "@/lib/prisma";',
      "لم أجد import prisma في صفحة مركز Workflows.",
    );

    text = text.replace(
      'import { prisma } from "@/lib/prisma";',
      'import { prisma } from "@/lib/prisma";\nimport { ensureDashboardWorkflowServices } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  }

  if (!text.includes("await ensureDashboardWorkflowServices();")) {
    ensureContains(
      text,
      "export default async function AdminWorkflowsPage() {\n  const workflows = await prisma.workflow.findMany({",
      "لم أجد بداية AdminWorkflowsPage بالشكل المتوقع.",
    );

    text = text.replace(
      "export default async function AdminWorkflowsPage() {\n  const workflows = await prisma.workflow.findMany({",
      "export default async function AdminWorkflowsPage() {\n  await ensureDashboardWorkflowServices();\n\n  const workflows = await prisma.workflow.findMany({",
    );
  }

  return text;
});

patchFile("app/dashboard/admin/workflows/[serviceSlug]/page.tsx", (text) => {
  if (!text.includes("ensureDashboardWorkflowService")) {
    ensureContains(
      text,
      'import { prisma } from "@/lib/prisma";',
      "لم أجد import prisma في صفحة serviceSlug.",
    );

    text = text.replace(
      'import { prisma } from "@/lib/prisma";',
      'import { prisma } from "@/lib/prisma";\nimport { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  }

  if (!text.includes("await ensureDashboardWorkflowService(serviceSlug);")) {
    const marker =
      "  if (!serviceConfig) {\n    notFound();\n  }\n\n  const service = await prisma.service.findUnique({";

    ensureContains(
      text,
      marker,
      "لم أجد موضع إدخال ensureDashboardWorkflowService في صفحة serviceSlug.",
    );

    text = text.replace(
      marker,
      "  if (!serviceConfig) {\n    notFound();\n  }\n\n  await ensureDashboardWorkflowService(serviceSlug);\n\n  const service = await prisma.service.findUnique({",
    );
  }

  return text;
});

patchFile("app/api/dashboard/admin/workflows/upload/route.ts", (text) => {
  if (!text.includes("ensureDashboardWorkflowService")) {
    ensureContains(
      text,
      'import { dashboardServices } from "@/lib/constants/services";',
      "لم أجد import dashboardServices في API الرفع.",
    );

    text = text.replace(
      'import { dashboardServices } from "@/lib/constants/services";',
      'import { dashboardServices } from "@/lib/constants/services";\nimport { ensureDashboardWorkflowService } from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  }

  if (!text.includes("await ensureDashboardWorkflowService(serviceSlug);")) {
    const marker =
      '    if (!serviceConfig) {\n      return NextResponse.json(\n        {\n          success: false,\n          error: "الخدمة غير معروفة.",\n        },\n        { status: 400 }\n      );\n    }\n\n    const buffer = await file.arrayBuffer();';

    ensureContains(
      text,
      marker,
      "لم أجد موضع إدخال ensureDashboardWorkflowService في API الرفع.",
    );

    text = text.replace(
      marker,
      '    if (!serviceConfig) {\n      return NextResponse.json(\n        {\n          success: false,\n          error: "الخدمة غير معروفة.",\n        },\n        { status: 400 }\n      );\n    }\n\n    await ensureDashboardWorkflowService(serviceSlug);\n\n    const buffer = await file.arrayBuffer();',
    );
  }

  return text;
});
