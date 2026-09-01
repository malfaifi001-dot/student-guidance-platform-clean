import { NextResponse } from "next/server";

import { requireDashboardApiContext } from "@/lib/auth/dashboard-context";

import { normalizeSpecialReportFieldKeys } from "@/lib/special-report/catalog";

import { createSpecialReportRuntime } from "@/lib/special-report/runtime-builder";
import type { SpecialReportCustomFieldConfig } from "@/lib/special-report/types";

type CreateRuntimeBody = {
  performanceElement?: unknown;
  fieldKeys?: unknown;
  fieldLabelOverrides?: unknown;
  customFields?: unknown;
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

    const fieldKeys = Array.isArray(body.fieldKeys)
      ? body.fieldKeys.map((value) => String(value))
      : [];

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

    const customFields = Array.isArray(body.customFields)
      ? (body.customFields as SpecialReportCustomFieldConfig[])
      : undefined;

    const normalizedFieldKeys =
      normalizeSpecialReportFieldKeys([
        ...fieldKeys,
        ...(customFields ?? []).map((field) => String(field.key ?? "")),
      ], (customFields ?? []).map((field) => String(field.key ?? "")));

    const runtime =
      await createSpecialReportRuntime({
        fieldKeys: normalizedFieldKeys,
        fieldLabelOverrides,
        customFields,
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
        : "تعذر إنشاء نموذج التقرير المخصص.";

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
