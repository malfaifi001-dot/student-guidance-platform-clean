import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";

function parseFilters(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = String(searchParams.get("query") || "").trim();
  const status = String(searchParams.get("status") || "ALL");
  const tax = String(searchParams.get("tax") || "ALL");
  const from = String(searchParams.get("from") || "").trim();
  const to = String(searchParams.get("to") || "").trim();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 500);

  const baseWhere: Prisma.InvoiceWhereInput = {};

  if (query) {
    baseWhere.OR = [
      { invoiceNumber: { contains: query } },
      { buyerName: { contains: query } },
      { buyerEmail: { contains: query } },
      { buyerSchoolName: { contains: query } },
      { buyerAccountName: { contains: query } },
      { paymentTransactionId: { contains: query } },
    ];
  }

  if (tax === "WITH_TAX") {
    baseWhere.taxAmount = {
      gt: 0,
    };
  }

  if (tax === "WITHOUT_TAX") {
    baseWhere.taxAmount = 0;
  }

  if (from || to) {
    const issuedAt: Prisma.DateTimeFilter = {};

    if (from) {
      issuedAt.gte = new Date(`${from}T00:00:00.000`);
    }

    if (to) {
      issuedAt.lte = new Date(`${to}T23:59:59.999`);
    }

    baseWhere.issuedAt = issuedAt;
  }

  const listWhere: Prisma.InvoiceWhereInput = {
    ...baseWhere,
  };

  if (status !== "ALL") {
    listWhere.status = status;
  }

  const activeWhere: Prisma.InvoiceWhereInput = {
    ...baseWhere,
    status: "ISSUED",
  };

  const canceledWhere: Prisma.InvoiceWhereInput = {
    ...baseWhere,
    status: "CANCELED",
  };

  return {
    baseWhere,
    listWhere,
    activeWhere,
    canceledWhere,
    limit,
    filters: {
      query,
      status,
      tax,
      from,
      to,
      limit,
    },
  };
}

export async function GET(request: NextRequest) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const { baseWhere, listWhere, activeWhere, canceledWhere, limit, filters } =
    parseFilters(request);

  const [
    invoices,
    visibleCount,
    totalMatchingCount,
    activeCount,
    canceledCount,
    activeTotals,
    canceledTotals,
  ] = await prisma.$transaction([
    prisma.invoice.findMany({
      where: listWhere,
      orderBy: {
        issuedAt: "desc",
      },
      take: limit,
      include: {
        paymentTransaction: {
          select: {
            id: true,
            amount: true,
            currency: true,
            method: true,
            status: true,
            externalRef: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.invoice.count({
      where: listWhere,
    }),
    prisma.invoice.count({
      where: baseWhere,
    }),
    prisma.invoice.count({
      where: activeWhere,
    }),
    prisma.invoice.count({
      where: canceledWhere,
    }),
    prisma.invoice.aggregate({
      where: activeWhere,
      _sum: {
        subtotalAmount: true,
        taxAmount: true,
        totalAmount: true,
      },
    }),
    prisma.invoice.aggregate({
      where: canceledWhere,
      _sum: {
        subtotalAmount: true,
        taxAmount: true,
        totalAmount: true,
      },
    }),
  ]);

  return NextResponse.json({
    filters,
    invoices,
    metrics: {
      visibleCount,
      totalMatchingCount,
      activeCount,
      canceledCount,

      activeSubtotalAmount: activeTotals._sum.subtotalAmount || 0,
      activeTaxAmount: activeTotals._sum.taxAmount || 0,
      activeTotalAmount: activeTotals._sum.totalAmount || 0,

      canceledSubtotalAmount: canceledTotals._sum.subtotalAmount || 0,
      canceledTaxAmount: canceledTotals._sum.taxAmount || 0,
      canceledTotalAmount: canceledTotals._sum.totalAmount || 0,

      currency: "SAR",
    },
  });
}