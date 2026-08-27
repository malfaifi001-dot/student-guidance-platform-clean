import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import {
  AdminInvoiceError,
  getOrCreateInvoiceForPaymentTransaction,
} from "@/lib/admin/invoices";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ transactionId: string }>;
};

function getMetadataSchoolAccountId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const metadata = value as Record<string, unknown>;
  return typeof metadata.schoolAccountId === "string"
    ? metadata.schoolAccountId
    : null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json(
      { ok: false, error: "يجب تسجيل الدخول للوصول إلى الفاتورة." },
      { status: 401 },
    );
  }

  const { transactionId } = await context.params;

  try {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        metadataJson: true,
        subscription: {
          select: { schoolAccountId: true, userId: true },
        },
      },
    });

    const ownerSchoolAccountId =
      getMetadataSchoolAccountId(transaction?.metadataJson) ||
      transaction?.subscription?.schoolAccountId ||
      null;

    if (
      !transaction ||
      !ownerSchoolAccountId ||
      ownerSchoolAccountId !== current.user.schoolAccountId ||
      transaction.subscription?.userId !== current.user.id
    ) {
      return NextResponse.json(
        { ok: false, error: "لم يتم العثور على الفاتورة المطلوبة." },
        { status: 404 },
      );
    }

    const result = await getOrCreateInvoiceForPaymentTransaction(
      transactionId,
      current.user.id,
    );
    const payloadTransaction = result.payload.transaction;

    return NextResponse.json({
      ok: true,
      invoice: result.payload.invoice,
      transaction: {
        id: payloadTransaction.id,
        amount: payloadTransaction.amount,
        currency: payloadTransaction.currency,
        method: payloadTransaction.method,
        status: payloadTransaction.status,
        externalRef: payloadTransaction.externalRef,
        createdAt: payloadTransaction.createdAt,
        updatedAt: payloadTransaction.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof AdminInvoiceError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    console.error("USER_PAYMENT_INVOICE_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "تعذر تحميل الفاتورة حاليًا." },
      { status: 500 },
    );
  }
}
