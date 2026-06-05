require("dotenv/config");

const fs = require("fs");

function createPrismaClient() {
  const { PrismaClient } = require("@prisma/client");

  try {
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

    if (process.env.DATABASE_URL) {
      const adapter = new PrismaBetterSqlite3({
        url: process.env.DATABASE_URL,
      });

      return new PrismaClient({ adapter });
    }
  } catch (error) {
    // fallback
  }

  return new PrismaClient();
}

const prisma = createPrismaClient();

const serviceSlug = process.env.SERVICE_SLUG;

const BAD_PATTERNS = ["Ø", "Ù", "�", "Ã", "Ð"];

function hasBadEncoding(value) {
  const text = String(value ?? "");
  return BAD_PATTERNS.some((pattern) => text.includes(pattern));
}

function collectBad(label, value, results) {
  if (hasBadEncoding(value)) {
    results.push({
      label,
      value,
    });
  }
}

async function main() {
  if (!serviceSlug) {
    throw new Error("SERVICE_SLUG is required");
  }

  const service = await prisma.service.findUnique({
    where: {
      slug: serviceSlug,
    },
    include: {
      workflows: {
        orderBy: [{ isActive: "desc" }, { version: "desc" }, { updatedAt: "desc" }],
        include: {
          steps: {
            orderBy: { order: "asc" },
            include: {
              fields: {
                orderBy: { order: "asc" },
                include: {
                  options: {
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!service) {
    console.log(JSON.stringify({
      ok: false,
      error: "SERVICE_NOT_FOUND",
      serviceSlug,
    }, null, 2));
    return;
  }

  const badItems = [];

  collectBad("service.name", service.name, badItems);
  collectBad("service.description", service.description, badItems);

  for (const workflow of service.workflows) {
    collectBad(`workflow.${workflow.id}.name`, workflow.name, badItems);

    for (const step of workflow.steps) {
      collectBad(`step.${step.order}.title`, step.title, badItems);
      collectBad(`step.${step.order}.description`, step.description, badItems);

      for (const field of step.fields) {
        collectBad(`field.${field.key}.label`, field.label, badItems);
        collectBad(`field.${field.key}.placeholder`, field.placeholder, badItems);
        collectBad(`field.${field.key}.helpText`, field.helpText, badItems);

        for (const option of field.options) {
          collectBad(`option.${field.key}.${option.order}.label`, option.label, badItems);
          collectBad(`option.${field.key}.${option.order}.value`, option.value, badItems);
          collectBad(`option.${field.key}.${option.order}.linkedToValue`, option.linkedToValue, badItems);
        }
      }
    }
  }

  const summary = service.workflows.map((workflow) => ({
    id: workflow.id,
    name: workflow.name,
    workflowType: workflow.workflowType,
    version: workflow.version,
    status: workflow.status,
    isActive: workflow.isActive,
    stepsCount: workflow.steps.length,
    fieldsCount: workflow.steps.reduce((total, step) => total + step.fields.length, 0),
    optionsCount: workflow.steps.reduce(
      (total, step) =>
        total +
        step.fields.reduce((fieldTotal, field) => fieldTotal + field.options.length, 0),
      0
    ),
  }));

  console.log(JSON.stringify({
    ok: true,
    serviceSlug: service.slug,
    serviceName: service.name,
    workflowsSummary: summary,
    badItemsCount: badItems.length,
    badItems,
    activeWorkflowPreview: service.workflows[0]
      ? {
          id: service.workflows[0].id,
          name: service.workflows[0].name,
          steps: service.workflows[0].steps.map((step) => ({
            title: step.title,
            fields: step.fields.map((field) => ({
              key: field.key,
              label: field.label,
              type: field.type,
              options: field.options.slice(0, 10).map((option) => ({
                label: option.label,
                value: option.value,
                linkedToValue: option.linkedToValue,
              })),
            })),
          })),
        }
      : null,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error && error.stack ? error.stack : null,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
