const fs = require("fs");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function patch(filePath, patcher) {
  const before = read(filePath);
  const after = patcher(before);

  if (after !== before) {
    write(filePath, after);
    console.log(`UPDATED: ${filePath}`);
  } else {
    console.log(`UNCHANGED: ${filePath}`);
  }
}

function ensure(text, needle, message) {
  if (!text.includes(needle)) {
    throw new Error(message);
  }
}

patch("app/dashboard/admin/workflows/page.tsx", (text) => {
  if (!text.includes("ensureDashboardWorkflowServices")) {
    ensure(
      text,
      'import { prisma } from "@/lib/prisma";',
      "لم أجد import prisma في app/dashboard/admin/workflows/page.tsx",
    );

    text = text.replace(
      'import { prisma } from "@/lib/prisma";',
      'import { prisma } from "@/lib/prisma";\nimport {\n  ensureDashboardWorkflowServices,\n  getWorkflowUploadServices,\n} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  } else if (!text.includes("getWorkflowUploadServices")) {
    text = text.replace(
      /import \{([^}]*ensureDashboardWorkflowServices[^}]*)\} from "@\/lib\/admin\/workflows\/ensure-dashboard-workflow-services";/s,
      'import {\n  ensureDashboardWorkflowServices,\n  getWorkflowUploadServices,\n} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  }

  if (!text.includes("await ensureDashboardWorkflowServices();")) {
    text = text.replace(
      "export default async function AdminWorkflowsPage() {\n",
      "export default async function AdminWorkflowsPage() {\n  await ensureDashboardWorkflowServices();\n\n",
    );
  }

  if (!text.includes("const workflowUploadServices = getWorkflowUploadServices();")) {
    text = text.replace(
      "  const workflows = await prisma.workflow.findMany({",
      "  const workflowUploadServices = getWorkflowUploadServices();\n\n  const workflows = await prisma.workflow.findMany({",
    );
  }

  text = text.replaceAll(
    "dashboardServices.map((service) => {",
    "workflowUploadServices.map((service) => {",
  );

  return text;
});

patch("app/dashboard/admin/workflows/[serviceSlug]/page.tsx", (text) => {
  if (!text.includes("ensureDashboardWorkflowService")) {
    ensure(
      text,
      'import { prisma } from "@/lib/prisma";',
      "لم أجد import prisma في صفحة serviceSlug",
    );

    text = text.replace(
      'import { prisma } from "@/lib/prisma";',
      'import { prisma } from "@/lib/prisma";\nimport {\n  ensureDashboardWorkflowService,\n  isWorkflowUploadEligibleService,\n} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  } else if (!text.includes("isWorkflowUploadEligibleService")) {
    text = text.replace(
      /import \{([^}]*ensureDashboardWorkflowService[^}]*)\} from "@\/lib\/admin\/workflows\/ensure-dashboard-workflow-services";/s,
      'import {\n  ensureDashboardWorkflowService,\n  isWorkflowUploadEligibleService,\n} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  }

  const oldBlock =
`  if (!serviceConfig) {
    notFound();
  }`;

  const newBlock =
`  if (!serviceConfig || !isWorkflowUploadEligibleService(serviceConfig)) {
    notFound();
  }`;

  if (text.includes(oldBlock) && !text.includes(newBlock)) {
    text = text.replace(oldBlock, newBlock);
  }

  if (!text.includes("await ensureDashboardWorkflowService(serviceSlug);")) {
    const marker =
`  const service = await prisma.service.findUnique({`;

    ensure(text, marker, "لم أجد موضع استعلام الخدمة في صفحة serviceSlug");

    text = text.replace(
      marker,
      "  await ensureDashboardWorkflowService(serviceSlug);\n\n  const service = await prisma.service.findUnique({",
    );
  }

  return text;
});

patch("app/api/dashboard/admin/workflows/upload/route.ts", (text) => {
  if (!text.includes("ensureDashboardWorkflowService")) {
    ensure(
      text,
      'import { dashboardServices } from "@/lib/constants/services";',
      "لم أجد import dashboardServices في API الرفع",
    );

    text = text.replace(
      'import { dashboardServices } from "@/lib/constants/services";',
      'import { dashboardServices } from "@/lib/constants/services";\nimport {\n  ensureDashboardWorkflowService,\n  isWorkflowUploadEligibleService,\n} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  } else if (!text.includes("isWorkflowUploadEligibleService")) {
    text = text.replace(
      /import \{([^}]*ensureDashboardWorkflowService[^}]*)\} from "@\/lib\/admin\/workflows\/ensure-dashboard-workflow-services";/s,
      'import {\n  ensureDashboardWorkflowService,\n  isWorkflowUploadEligibleService,\n} from "@/lib/admin/workflows/ensure-dashboard-workflow-services";',
    );
  }

  const oldBlock =
`    if (!serviceConfig) {
      return NextResponse.json(
        {
          success: false,
          error: "الخدمة غير معروفة.",
        },
        { status: 400 }
      );
    }`;

  const newBlock =
`    if (!serviceConfig || !isWorkflowUploadEligibleService(serviceConfig)) {
      return NextResponse.json(
        {
          success: false,
          error: "هذه الخدمة لا تستخدم Workflow من Excel.",
        },
        { status: 400 }
      );
    }`;

  if (text.includes(oldBlock)) {
    text = text.replace(oldBlock, newBlock);
  }

  if (!text.includes("await ensureDashboardWorkflowService(serviceSlug);")) {
    const marker =
`    const buffer = await file.arrayBuffer();`;

    ensure(text, marker, "لم أجد موضع قراءة ملف Excel في API الرفع");

    text = text.replace(
      marker,
      "    await ensureDashboardWorkflowService(serviceSlug);\n\n    const buffer = await file.arrayBuffer();",
    );
  }

  return text;
});
