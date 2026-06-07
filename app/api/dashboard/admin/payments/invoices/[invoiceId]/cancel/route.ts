import { Prisma } from "@prisma/client";
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

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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
    include: {
      creditNotes: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "الفاتورة غير موجودة." }, { status: 404 });
  }

  const creditNoteNumber = `CN-${invoice.invoiceNumber}`;

  if (invoice.status === "CANCELED") {
    const existingCreditNote = await prisma.creditNote.findUnique({
      where: {
        creditNoteNumber,
      },
    });

    return NextResponse.json({
      invoice,
      creditNote: existingCreditNote,
      message: "الفاتورة ملغاة مسبقًا.",
    });
  }

  const snapshot =
    invoice.snapshotJson && typeof invoice.snapshotJson === "object"
      ? (invoice.snapshotJson as Record<string, unknown>)
      : {};

  const result = await prisma.$transaction(async (tx) => {
    const updatedInvoice = await tx.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: "CANCELED",
        snapshotJson: asJson({
          ...snapshot,
          canceledAt: new Date().toISOString(),
          canceledById: current.user.id,
          cancelReason: reason || null,
        }),
      },
    });

    const creditNote = await tx.creditNote.upsert({
      where: {
        creditNoteNumber,
      },
      update: {},
      create: {
        creditNoteNumber,
        invoiceId: invoice.id,
        issuedById: current.user.id,
        status: "ISSUED",
        reason: reason || "إلغاء فاتورة",
        subtotalAmount: invoice.subtotalAmount,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
        snapshotJson: asJson({
          sourceInvoiceId: invoice.id,
          sourceInvoiceNumber: invoice.invoiceNumber,
          reason: reason || null,
          issuedById: current.user.id,
          issuedAt: new Date().toISOString(),
        }),
      },
    });

    return {
      invoice: updatedInvoice,
      creditNote,
    };
  });

  await logAdminActivity({
    actorUserId: current.user.id,
    category: "PAYMENT",
    action: "CREDIT_NOTE_ISSUED_FOR_CANCELED_INVOICE",
    severity: "WARNING",
    title: "إلغاء فاتورة وإصدار إشعار دائن",
    details: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      creditNoteId: result.creditNote.id,
      creditNoteNumber: result.creditNote.creditNoteNumber,
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
    invoice: result.invoice,
    creditNote: result.creditNote,
    message: "تم إلغاء الفاتورة وإصدار إشعار دائن بنجاح.",
  });
}