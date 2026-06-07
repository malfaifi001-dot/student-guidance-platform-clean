import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus, Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

const statuses = new Set(["ALL", "PENDING", "PAID", "FAILED", "REFUNDED", "CANCELED"]);

function parseFilters(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = String(searchParams.get("query") || "").trim();
  const statusInput = String(searchParams.get("status") || "ALL").toUpperCase();
  const status = statuses.has(statusInput) ? statusInput : "ALL";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 300);

  const baseWhere: Prisma.PaymentTransactionWhereInput = {};

  if (query) {
    baseWhere.OR = [
      { id: { contains: query } },
      { externalRef: { contains: query } },
    ];
  }

  const where: Prisma.PaymentTransactionWhereInput = {
    ...baseWhere,
  };

  if (status !== "ALL") {
    where.status = status as PaymentStatus;
  }

  return {
    baseWhere,
    where,
    filters: {
      query,
      status,
      limit,
    },
    limit,
  };
}

export async function GET(request: NextRequest) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const { baseWhere, where, filters, limit } = parseFilters(request);

  const [
    transactions,
    totalCount,
    pendingCount,
    paidCount,
    failedCount,
    refundedCount,
    canceledCount,
    paidTotals,
    refundedTotals,
  ] = await prisma.$transaction([
    prisma.paymentTransaction.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmount: true,
            taxAmount: true,
            creditNotes: {
              select: {
                id: true,
                creditNoteNumber: true,
                status: true,
                totalAmount: true,
              },
              orderBy: {
                issuedAt: "desc",
              },
            },
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
              },
            },
          },
        },
      },
    }),
    prisma.paymentTransaction.count({
      where,
    }),
    prisma.paymentTransaction.count({
      where: {
        ...baseWhere,
        status: PaymentStatus.PENDING,
      },
    }),
    prisma.paymentTransaction.count({
      where: {
        ...baseWhere,
        status: PaymentStatus.PAID,
      },
    }),
    prisma.paymentTransaction.count({
      where: {
        ...baseWhere,
        status: PaymentStatus.FAILED,
      },
    }),
    prisma.paymentTransaction.count({
      where: {
        ...baseWhere,
        status: PaymentStatus.REFUNDED,
      },
    }),
    prisma.paymentTransaction.count({
      where: {
        ...baseWhere,
        status: PaymentStatus.CANCELED,
      },
    }),
    prisma.paymentTransaction.aggregate({
      where: {
        ...baseWhere,
        status: PaymentStatus.PAID,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.paymentTransaction.aggregate({
      where: {
        ...baseWhere,
        status: PaymentStatus.REFUNDED,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return NextResponse.json({
    filters,
    transactions,
    metrics: {
      totalCount,
      pendingCount,
      paidCount,
      failedCount,
      refundedCount,
      canceledCount,
      paidAmount: paidTotals._sum.amount || 0,
      refundedAmount: refundedTotals._sum.amount || 0,
      netAmount: (paidTotals._sum.amount || 0) - (refundedTotals._sum.amount || 0),
      currency: "SAR",
    },
  });
}