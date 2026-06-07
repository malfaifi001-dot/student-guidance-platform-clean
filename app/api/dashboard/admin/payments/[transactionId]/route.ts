import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

function getRequesterUserIdFromMetadata(metadataJson: unknown) {
  if (!metadataJson || typeof metadataJson !== "object") {
    return null;
  }

  const metadata = metadataJson as Record<string, unknown>;
  return typeof metadata.requesterUserId === "string" ? metadata.requesterUserId : null;
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
            createdAt: true,
            updatedAt: true,
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
                createdAt: true,
                profile: {
                  select: {
                    schoolName: true,
                    principalName: true,
                    educationOffice: true,
                    city: true,
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

    const requesterUserId = getRequesterUserIdFromMetadata(transaction.metadataJson);

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

    return NextResponse.json({
      generatedAt: new Date(),
      transaction: {
        ...transaction,
        requesterUser,
      },
      linkedBankTransfer,
    });
  } catch (error) {
    console.error("ADMIN_PAYMENT_DETAIL_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء تحميل تفاصيل عملية الدفع.",
      },
      {
        status: 500,
      }
    );
  }
}