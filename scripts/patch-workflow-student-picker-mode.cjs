const fs = require("fs");

function read(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`لم يتم العثور على ${path}`);
  }

  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content, "utf8");
}

function patchSchema() {
  const path = "prisma/schema.prisma";
  let content = read(path);

  if (!/enum\s+StudentPickerMode\s*\{/.test(content)) {
    content = content.replace(
      /enum\s+WorkflowStatus\s*\{/,
      `enum StudentPickerMode {
  SERVICE_DEFAULT
  REQUIRED
  DISABLED
}

enum WorkflowStatus {`
    );
  }

  const workflowMatch = content.match(/model\s+Workflow\s*\{[\s\S]*?\n\}/);

  if (!workflowMatch) {
    throw new Error("لم يتم العثور على model Workflow داخل schema.prisma");
  }

  const workflowBlock = workflowMatch[0];

  if (!/studentPickerMode\s+StudentPickerMode/.test(workflowBlock)) {
    const updatedWorkflowBlock = workflowBlock.replace(
      /(\s+workflowType\s+String\s+@default\("default"\)\s*)/,
      `$1
  studentPickerMode StudentPickerMode @default(SERVICE_DEFAULT)
`
    );

    content = content.replace(workflowBlock, updatedWorkflowBlock);
  }

  write(path, content);
}

function patchDraftRoute() {
  const path = "app/api/dashboard/admin/workflows/[serviceSlug]/draft/route.ts";
  let content = read(path);

  content = content.replace(
    `import { FieldType } from "@prisma/client";`,
    `import { FieldType, StudentPickerMode } from "@prisma/client";`
  );

  if (!content.includes("const STUDENT_PICKER_MODES = new Set")) {
    content = content.replace(
      `const FIELD_TYPES = new Set(Object.values(FieldType));`,
      `const FIELD_TYPES = new Set(Object.values(FieldType));

const STUDENT_PICKER_MODES = new Set(Object.values(StudentPickerMode));

function normalizeStudentPickerMode(value: unknown): StudentPickerMode {
  const text = clean(value).toUpperCase();

  return STUDENT_PICKER_MODES.has(text as StudentPickerMode)
    ? (text as StudentPickerMode)
    : StudentPickerMode.SERVICE_DEFAULT;
}`
    );
  }

  if (!content.includes("const studentPickerMode = normalizeStudentPickerMode(body?.studentPickerMode);")) {
    content = content.replace(
      `const workflowType = normalizeWorkflowType(body?.workflowType);`,
      `const workflowType = normalizeWorkflowType(body?.workflowType);
    const studentPickerMode = normalizeStudentPickerMode(body?.studentPickerMode);`
    );
  }

  if (!content.includes("studentPickerMode,")) {
    content = content.replace(
      `workflowType,
        status: "DRAFT",`,
      `workflowType,
        studentPickerMode,
        status: "DRAFT",`
    );
  }

  write(path, content);
}

function patchUploadRoute() {
  const path = "app/api/dashboard/admin/workflows/upload/route.ts";
  let content = read(path);

  if (!content.includes(`import { StudentPickerMode } from "@prisma/client";`)) {
    content = content.replace(
      `import { NextResponse } from "next/server";`,
      `import { NextResponse } from "next/server";
import { StudentPickerMode } from "@prisma/client";`
    );
  }

  if (!content.includes(`import { prisma } from "@/lib/prisma";`)) {
    content = content.replace(
      `import { logAdminActivity } from "@/lib/admin/activity-log";`,
      `import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";`
    );
  }

  if (!content.includes("const STUDENT_PICKER_MODES = new Set")) {
    content = content.replace(
      `const MAX_WORKFLOW_FILE_SIZE = 5 * 1024 * 1024;`,
      `const STUDENT_PICKER_MODES = new Set(Object.values(StudentPickerMode));

function normalizeStudentPickerMode(value: unknown): StudentPickerMode {
  const text = String(value ?? "").trim().toUpperCase();

  return STUDENT_PICKER_MODES.has(text as StudentPickerMode)
    ? (text as StudentPickerMode)
    : StudentPickerMode.SERVICE_DEFAULT;
}

const MAX_WORKFLOW_FILE_SIZE = 5 * 1024 * 1024;`
    );
  }

  if (!content.includes("const studentPickerMode = normalizeStudentPickerMode")) {
    content = content.replace(
      `const workflowType = normalizeWorkflowType(
      String(formData.get("workflowType") ?? "")
    );`,
      `const workflowType = normalizeWorkflowType(
      String(formData.get("workflowType") ?? "")
    );
    const studentPickerMode = normalizeStudentPickerMode(
      formData.get("studentPickerMode")
    );`
    );
  }

  if (!content.includes("WORKFLOW_UPLOAD_STUDENT_PICKER_MODE_MARKER")) {
    content = content.replace(
      `const result = await uploadWorkflowForService({
      serviceSlug,
      serviceName: serviceConfig.title,
      rows,
      workflowType,
    });`,
      `const result = await uploadWorkflowForService({
      serviceSlug,
      serviceName: serviceConfig.title,
      rows,
      workflowType,
    });

    const uploadedWorkflow = await prisma.workflow.findFirst({
      where: {
        service: {
          slug: serviceSlug,
        },
        workflowType,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (uploadedWorkflow) {
      await prisma.workflow.update({
        where: {
          id: uploadedWorkflow.id,
        },
        data: {
          studentPickerMode,
        },
      });
    }

    // WORKFLOW_UPLOAD_STUDENT_PICKER_MODE_MARKER`
    );
  }

  if (!content.includes("studentPickerMode,")) {
    content = content.replace(
      `workflowType,
        fileName: file.name,`,
      `workflowType,
        studentPickerMode,
        fileName: file.name,`
    );
  }

  write(path, content);
}

function patchDynamicFormRenderer() {
  const path = "components/workflow/dynamic-form-renderer.tsx";
  let content = read(path);

  if (!content.includes("WORKFLOW_STUDENT_PICKER_MODE_RUNTIME_MARKER")) {
    content = content.replace(
      /const needsStudent\s*=\s*requiresStudent\s*\?\?\s*SERVICES_REQUIRING_STUDENT\.has\(workflow\.serviceSlug\);/,
      `const workflowStudentPickerMode =
    typeof (workflow as any).studentPickerMode === "string"
      ? (workflow as any).studentPickerMode
      : "SERVICE_DEFAULT";

  const needsStudent =
    requiresStudent ??
    (workflowStudentPickerMode === "REQUIRED"
      ? true
      : workflowStudentPickerMode === "DISABLED"
        ? false
        : SERVICES_REQUIRING_STUDENT.has(workflow.serviceSlug));

  // WORKFLOW_STUDENT_PICKER_MODE_RUNTIME_MARKER`
    );
  }

  write(path, content);
}

patchSchema();
patchDraftRoute();
patchUploadRoute();
patchDynamicFormRenderer();

console.log("تم تجهيز خيار Smart Picker داخل Workflow.");
