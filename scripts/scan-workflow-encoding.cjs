require("dotenv/config");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BAD_PATTERNS = [
  "Ø",
  "Ù",
  "�",
  "Ð",
  "Ã",
];

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
  const services = await prisma.service.findMany({
    include: {
      workflows: {
        include: {
          steps: {
            include: {
              fields: {
                include: {
                  options: true,
                },
              },
              orderBy: { order: "asc" },
            },
          },
          orderBy: [{ isActive: "desc" }, { version: "desc" }, { updatedAt: "desc" }],
        },
      },
    },
    orderBy: { slug: "asc" },
  });

  const report = [];

  for (const service of services) {
    for (const workflow of service.workflows) {
      const badItems = [];

      collectBad("service.name", service.name, badItems);
      collectBad("workflow.name", workflow.name, badItems);

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

      if (badItems.length) {
        report.push({
          serviceSlug: service.slug,
          serviceName: service.name,
          workflowId: workflow.id,
          workflowName: workflow.name,
          workflowType: workflow.workflowType,
          version: workflow.version,
          status: workflow.status,
          isActive: workflow.isActive,
          badItems,
        });
      }
    }
  }

  console.log(JSON.stringify({
    scannedServices: services.length,
    affectedWorkflows: report.length,
    report,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    prisma.$disconnect();
  });
