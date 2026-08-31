import { NextResponse } from "next/server";
import { requirePrincipalApi } from "@/lib/principal/principal-api-guard";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";
import { ACCOUNTABILITY_SERVICE } from "@/lib/accountability/accountability-types";
import { reviewAccountabilityRequest, type AccountabilityReviewAction } from "@/lib/accountability/accountability-request-service";

type Context = { params: Promise<{ requestId: string }> };

async function authorize() {
  const access = await requirePrincipalApi();
  if (!access.ok) return access;
  const denied = await requireServiceAccessApi(ACCOUNTABILITY_SERVICE.slug, { allowPrincipal: true });
  if (denied) return { ok: false as const, response: denied };
  return access;
}

export async function POST(request: Request, context: Context) {
  const access = await authorize();
  if (!access.ok) return access.response;
  try {
    const body = await request.json().catch(() => null);
    const item = await reviewAccountabilityRequest({
      context: { user: { id: access.user.id, role: access.user.role, schoolAccountId: access.schoolAccountId }, schoolAccountId: access.schoolAccountId as string },
      requestId: (await context.params).requestId,
      action: body?.action as AccountabilityReviewAction,
      reviewValues: body?.values && typeof body.values === "object" ? body.values : {},
      returnedReason: typeof body?.returnedReason === "string" ? body.returnedReason : undefined,
    });
    return NextResponse.json({ success: true, status: item.status });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "تعذر حفظ المراجعة." }, { status: 400 });
  }
}
