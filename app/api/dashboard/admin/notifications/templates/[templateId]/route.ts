import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { deletePushTemplate, updatePushTemplate } from "@/lib/notifications/push-center-service";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ templateId: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { templateId } = await context.params;
  try { return NextResponse.json({ ok: true, template: await updatePushTemplate(templateId, await request.json()) }); }
  catch (error) { return NextResponse.json({ ok: false, error: { code: error instanceof Error && error.message === "TEMPLATE_NOT_FOUND" ? error.message : "TEMPLATE_UPDATE_FAILED" } }, { status: 400 }); }
}

export async function DELETE(_request: Request, context: { params: Promise<{ templateId: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { templateId } = await context.params;
  try { await deletePushTemplate(templateId); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ ok: false, error: { code: "TEMPLATE_DELETE_FAILED" } }, { status: 400 }); }
}
