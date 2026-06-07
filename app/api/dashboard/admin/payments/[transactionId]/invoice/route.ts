import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

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

function buildInvoiceNumber(transactionId: string, createdAt: Date) {
  const year = createdAt.getFullYear();
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");

  return `INV-${year}${month}-${transactionId.slice(0, 8).toUpperCase()}`;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  try {
    const { transactionId } = await context.params;

    const transaction = await prisma.paymentTransaction.findUnique({
      where: {
        id: transactionId,
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
      return NextResponse.json(
        {
          error: "لم يتم العثور على عملية الدفع المطلوبة.",
        },
        {
          status: 404,
        }
      );
    }

    if (transaction.status !== "PAID") {
      return NextResponse.json(
        {
          error: "لا يمكن إصدار فاتورة إلا لعملية دفع مكتملة.",
        },
        {
          status: 409,
        }
      );
    }

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
            gender: true,
          },
        })
      : null;

    let linkedBankTransfer = null;

    if (
      transaction.method === "BANK_TRANSFER" &&
      transaction.externalRef?.startsWith("bank-transfer:")
    ) {
      const bankTransferRequestId = transaction.externalRef.replace("bank-transfer:", "");

      linkedBankTransfer = await prisma.bankTransferRequest.findUnique({
        where: {
          id: bankTransferRequestId,
        },
      });
    }

    const counselorName =
      requesterUser?.officialName ||
      requesterUser?.name ||
      getSenderName(transaction.metadataJson) ||
      "موجه غير محدد";

    const schoolName =
      transaction.subscription?.schoolAccount.profile?.schoolName ||
      transaction.subscription?.schoolAccount.name ||
      "—";

    return NextResponse.json({
      generatedAt: new Date(),
      invoice: {
        invoiceNumber: buildInvoiceNumber(transaction.id, transaction.createdAt),
        issueDate: transaction.createdAt,
        note: "فاتورة/إيصال دفع إداري. الفاتورة الضريبية النهائية تتطلب إضافة إعدادات السجل والرقم الضريبي لاحقًا.",
        seller: {
          name: "منصة التوجيه الطلابي",
          domain: "smstudents.com",
          country: "المملكة العربية السعودية",
        },
        buyer: {
          counselorName,
          counselorEmail: requesterUser?.email || "—",
          counselorJobTitle: requesterUser?.jobTitle || "—",
          schoolName,
          accountName: transaction.subscription?.schoolAccount.name || "—",
        },
        amounts: {
          subtotalAmount: transaction.amount,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: transaction.amount,
          currency: transaction.currency,
        },
        item: {
          title: `اشتراك منصة التوجيه الطلابي - ${transaction.subscription?.plan.name || "باقة غير محددة"}`,
          quantity: 1,
          unitPrice: transaction.amount,
          total: transaction.amount,
        },
      },
      transaction: {
        ...transaction,
        requesterUser,
      },
      linkedBankTransfer,
    });
  } catch (error) {
    console.error("ADMIN_PAYMENT_INVOICE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء إصدار الفاتورة.",
      },
      {
        status: 500,
      }
    );
  }
}