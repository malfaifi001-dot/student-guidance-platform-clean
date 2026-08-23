import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AdminInvoiceError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AdminInvoiceError";
    this.status = status;
  }
}

type InvoiceSettingsInput = {
  sellerName?: string;
  sellerDomain?: string;
  sellerCountry?: string;
  sellerAddress?: string;
  commercialRegistration?: string;
  taxNumber?: string;
  vatEnabled?: boolean;
  vatRate?: number;
  invoicePrefix?: string;
  invoiceNote?: string;
};

const DEFAULT_COMMERCIAL_REGISTRATION = "7054948356";

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isUniqueInvoiceCreationRaceError(error: unknown) {
  const knownError = error as {
    code?: string;
    meta?: unknown;
    message?: string;
  };

  if (knownError.code !== "P2002") {
    return false;
  }

  const metaText = JSON.stringify(knownError.meta || {});
  const messageText = knownError.message || "";

  return (
    metaText.includes("paymentTransactionId") ||
    metaText.includes("Invoice_paymentTransactionId_key") ||
    messageText.includes("paymentTransactionId") ||
    messageText.includes("Invoice_paymentTransactionId_key")
  );
}

function getMetadata(metadataJson: unknown) {
  return metadataJson && typeof metadataJson === "object"
    ? (metadataJson as Record<string, unknown>)
    : null;
}

function getRequesterUserId(metadataJson: unknown) {
  const metadata = getMetadata(metadataJson);
  return typeof metadata?.requesterUserId === "string" ? metadata.requesterUserId : null;
}

function getSenderName(metadataJson: unknown) {
  const metadata = getMetadata(metadataJson);
  return typeof metadata?.senderName === "string" ? metadata.senderName : null;
}

function clampVatRate(value: unknown) {
  const rate = Number(value || 0);

  if (Number.isNaN(rate)) return 0;
  return Math.min(Math.max(Math.round(rate), 0), 100);
}

function normalizePrefix(value: unknown) {
  const prefix = String(value || "INV")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toUpperCase();

  return prefix || "INV";
}

function calculateTaxInclusiveAmounts(totalAmount: number, vatEnabled: boolean, vatRate: number) {
  if (!vatEnabled || vatRate <= 0) {
    return {
      subtotalAmount: totalAmount,
      taxAmount: 0,
      totalAmount,
    };
  }

  const taxAmount = Math.round((totalAmount * vatRate) / (100 + vatRate));
  const subtotalAmount = totalAmount - taxAmount;

  return {
    subtotalAmount,
    taxAmount,
    totalAmount,
  };
}

function buildInvoiceNumber(prefix: string, date: Date, sequenceNumber: number) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const sequence = String(sequenceNumber).padStart(6, "0");

  return `${prefix}-${year}${month}-${sequence}`;
}

export async function getInvoiceSettings() {
  return prisma.invoiceSettings.upsert({
    where: {
      singletonKey: "default",
    },
    update: {},
    create: {
      commercialRegistration: DEFAULT_COMMERCIAL_REGISTRATION,
    },
  });
}

export async function updateInvoiceSettings(input: InvoiceSettingsInput) {
  const existing = await getInvoiceSettings();

  return prisma.invoiceSettings.update({
    where: {
      id: existing.id,
    },
    data: {
      sellerName: String(input.sellerName || "منصة التوجيه الطلابي").trim(),
      sellerDomain: String(input.sellerDomain || "smstudents.com").trim() || null,
      sellerCountry:
        String(input.sellerCountry || "المملكة العربية السعودية").trim() || null,
      sellerAddress: String(input.sellerAddress || "").trim() || null,
      commercialRegistration:
        String(input.commercialRegistration || DEFAULT_COMMERCIAL_REGISTRATION).trim() ||
        DEFAULT_COMMERCIAL_REGISTRATION,
      taxNumber: String(input.taxNumber || "").trim() || null,
      vatEnabled: Boolean(input.vatEnabled),
      vatRate: clampVatRate(input.vatRate),
      invoicePrefix: normalizePrefix(input.invoicePrefix),
      invoiceNote:
        String(input.invoiceNote || "").trim() ||
        "تم إصدار هذه الفاتورة آليًا من مركز المدفوعات في منصة التوجيه الطلابي.",
    },
  });
}

async function getLinkedBankTransfer(transactionExternalRef: string | null) {
  if (!transactionExternalRef?.startsWith("bank-transfer:")) {
    return null;
  }

  const bankTransferRequestId = transactionExternalRef.replace("bank-transfer:", "");

  return prisma.bankTransferRequest.findUnique({
    where: {
      id: bankTransferRequestId,
    },
  });
}

async function findInvoiceWithTransaction(paymentTransactionId: string) {
  return prisma.invoice.findUnique({
    where: {
      paymentTransactionId,
    },
    include: {
      paymentTransaction: {
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
              startsAt: true,
              endsAt: true,
              plan: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              schoolAccount: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  profile: {
                    select: {
                      schoolName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

function buildInvoicePayload(
  invoice: NonNullable<Awaited<ReturnType<typeof findInvoiceWithTransaction>>>,
  linkedBankTransfer: Awaited<ReturnType<typeof getLinkedBankTransfer>>
) {
  const transaction = invoice.paymentTransaction;
  const snapshot =
    invoice.snapshotJson && typeof invoice.snapshotJson === "object"
      ? (invoice.snapshotJson as Record<string, unknown>)
      : null;

  return {
    generatedAt: new Date(),
    invoice: {
      id: invoice.id,
      status: invoice.status,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issuedAt,
      note:
        (snapshot && typeof snapshot.invoiceNote === "string"
          ? snapshot.invoiceNote
          : "") ||
        "تم إصدار هذه الفاتورة آليًا من مركز المدفوعات في منصة التوجيه الطلابي.",
      seller: {
        name: invoice.sellerName,
        domain: invoice.sellerDomain || "—",
        country: invoice.sellerCountry || "—",
        address: invoice.sellerAddress || "—",
        commercialRegistration:
          invoice.commercialRegistration || DEFAULT_COMMERCIAL_REGISTRATION,
        taxNumber: invoice.taxNumber || "—",
      },
      buyer: {
        counselorName: invoice.buyerName,
        counselorEmail: invoice.buyerEmail || "—",
        counselorJobTitle: invoice.buyerJobTitle || "—",
        schoolName: invoice.buyerSchoolName || "—",
        accountName: invoice.buyerAccountName || "—",
      },
      amounts: {
        subtotalAmount: invoice.subtotalAmount,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency,
      },
      item: {
        title: invoice.itemTitle,
        quantity: 1,
        unitPrice: invoice.totalAmount,
        total: invoice.totalAmount,
      },
    },
    transaction,
    linkedBankTransfer,
  };
}

export async function getOrCreateInvoiceForPaymentTransaction(
  paymentTransactionId: string,
  issuedById?: string | null
) {
  const existingInvoice = await findInvoiceWithTransaction(paymentTransactionId);

  if (existingInvoice) {
    const linkedBankTransfer = await getLinkedBankTransfer(
      existingInvoice.paymentTransaction.externalRef
    );

    return {
      wasCreated: false,
      payload: buildInvoicePayload(existingInvoice, linkedBankTransfer),
    };
  }

  const transaction = await prisma.paymentTransaction.findUnique({
    where: {
      id: paymentTransactionId,
    },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      subscription: {
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          plan: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          schoolAccount: {
            select: {
              id: true,
              name: true,
              slug: true,
              profile: {
                select: {
                  schoolName: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!transaction) {
    throw new AdminInvoiceError("لم يتم العثور على عملية الدفع المطلوبة.", 404);
  }

  if (transaction.status !== "PAID") {
    throw new AdminInvoiceError("لا يمكن إصدار فاتورة إلا لعملية دفع مكتملة.", 409);
  }

  const settings = await getInvoiceSettings();
  const requesterUserId = getRequesterUserId(transaction.metadataJson);

  const requesterUser = requesterUserId
    ? await prisma.user.findUnique({
        where: {
          id: requesterUserId,
        },
        select: {
          id: true,
          name: true,
          officialName: true,
          email: true,
          jobTitle: true,
        },
      })
    : null;

  const counselorName =
    requesterUser?.officialName ||
    requesterUser?.name ||
    getSenderName(transaction.metadataJson) ||
    "موجه غير محدد";

  const schoolName =
    transaction.subscription?.schoolAccount.profile?.schoolName ||
    transaction.subscription?.schoolAccount.name ||
    "—";

  const amounts = calculateTaxInclusiveAmounts(
    transaction.amount,
    settings.vatEnabled,
    settings.vatRate
  );

  const itemTitle = `اشتراك منصة التوجيه الطلابي - ${
    transaction.subscription?.plan.name || "باقة غير محددة"
  }`;

  try {
    await prisma.$transaction(async (tx) => {
      const alreadyCreatedInsideTransaction = await tx.invoice.findUnique({
        where: {
          paymentTransactionId: transaction.id,
        },
        select: {
          id: true,
        },
      });

      if (alreadyCreatedInsideTransaction) {
        return;
      }

      const issuedAt = new Date();
      const year = issuedAt.getFullYear();
      const month = issuedAt.getMonth() + 1;

      const sequence = await tx.invoiceNumberSequence.upsert({
        where: {
          year_month: {
            year,
            month,
          },
        },
        update: {
          nextNumber: {
            increment: 1,
          },
        },
        create: {
          year,
          month,
          nextNumber: 2,
        },
      });

      const sequenceNumber = sequence.nextNumber - 1;
      const invoiceNumber = buildInvoiceNumber(
        normalizePrefix(settings.invoicePrefix),
        issuedAt,
        sequenceNumber
      );

      await tx.invoice.create({
        data: {
          invoiceNumber,
          paymentTransactionId: transaction.id,
          issuedById: issuedById || null,
          status: "ISSUED",

          sellerName: settings.sellerName,
          sellerDomain: settings.sellerDomain,
          sellerCountry: settings.sellerCountry,
          sellerAddress: settings.sellerAddress,
          commercialRegistration:
            settings.commercialRegistration || DEFAULT_COMMERCIAL_REGISTRATION,
          taxNumber: settings.taxNumber,

          buyerName: counselorName,
          buyerEmail: requesterUser?.email || null,
          buyerJobTitle: requesterUser?.jobTitle || null,
          buyerSchoolName: schoolName,
          buyerAccountName: transaction.subscription?.schoolAccount.name || null,

          itemTitle,
          subtotalAmount: amounts.subtotalAmount,
          taxRate: settings.vatEnabled ? settings.vatRate : 0,
          taxAmount: amounts.taxAmount,
          totalAmount: amounts.totalAmount,
          currency: transaction.currency,

          snapshotJson: asJson({
            invoiceNote:
              settings.invoiceNote ||
              "تم إصدار هذه الفاتورة آليًا من مركز المدفوعات في منصة التوجيه الطلابي.",
            settings: {
              sellerName: settings.sellerName,
              sellerDomain: settings.sellerDomain,
              sellerCountry: settings.sellerCountry,
              sellerAddress: settings.sellerAddress,
              commercialRegistration:
                settings.commercialRegistration || DEFAULT_COMMERCIAL_REGISTRATION,
              taxNumber: settings.taxNumber,
              vatEnabled: settings.vatEnabled,
              vatRate: settings.vatRate,
            },
            transaction: {
              id: transaction.id,
              amount: transaction.amount,
              currency: transaction.currency,
              method: transaction.method,
              status: transaction.status,
              externalRef: transaction.externalRef,
            },
          }),
        },
      });
    });
  } catch (error) {
    if (!isUniqueInvoiceCreationRaceError(error)) {
      throw error;
    }
  }

  const createdInvoice = await findInvoiceWithTransaction(paymentTransactionId);

  if (!createdInvoice) {
    throw new AdminInvoiceError("تم إنشاء الفاتورة لكن تعذر تحميلها.", 500);
  }

  const linkedBankTransfer = await getLinkedBankTransfer(
    createdInvoice.paymentTransaction.externalRef
  );

  return {
    wasCreated: createdInvoice.createdAt.getTime() > Date.now() - 10_000,
    payload: buildInvoicePayload(createdInvoice, linkedBankTransfer),
  };
}
