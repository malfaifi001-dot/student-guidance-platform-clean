import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireDashboardUser } from "@/lib/auth/require-auth";

import {
  normalizeSpecialReportFieldKeys,
  validateSpecialReportCustomFields,
} from "@/lib/special-report/catalog";

import {
  SPECIAL_REPORT_SERVICE_SLUG,
  type SpecialReportCustomFieldConfig,
} from "@/lib/special-report/types";

type SpecialReportTemplateConfig = {
  kind: "SPECIAL_REPORT_TEMPLATE";
  version: 1;
  performanceElement?: string;
  fieldKeys: string[];
  customFields?: SpecialReportCustomFieldConfig[];
};

function parseTemplateConfig(
  content: string | null
): SpecialReportTemplateConfig | null {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as Partial<SpecialReportTemplateConfig>;

    if (
      parsed.kind !== "SPECIAL_REPORT_TEMPLATE" ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.fieldKeys)
    ) {
      return null;
    }

    return {
      kind: "SPECIAL_REPORT_TEMPLATE",
      version: 1,
      ...(typeof parsed.performanceElement === "string"
        ? { performanceElement: parsed.performanceElement }
        : {}),
      fieldKeys: parsed.fieldKeys.map(String),
      customFields: Array.isArray(parsed.customFields)
        ? parsed.customFields as SpecialReportCustomFieldConfig[]
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const currentUser = await requireDashboardUser();

  const templates = await prisma.reportTemplate.findMany({
    where: {
      createdById: currentUser.user.id,
      serviceSlug: SPECIAL_REPORT_SERVICE_SLUG,
      type: "PERSONAL",
      isActive: true,
    },

    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({
    templates: templates
      .map((template) => {
        const config = parseTemplateConfig(template.content);

        if (!config) {
          return null;
        }

        return {
          id: template.id,
          name: template.name,
          config,
          updatedAt: template.updatedAt,
        };
      })
      .filter(Boolean),
  });
}

export async function POST(request: Request) {
  const currentUser = await requireDashboardUser();

  try {
    const body = (await request.json()) as {
      name?: unknown;
      performanceElement?: unknown;
      fieldKeys?: unknown;
      customFields?: unknown;
    };

    const name = String(body.name ?? "").trim();

    const fieldKeys = Array.isArray(body.fieldKeys)
      ? body.fieldKeys.map(String)
      : [];
    const customFields = Array.isArray(body.customFields)
      ? (body.customFields as SpecialReportCustomFieldConfig[])
      : [];

    if (name.length < 3 || name.length > 100) {
      return NextResponse.json(
        {
          error:
            "اسم القالب يجب أن يكون بين 3 و100 حرف.",
        },
        {
          status: 400,
        }
      );
    }

    if (false) {
      return NextResponse.json(
        {
          error: "عنصر الأداء غير صالح.",
        },
        {
          status: 400,
        }
      );
    }

    const config: SpecialReportTemplateConfig = {
      kind: "SPECIAL_REPORT_TEMPLATE",

      version: 1,

      fieldKeys:
        normalizeSpecialReportFieldKeys(
          [...fieldKeys, ...customFields.map((field) => field.key)],
          customFields.map((field) => field.key),
        ),
      customFields: customFields.length ? customFields : undefined,
    };

    validateSpecialReportCustomFields(config.customFields);

    const template =
      await prisma.reportTemplate.create({
        data: {
          name,

          serviceSlug:
            SPECIAL_REPORT_SERVICE_SLUG,

          type: "PERSONAL",

          content: JSON.stringify(config),

          genderAware: true,

          isActive: true,

          createdById:
            currentUser.user.id,
        },
      });

    return NextResponse.json(
      {
        template: {
          id: template.id,

          name: template.name,

          config,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "special-report template creation failed",
      error
    );

    return NextResponse.json(
      {
        error: "تعذر حفظ قالب التقرير.",
      },
      {
        status: 500,
      }
    );
  }
}
