import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createPaidBankTransferPaymentTransaction } from "@/lib/admin/bank-transfer-payments";

export type AdminPaymentsFilters = {
  query?: string;
  status?: PaymentStatus | "ALL";
  method?: PaymentMethod | "ALL";
  from?: string;
  to?: string;
  take?: number;
};

export function formatPaymentAmount(amount: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function buildDateFilter(filters: AdminPaymentsFilters) {
  const createdAt: Prisma.DateTimeFilter = {};

  if (filters.from) {
    const fromDate = new Date(filters.from);
    if (!Number.isNaN(fromDate.getTime())) {
      createdAt.gte = fromDate;
    }
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    if (!Number.isNaN(toDate.getTime())) {
      toDate.setHours(23, 59, 59, 999);
      createdAt.lte = toDate;
    }
  }

  return Object.keys(createdAt).length > 0 ? createdAt : undefined;
}

export function buildAdminPaymentsWhere(filters: AdminPaymentsFilters) {
  const where: Prisma.PaymentTransactionWhereInput = {};

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }

  if (filters.method && filters.method !== "ALL") {
    where.method = filters.method;
  }

  const dateFilter = buildDateFilter(filters);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  const query = filters.query?.trim();

  if (query) {
    where.OR = [
      { id: { contains: query } },
      { externalRef: { contains: query } },
      {
        provider: {
          is: {
            name: { contains: query },
          },
        },
      },
      {
        provider: {
          is: {
            slug: { contains: query },
          },
        },
      },
      {
        subscription: {
          is: {
            plan: {
              is: {
                name: { contains: query },
              },
            },
          },
        },
      },
      {
        subscription: {
          is: {
            schoolAccount: {
              is: {
                name: { contains: query },
              },
            },
          },
        },
      },
      {
        subscription: {
          is: {
            schoolAccount: {
              is: {
                slug: { contains: query },
              },
            },
          },
        },
      },
      {
        subscription: {
          is: {
            schoolAccount: {
              is: {
                profile: {
                  is: {
                    schoolName: { contains: query },
                  },
                },
              },
            },
          },
        },
      },
    ];
  }

  return where;
}

async function syncPaidBankTransfersIntoPaymentTransactions() {
  const paidBankTransfers = await prisma.bankTransferRequest.findMany({
    where: {
      status: "PAID",
      amount: {
        gt: 0,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1000,
    select: {
      id: true,
    },
  });

  for (const request of paidBankTransfers) {
    try {
      await createPaidBankTransferPaymentTransaction(request.id, {
        logActivity: false,
        source: "PAYMENTS_CENTER_FALLBACK_SYNC",
      });
    } catch (error) {
      console.error("BANK_TRANSFER_PAYMENT_TRANSACTION_FALLBACK_SYNC_ERROR", {
        bankTransferRequestId: request.id,
        error,
      });
    }
  }
}

export async function getAdminPaymentsCenterData(filters: AdminPaymentsFilters) {
  await syncPaidBankTransfersIntoPaymentTransactions();

  const where = buildAdminPaymentsWhere(filters);
  const take = Math.min(Math.max(filters.take || 50, 1), 100);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    transactions,
    paidAggregate,
    currentMonthPaidAggregate,
    statusGroups,
    methodGroups,
    pendingBankTransferCount,
    pendingBankTransferAggregate,
    pendingBankTransfers,
  ] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
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
    }),
    prisma.paymentTransaction.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: { _all: true },
      _avg: { amount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: {
        status: "PAID",
        createdAt: {
          gte: currentMonthStart,
        },
      },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.paymentTransaction.groupBy({
      by: ["method"],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.bankTransferRequest.count({
      where: { status: "PENDING" },
    }),
    prisma.bankTransferRequest.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.bankTransferRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 12,
    }),
  ]);

  const schoolAccountIds = Array.from(
    new Set(pendingBankTransfers.map((item) => item.schoolAccountId))
  );

  const planIds = Array.from(
    new Set(
      pendingBankTransfers
        .map((item) => item.planId)
        .filter((value): value is string => Boolean(value))
    )
  );

  const [schools, plans] = await Promise.all([
    schoolAccountIds.length
      ? prisma.schoolAccount.findMany({
          where: { id: { in: schoolAccountIds } },
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
        })
      : [],
    planIds.length
      ? prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        })
      : [],
  ]);

  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  const countForStatus = (status: PaymentStatus) =>
    statusGroups.find((item) => item.status === status)?._count._all || 0;

  const metrics = {
    totalRevenue: paidAggregate._sum.amount || 0,
    currentMonthRevenue: currentMonthPaidAggregate._sum.amount || 0,
    paidCount: paidAggregate._count._all || 0,
    pendingCount: countForStatus("PENDING"),
    failedCount: countForStatus("FAILED"),
    refundedCount: countForStatus("REFUNDED"),
    canceledCount: countForStatus("CANCELED"),
    pendingBankTransferCount,
    pendingBankTransferAmount: pendingBankTransferAggregate._sum.amount || 0,
    averagePaidTransactionAmount: Math.round(paidAggregate._avg.amount || 0),
    statusBreakdown: statusGroups.map((item) => ({
      status: item.status,
      count: item._count._all,
      amount: item._sum.amount || 0,
    })),
    methodBreakdown: methodGroups.map((item) => ({
      method: item.method,
      count: item._count._all,
      amount: item._sum.amount || 0,
    })),
  };

  const requesterUserIds = Array.from(
    new Set(
      transactions
        .map((transaction) => {
          const metadata =
            transaction.metadataJson && typeof transaction.metadataJson === "object"
              ? (transaction.metadataJson as Record<string, unknown>)
              : null;

          const requesterUserId = metadata?.requesterUserId;

          return typeof requesterUserId === "string" ? requesterUserId : null;
        })
        .filter((value): value is string => Boolean(value))
    )
  );

  const requesterUsers = requesterUserIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: requesterUserIds,
          },
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
    : [];

  const requesterUserById = new Map(requesterUsers.map((user) => [user.id, user]));

  const transactionsWithRequester = transactions.map((transaction) => {
    const metadata =
      transaction.metadataJson && typeof transaction.metadataJson === "object"
        ? (transaction.metadataJson as Record<string, unknown>)
        : null;

    const requesterUserId = metadata?.requesterUserId;

    return {
      ...transaction,
      requesterUser:
        typeof requesterUserId === "string"
          ? requesterUserById.get(requesterUserId) || null
          : null,
    };
  });

  return {
    generatedAt: new Date(),
    metrics,
    transactions: transactionsWithRequester,
    pendingBankTransfers: pendingBankTransfers.map((request) => ({
      ...request,
      schoolAccount: schoolById.get(request.schoolAccountId) || null,
      plan: request.planId ? planById.get(request.planId) || null : null,
    })),
  };
}