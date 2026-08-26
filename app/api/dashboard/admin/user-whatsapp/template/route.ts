import { NextResponse } from "next/server";

import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { logAdminActivity } from "@/lib/admin/activity-log";
import {
  validateWhatsAppTemplateInput,
} from "@/lib/whatsapp/message-template";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const templateSelect = {
  id: true,
  name: true,
  content: true,
  coupon: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
} as const;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function serializeTemplate(template: {
  id: string;
  name: string;
  content: string;
  coupon: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
}) {
  return {
    ...template,
    status: template.isActive ? "ACTIVE" : "DRAFT",
  };
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const template = await prisma.whatsAppMessageTemplate.findFirst({
    where: { isActive: true },
    orderBy: [{ activatedAt: "desc" }, { createdAt: "desc" }],
    select: templateSelect,
  }) || await prisma.whatsAppMessageTemplate.findFirst({
    orderBy: { createdAt: "desc" },
    select: templateSelect,
  });

  return NextResponse.json(
    { template: template ? serializeTemplate(template) : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const current = await getCurrentSessionUser();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const input = validateWhatsAppTemplateInput({
    name: clean(body?.name),
    content: typeof body?.content === "string" ? body.content : "",
    coupon: clean(body?.coupon),
  });

  if (!input.ok) {
    return NextResponse.json({ error: input.error }, { status: 400 });
  }

  const activate = body?.action === "activate";
  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.whatsAppMessageTemplate.create({
      data: {
        name: input.name,
        content: input.content,
        coupon: input.coupon || null,
        isActive: false,
        createdById: current?.user?.id || null,
      },
      select: templateSelect,
    });

    if (!activate) return created;

    await tx.whatsAppMessageTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return tx.whatsAppMessageTemplate.update({
      where: { id: created.id },
      data: { isActive: true, activatedAt: new Date() },
      select: templateSelect,
    });
  });

  await logAdminActivity({
    actorUserId: current?.user?.id || null,
    category: "COMMUNICATION",
    action: activate ? "whatsapp-message-template-activated" : "whatsapp-message-template-saved",
    severity: "INFO",
    title: activate ? "تم اعتماد قالب رسالة واتساب" : "تم حفظ قالب رسالة واتساب",
    details: { templateId: template.id, isActive: activate },
  });

  return NextResponse.json({ template: serializeTemplate(template) });
}
