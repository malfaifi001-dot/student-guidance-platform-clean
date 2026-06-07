import { PaymentStatus, Prisma } from "@prisma/client";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { getOrCreateInvoiceForPaymentTransaction } from "@/lib/admin/invoices";
import { prisma } from "@/lib/prisma";

export class AdminPaymentOperationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminPaymentOperationError";
    this.status = status;
  }
}

type OperationInput = {
  transactionId: string;
  actorUserId: string;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function mergeMetadata(metadataJson: unknown, patch: Record<string, unknown>) {
  return asJson({
    ...getObject(metadataJson),
    ...patch,
  });
}

function buildCreditNoteNumber(invoiceNumber: string) {
  return `CN-${invoiceNumber}`;
}

export async function cancelPaymentTransaction(input: OperationInput) {
  const reason = String(input.reason || "").trim();

  const transaction = await prisma.paymentTransaction.findUnique({
    where: {
      id: input.transactionId,
    },
    include: {
      invoice: true,
    },
  });

  if (!transaction) {
    throw new AdminPaymentOperationError("عملية الدفع غير موجودة.", 404);
  }

  if (transaction.status === PaymentStatus.PAID) {
    throw new AdminPaymentOperationError(
      "لا يمكن إلغاء عملية مدفوعة. استخدم الاسترداد بدلًا من الإلغاء.",
      409
    );
  }

  if (transaction.status === PaymentStatus.REFUNDED) {
    throw new AdminPaymentOperationError("لا يمكن إلغاء عملية مستردة مسبقًا.", 409);
  }

  if (transaction.status === PaymentStatus.CANCELED) {
    return {
      transaction,
      wasChanged: false,
      message: "عملية الدفع ملغاة مسبقًا.",
    };
  }

  const updatedTransaction = await prisma.paymentTransaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      status: PaymentStatus.CANCELED,
      metadataJson: mergeMetadata(transaction.metadataJson, {
        canceledAt: new Date().toISOString(),
        canceledById: input.actorUserId,
        cancelReason: reason || null,
        cancelSource: "ADMIN_RECONCILIATION",
      }),
    },
    include: {
      invoice: true,
      provider: true,
      subscription: {
        include: {
          plan: true,
          schoolAccount: true,
        },
      },
    },
  });

  await logAdminActivity({
    actorUserId: input.actorUserId,
    schoolAccountId:
      typeof getObject(transaction.metadataJson).schoolAccountId === "string"
        ? String(getObject(transaction.metadataJson).schoolAccountId)
        : null,
    category: "PAYMENT",
    action: "PAYMENT_TRANSACTION_CANCELED",
    severity: "WARNING",
    title: "إلغاء عملية دفع",
    details: {
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      previousStatus: transaction.status,
      nextStatus: updatedTransaction.status,
      reason: reason || null,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    transaction: updatedTransaction,
    wasChanged: true,
    message: "تم إلغاء عملية الدفع بنجاح.",
  };
}

export async function refundPaymentTransaction(input: OperationInput) {
  const reason = String(input.reason || "").trim();

  const transaction = await prisma.paymentTransaction.findUnique({
    where: {
      id: input.transactionId,
    },
    include: {
      invoice: true,
    },
  });

  if (!transaction) {
    throw new AdminPaymentOperationError("عملية الدفع غير موجودة.", 404);
  }

  if (transaction.status === PaymentStatus.REFUNDED) {
    return {
      transaction,
      creditNote: transaction.invoice
        ? await prisma.creditNote.findUnique({
            where: {
              creditNoteNumber: buildCreditNoteNumber(transaction.invoice.invoiceNumber),
            },
          })
        : null,
      wasChanged: false,
      message: "عملية الدفع مستردة مسبقًا.",
    };
  }

  if (transaction.status !== PaymentStatus.PAID) {
    throw new AdminPaymentOperationError(
      "لا يمكن استرداد إلا عملية دفع مدفوعة.",
      409
    );
  }

  const metadata = getObject(transaction.metadataJson);
  const creditNoteNumber = transaction.invoice
    ? buildCreditNoteNumber(transaction.invoice.invoiceNumber)
    : null;

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransaction = await tx.paymentTransaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: PaymentStatus.REFUNDED,
        metadataJson: asJson({
          ...metadata,
          refundedAt: new Date().toISOString(),
          refundedById: input.actorUserId,
          refundReason: reason || null,
          refundSource: "ADMIN_RECONCILIATION",
        }),
      },
      include: {
        invoice: true,
        provider: true,
        subscription: {
          include: {
            plan: true,
            schoolAccount: true,
          },
        },
      },
    });

    let creditNote = null;

    if (transaction.invoice && creditNoteNumber) {
      const invoiceSnapshot = getObject(transaction.invoice.snapshotJson);

      await tx.invoice.update({
        where: {
          id: transaction.invoice.id,
        },
        data: {
          status: "CANCELED",
          snapshotJson: asJson({
            ...invoiceSnapshot,
            canceledAt: new Date().toISOString(),
            canceledById: input.actorUserId,
            cancelReason: reason || "استرداد عملية الدفع",
            cancelSource: "PAYMENT_REFUND",
          }),
        },
      });

      creditNote = await tx.creditNote.upsert({
        where: {
          creditNoteNumber,
        },
        update: {},
        create: {
          creditNoteNumber,
          invoiceId: transaction.invoice.id,
          issuedById: input.actorUserId,
          status: "ISSUED",
          reason: reason || "استرداد عملية الدفع",
          subtotalAmount: transaction.invoice.subtotalAmount,
          taxRate: transaction.invoice.taxRate,
          taxAmount: transaction.invoice.taxAmount,
          totalAmount: transaction.invoice.totalAmount,
          currency: transaction.invoice.currency,
          snapshotJson: asJson({
            source: "PAYMENT_REFUND",
            sourceInvoiceId: transaction.invoice.id,
            sourceInvoiceNumber: transaction.invoice.invoiceNumber,
            paymentTransactionId: transaction.id,
            reason: reason || null,
            issuedById: input.actorUserId,
            issuedAt: new Date().toISOString(),
          }),
        },
      });
    }

    return {
      transaction: updatedTransaction,
      creditNote,
    };
  });

  await logAdminActivity({
    actorUserId: input.actorUserId,
    schoolAccountId:
      typeof metadata.schoolAccountId === "string" ? String(metadata.schoolAccountId) : null,
    category: "PAYMENT",
    action: "PAYMENT_TRANSACTION_REFUNDED",
    severity: "WARNING",
    title: "استرداد عملية دفع",
    details: {
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      previousStatus: transaction.status,
      nextStatus: result.transaction.status,
      invoiceId: transaction.invoice?.id || null,
      invoiceNumber: transaction.invoice?.invoiceNumber || null,
      creditNoteId: result.creditNote?.id || null,
      creditNoteNumber: result.creditNote?.creditNoteNumber || null,
      reason: reason || null,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    transaction: result.transaction,
    creditNote: result.creditNote,
    wasChanged: true,
    message: "تم استرداد عملية الدفع وتحديث الفاتورة بنجاح.",
  };
}

export async function reconcilePaymentTransaction(input: OperationInput) {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: {
      id: input.transactionId,
    },
    include: {
      invoice: true,
    },
  });

  if (!transaction) {
    throw new AdminPaymentOperationError("عملية الدفع غير موجودة.", 404);
  }

  if (transaction.status !== PaymentStatus.PAID) {
    throw new AdminPaymentOperationError(
      "التسوية التلقائية متاحة فقط للعمليات المدفوعة.",
      409
    );
  }

  let invoice = transaction.invoice;
  let invoiceWasCreated = false;

  if (!invoice) {
    const result = await getOrCreateInvoiceForPaymentTransaction(
      transaction.id,
      input.actorUserId
    );

    invoiceWasCreated = result.wasCreated;

    invoice = await prisma.invoice.findUnique({
      where: {
        paymentTransactionId: transaction.id,
      },
    });
  }

  const updatedTransaction = await prisma.paymentTransaction.update({
    where: {
      id: transaction.id,
    },
    data: {
      metadataJson: mergeMetadata(transaction.metadataJson, {
        reconciledAt: new Date().toISOString(),
        reconciledById: input.actorUserId,
        reconcileReason: input.reason || null,
        reconcileSource: "ADMIN_RECONCILIATION",
      }),
    },
    include: {
      invoice: true,
      provider: true,
      subscription: {
        include: {
          plan: true,
          schoolAccount: true,
        },
      },
    },
  });

  await logAdminActivity({
    actorUserId: input.actorUserId,
    schoolAccountId:
      typeof getObject(transaction.metadataJson).schoolAccountId === "string"
        ? String(getObject(transaction.metadataJson).schoolAccountId)
        : null,
    category: "PAYMENT",
    action: "PAYMENT_TRANSACTION_RECONCILED",
    severity: "SUCCESS",
    title: "تسوية عملية دفع",
    details: {
      transactionId: transaction.id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      invoiceId: invoice?.id || null,
      invoiceNumber: invoice?.invoiceNumber || null,
      invoiceWasCreated,
      reason: input.reason || null,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  return {
    transaction: updatedTransaction,
    invoice,
    invoiceWasCreated,
    message: invoiceWasCreated
      ? "تمت التسوية وإنشاء فاتورة للعملية."
      : "تمت تسوية العملية بنجاح.",
  };
}