const fs = require("fs");

const schemaPath = "prisma\\schema.prisma";
let schema = fs.readFileSync(schemaPath, "utf8");

if (!schema.includes("workflowSnapshot")) {
  schema = schema.replace(
    `  workflowId      String?
  workflow        Workflow?        @relation(fields: [workflowId], references: [id])`,
    `  workflowId      String?
  workflow        Workflow?        @relation(fields: [workflowId], references: [id])
  workflowSnapshot Json?`
  );
}

fs.writeFileSync(schemaPath, schema, "utf8");

const enginePath = "engine\\cases\\case-runtime-engine.ts";
let engine = fs.readFileSync(enginePath, "utf8");

if (!engine.includes("buildWorkflowSnapshotForCase")) {
  engine = engine.replace(
    `async function findStudentOrNull(
  studentId: string | null | undefined,
  scope: CaseAccessScope
) {`,
    `async function buildWorkflowSnapshotForCase(workflowId?: string | null) {
  if (!workflowId) {
    return null;
  }

  const workflow = await prisma.workflow.findUnique({
    where: {
      id: workflowId,
    },
    include: {
      service: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
      steps: {
        include: {
          fields: {
            include: {
              options: {
                orderBy: {
                  order: "asc",
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!workflow) {
    return null;
  }

  return {
    capturedAt: new Date().toISOString(),
    id: workflow.id,
    name: workflow.name,
    version: workflow.version,
    status: workflow.status,
    isActive: workflow.isActive,
    workflowType: workflow.workflowType,
    service: workflow.service,
    steps: workflow.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      order: step.order,
      fields: step.fields.map((field) => ({
        id: field.id,
        key: field.key,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        isRequired: field.isRequired,
        order: field.order,
        dependsOnFieldKey: field.dependsOnFieldKey,
        linkedToValue: field.linkedToValue,
        allowOther: field.allowOther,
        options: field.options.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          order: option.order,
          linkedToValue: option.linkedToValue,
        })),
      })),
    })),
  };
}

async function findStudentOrNull(
  studentId: string | null | undefined,
  scope: CaseAccessScope
) {`
  );
}

if (!engine.includes("const workflowSnapshot = await buildWorkflowSnapshotForCase")) {
  engine = engine.replace(
    `  const serializedValues = serializeCaseValues(values);
  const normalizedEvidenceItems = normalizeEvidenceItems(evidenceItems);`,
    `  const serializedValues = serializeCaseValues(values);
  const normalizedEvidenceItems = normalizeEvidenceItems(evidenceItems);
  const workflowSnapshot = await buildWorkflowSnapshotForCase(existingWorkflow?.id);`
  );
}

if (!engine.includes("workflowSnapshot: workflowSnapshot || undefined")) {
  engine = engine.replace(
    `      workflowId: existingWorkflow?.id,
      studentId: existingStudent?.id,`,
    `      workflowId: existingWorkflow?.id,
      workflowSnapshot: workflowSnapshot || undefined,
      studentId: existingStudent?.id,`
  );
}

fs.writeFileSync(enginePath, engine, "utf8");

console.log("Workflow snapshot schema and saveRuntimeCase patch applied.");
