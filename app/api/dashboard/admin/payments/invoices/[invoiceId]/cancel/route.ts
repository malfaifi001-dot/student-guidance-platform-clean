import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const device = await getRequestDeviceInfo();
  const { invoiceId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body?.reason || "").trim();

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
      taxAmount: true,
      currency: true,
      paymentTransactionId: true,
      snapshotJson: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
  }

  if (invoice.status === "CANCELED") {
    return NextResponse.json({
      invoice,
      message: "الفاتورة ملغاة مسبقًا.",
    });
  }

  const snapshot =
    invoice.snapshotJson && typeof invoice.snapshotJson === "object"
      ? (invoice.snapshotJson as Record<string, unknown>)
      : {};

  const updatedInvoice = await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      status: "CANCELED",
      snapshotJson: {
        ...snapshot,
        canceledAt: new Date().toISOString(),
        canceledById: current.user.id,
        cancelReason: reason || null,
      },
    },
  });

  await logAdminActivity({
    actorUserId: current.user.id,
    category: "PAYMENT",
    action: "INVOICE_CANCELED",
    severity: "WARNING",
    title: "إلغاء فاتورة",
    details: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      paymentTransactionId: invoice.paymentTransactionId,
      totalAmount: invoice.totalAmount,
      taxAmount: invoice.taxAmount,
      currency: invoice.currency,
      reason: reason || null,
    },
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
  });

  return NextResponse.json({
    invoice: updatedInvoice,
    message: "تم إلغاء الفاتورة بنجاح.",
  });
}