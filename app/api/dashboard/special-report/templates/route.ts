import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireDashboardUser } from "@/lib/auth/require-auth";

import {
  isValidPerformanceElement,
  normalizeSpecialReportFieldKeys,
} from "@/lib/special-report/catalog";

import {
  SPECIAL_REPORT_SERVICE_SLUG,
} from "@/lib/special-report/types";

type SpecialReportTemplateConfig = {
  kind: "SPECIAL_REPORT_TEMPLATE";
  version: 1;
  performanceElement: string;
  fieldKeys: string[];
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
      typeof parsed.performanceElement !== "string" ||
      !Array.isArray(parsed.fieldKeys)
    ) {
      return null;
    }

    return {
      kind: "SPECIAL_REPORT_TEMPLATE",
      version: 1,
      performanceElement: parsed.performanceElement,
      fieldKeys: parsed.fieldKeys.map(String),
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
    };

    const name = String(body.name ?? "").trim();

    const performanceElement = String(
      body.performanceElement ?? ""
    ).trim();

    const fieldKeys = Array.isArray(body.fieldKeys)
      ? body.fieldKeys.map(String)
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

    if (!isValidPerformanceElement(performanceElement)) {
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

      performanceElement,

      fieldKeys:
        normalizeSpecialReportFieldKeys(fieldKeys),
    };

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
