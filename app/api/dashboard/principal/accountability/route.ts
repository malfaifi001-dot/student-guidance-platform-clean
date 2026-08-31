import { NextResponse } from "next/server";

import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import {
  createAccountabilityDraft,
  listAccountabilityDrafts,
} from "@/lib/accountability/accountability-request-service";

function contextFromAccess(access: Extract<Awaited<ReturnType<typeof requirePrincipalApi>>, { ok: true }>) {
  return {
    user: {
      id: access.user.id,
      role: access.user.role,
      schoolAccountId: access.schoolAccountId,
    },
    schoolAccountId: access.schoolAccountId as string,
  };
}

async function authorize() {
  const access = await requirePrincipalApi();
  if (!access.ok) return access;

  const serviceGuard = await requireServiceAccessApi(ACCOUNTABILITY_SERVICE.slug, {
    allowPrincipal: true,
  });
  if (serviceGuard) {
    return { ok: false as const, response: serviceGuard };
  }

  return access;
}

export async function GET() {
  const access = await authorize();
  if (!access.ok) return access.response;

  const requests = await listAccountabilityDrafts(contextFromAccess(access));
  return NextResponse.json({ success: true, requests });
}

export async function POST(request: Request) {
  const access = await authorize();
  if (!access.ok) return access.response;

  try {
    const body = await request.json().catch(() => null);
    const created = await createAccountabilityDraft({
      context: contextFromAccess(access),
      workflowId: String(body?.workflowId || ""),
      recipient: {
        respondentUserId: body?.respondentUserId,
        respondentName: String(body?.respondentName || ""),
      },
      categoryKey: String(body?.categoryKey || ""),
      typeKey: String(body?.typeKey || ""),
      title: String(body?.title || ""),
      managerValues:
        body?.managerValues && typeof body.managerValues === "object"
          ? body.managerValues
          : {},
      officialTextTemplate: String(body?.officialTextSnapshot || ""),
    });

    return NextResponse.json({ success: true, request: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "تعذر حفظ المسودة." },
      { status: 400 },
    );
  }
}
