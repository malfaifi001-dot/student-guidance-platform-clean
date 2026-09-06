import { NextResponse } from "next/server";

import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import {
  getAccountabilityRequestForPrincipal,
  updateAccountabilityDraft,
} from "@/lib/accountability/accountability-request-service";

type Context = { params: Promise<{ requestId: string }> };

async function authorize() {
  const access = await requirePrincipalApi();
  if (!access.ok) return access;
  const serviceGuard = await requireServiceAccessApi(ACCOUNTABILITY_SERVICE.slug, {
    allowPrincipal: true,
  });
  if (serviceGuard) return { ok: false as const, response: serviceGuard };
  return access;
}

function requestContext(access: Extract<Awaited<ReturnType<typeof requirePrincipalApi>>, { ok: true }>) {
  return {
    user: { id: access.user.id, role: access.user.role, schoolAccountId: access.schoolAccountId },
    schoolAccountId: access.schoolAccountId as string,
  };
}

export async function GET(_request: Request, context: Context) {
  const access = await authorize();
  if (!access.ok) return access.response;
  const { requestId } = await context.params;
  const item = await getAccountabilityRequestForPrincipal(requestContext(access), requestId);
  if (!item) return NextResponse.json({ success: false, error: "المسودة غير موجودة." }, { status: 404 });
  return NextResponse.json({ success: true, request: item });
}

export async function PATCH(request: Request, context: Context) {
  const access = await authorize();
  if (!access.ok) return access.response;
  const { requestId } = await context.params;

  try {
    const body = await request.json().catch(() => null);
    const item = await updateAccountabilityDraft({
      context: requestContext(access),
      requestId,
      recipient: {
        respondentUserId: body?.respondentUserId,
        respondentName: String(body?.respondentName || ""),
      },
      categoryKey: String(body?.categoryKey || ""),
      typeKey: String(body?.typeKey || ""),
      title: String(body?.title || ""),
      managerValues: body?.managerValues && typeof body.managerValues === "object" ? body.managerValues : {},
      officialText: String(body?.officialText || body?.officialTextSnapshot || ""),
    });
    return NextResponse.json({ success: true, request: item });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "تعذر تحديث المسودة." },
      { status: 400 },
    );
  }
}
