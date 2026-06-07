import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/admin/activity-log";

type CreatePaidBankTransferPaymentTransactionOptions = {
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  logActivity?: boolean;
  source?: string;
};

type CreatePaidBankTransferPaymentTransactionResult = {
  wasCreated: boolean;
  skippedReason: string | null;
  transaction: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    status: string;
    externalRef: string | null;
  } | null;
};

function isUniquePaymentTransactionRaceError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildBankTransferExternalRef(bankTransferRequestId: string) {
  return `bank-transfer:${bankTransferRequestId}`;
}

/**
 * ينشئ PaymentTransaction مكتملة من طلب تحويل بنكي مدفوع.
 *
 * الهدف:
 * - يكون إنشاء العملية المالية في Service واحد.
 * - يكون idempotent قدر الإمكان.
 * - يمكن استدعاؤه من API قبول التحويل البنكي.
 * - يبقى صالحًا كـ fallback من صفحة المدفوعات مؤقتًا.
 */
export async function createPaidBankTransferPaymentTransaction(
  bankTransferRequestId: string,
  options: CreatePaidBankTransferPaymentTransactionOptions = {}
): Promise<CreatePaidBankTransferPaymentTransactionResult> {
  const request = await prisma.bankTransferRequest.findUnique({
    where: {
      id: bankTransferRequestId,
    },
    select: {
      id: true,
      schoolAccountId: true,
      planId: true,
      requesterUserId: true,
      amount: true,
      currency: true,
      status: true,
      senderName: true,
      receiptUrl: true,
      adminNote: true,
      billingCycle: true,
      durationDays: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!request) {
    return {
      wasCreated: false,
      skippedReason: "BANK_TRANSFER_REQUEST_NOT_FOUND",
      transaction: null,
    };
  }

  if (request.status !== "PAID") {
    return {
      wasCreated: false,
      skippedReason: "BANK_TRANSFER_REQUEST_NOT_PAID",
      transaction: null,
    };
  }

  if (!request.amount || request.amount <= 0) {
    return {
      wasCreated: false,
      skippedReason: "BANK_TRANSFER_AMOUNT_NOT_VALID",
      transaction: null,
    };
  }

  const externalRef = buildBankTransferExternalRef(request.id);

  const existingTransaction = await prisma.paymentTransaction.findFirst({
    where: {
      method: "BANK_TRANSFER",
      externalRef,
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      externalRef: true,
    },
  });

  if (existingTransaction) {
    return {
      wasCreated: false,
      skippedReason: null,
      transaction: existingTransaction,
    };
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      schoolAccountId: request.schoolAccountId,
    },
    orderBy: {
      startsAt: "desc",
    },
    select: {
      id: true,
      planId: true,
      status: true,
      startsAt: true,
      endsAt: true,
    },
  });

  try {
    const transaction = await prisma.paymentTransaction.create({
      data: {
        subscriptionId: subscription?.id || null,
        amount: request.amount,
        currency: request.currency || "SAR",
        method: "BANK_TRANSFER",
        status: "PAID",
        externalRef,
        metadataJson: toInputJson({
          source: options.source || "BANK_TRANSFER_APPROVAL",
          bankTransferRequestId: request.id,
          schoolAccountId: request.schoolAccountId,
          requestPlanId: request.planId,
          activeSubscriptionId: subscription?.id || null,
          activeSubscriptionPlanId: subscription?.planId || null,
          activeSubscriptionStatus: subscription?.status || null,
          senderName: request.senderName,
          receiptUrl: request.receiptUrl,
          adminNote: request.adminNote,
          billingCycle: request.billingCycle,
          durationDays: request.durationDays,
          requesterUserId: request.requesterUserId,
          originalCreatedAt: request.createdAt.toISOString(),
          syncedAt: new Date().toISOString(),
        }),
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        externalRef: true,
      },
    });

    if (options.logActivity !== false) {
      await logAdminActivity({
        actorUserId: options.actorUserId || null,
        category: "PAYMENT",
        action: "PAYMENT_TRANSACTION_CREATED_FROM_BANK_TRANSFER",
        severity: "SUCCESS",
        title: "إنشاء عملية دفع من تحويل بنكي",
        details: {
          paymentTransactionId: transaction.id,
          bankTransferRequestId: request.id,
          schoolAccountId: request.schoolAccountId,
          planId: request.planId,
          amount: request.amount,
          currency: request.currency || "SAR",
          externalRef,
          source: options.source || "BANK_TRANSFER_APPROVAL",
        },
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      });
    }

    return {
      wasCreated: true,
      skippedReason: null,
      transaction,
    };
  } catch (error) {
    if (!isUniquePaymentTransactionRaceError(error)) {
      throw error;
    }

    const transaction = await prisma.paymentTransaction.findFirst({
      where: {
        method: "BANK_TRANSFER",
        externalRef,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        externalRef: true,
      },
    });

    return {
      wasCreated: false,
      skippedReason: null,
      transaction,
    };
  }
}