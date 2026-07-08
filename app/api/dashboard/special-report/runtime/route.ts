import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";

import {
  isValidPerformanceElement,
  normalizeSpecialReportFieldKeys,
} from "@/lib/special-report/catalog";

import { createSpecialReportRuntime } from "@/lib/special-report/runtime-builder";

type CreateRuntimeBody = {
  performanceElement?: unknown;
  fieldKeys?: unknown;
  fieldLabelOverrides?: unknown;
};

export async function POST(request: Request) {
  const authResult = await requireDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  if (!authResult.isAdmin && !authResult.schoolAccountId) {
    return NextResponse.json(
      {
        error: "لم يتم ربط الحساب بمدرسة.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const body =
      (await request.json()) as CreateRuntimeBody;

    const performanceElement = String(
      body.performanceElement ?? ""
    ).trim();

    const fieldKeys = Array.isArray(body.fieldKeys)
      ? body.fieldKeys.map((value) => String(value))
      : [];

    if (!isValidPerformanceElement(performanceElement)) {
      return NextResponse.json(
        {
          error: "اختر عنصر أداء صالحًا.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedFieldKeys =
      normalizeSpecialReportFieldKeys(fieldKeys);

    const fieldLabelOverrides =
      body.fieldLabelOverrides &&
      typeof body.fieldLabelOverrides === "object" &&
      !Array.isArray(body.fieldLabelOverrides)
        ? Object.fromEntries(
            Object.entries(
              body.fieldLabelOverrides as Record<string, unknown>
            ).map(([key, value]) => [key, String(value ?? "")])
          )
        : undefined;

    const runtime =
      await createSpecialReportRuntime({
        performanceElement,
        fieldKeys: normalizedFieldKeys,
        fieldLabelOverrides,
        schoolAccountId: authResult.schoolAccountId,
        createdById: authResult.user.id,
      });

    return NextResponse.json(runtime);
  } catch (error) {
    console.error(
      "special-report runtime creation failed",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "تعذر إنشاء نموذج التقرير الخاص.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}
