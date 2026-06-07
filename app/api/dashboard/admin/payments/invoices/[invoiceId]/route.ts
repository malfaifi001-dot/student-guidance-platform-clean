import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const { invoiceId } = await context.params;

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      creditNotes: {
        orderBy: {
          issuedAt: "desc",
        },
      },
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

  if (!invoice) {
    return NextResponse.json(
      {
        error: "الفاتورة غير موجودة.",
      },
      {
        status: 404,
      }
    );
  }

  return NextResponse.json({
    invoice,
  });
}