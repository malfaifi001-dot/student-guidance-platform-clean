import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { createPushTemplate, listPushTemplates } from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  return NextResponse.json({ templates: await listPushTemplates() });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const current = await getCurrentSessionUser();
  if (!current?.user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, template: await createPushTemplate(await request.json(), current.user.id) }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && ["INVALID_TEMPLATE_NAME", "INVALID_PUSH_TITLE", "INVALID_PUSH_BODY", "INVALID_PUSH_ROUTE"].includes(error.message) ? error.message : "TEMPLATE_CREATE_FAILED";
    return NextResponse.json({ ok: false, error: { code } }, { status: 400 });
  }
}
