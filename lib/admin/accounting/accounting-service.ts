import "server-only";

import { randomUUID } from "node:crypto";
import {
  ExpensePaymentMethod,
  ExpenseRecurrenceInterval,
  OperationalExpenseStatus,
  Prisma,
} from "@prisma/client";

import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type {
  expenseFilterSchema,
  expenseInputSchema,
  markExpensePaidSchema,
  paymentSourceInputSchema,
} from "./accounting-schemas";

type ExpenseInput = z.infer<typeof expenseInputSchema>;
type ExpenseFilters = z.infer<typeof expenseFilterSchema>;
type PaidInput = z.infer<typeof markExpensePaidSchema>;
type PaymentSourceInput = z.infer<typeof paymentSourceInputSchema>;

export type AccountingActor = {
  id: string;
  name?: string | null;
};

export type AccountingRequestContext = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export class AccountingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AccountingError";
  }
}

const expenseInclude = {
  category: true,
  paymentSource: true,
  attachments: {
    where: { isArchived: false },
    orderBy: { createdAt: "desc" as const },
  },
  payments: {
    orderBy: { paidAt: "desc" as const },
    include: { paymentSource: true },
  },
  audits: {
    orderBy: { createdAt: "desc" as const },
    take: 30,
  },
} satisfies Prisma.OperationalExpenseInclude;

type ExpenseWithRelations = Prisma.OperationalExpenseGetPayload<{
  include: typeof expenseInclude;
}>;

function asDate(value: string | null | undefined) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}

function startOfDay(value = new Date()) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(23, 59, 59, 999);
  return result;
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  return result;
}

function addRecurrence(value: Date, interval: ExpenseRecurrenceInterval) {
  const result = new Date(value);
  const months =
    interval === "MONTHLY"
      ? 1
      : interval === "QUARTERLY"
        ? 3
        : interval === "SEMIANNUAL"
          ? 6
          : 12;
  result.setMonth(result.getMonth() + months);
  return result;
}

function nullable(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function clipped(value: string | null | undefined, max = 190) {
  const normalized = nullable(value);
  return normalized ? normalized.slice(0, max) : null;
}

function money(value: Prisma.Decimal | number | string) {
  return Number(value);
}

function effectiveStatus(expense: {
  status: OperationalExpenseStatus;
  dueDate: Date | null;
}) {
  if (
    expense.status === "DUE" &&
    expense.dueDate &&
    expense.dueDate < startOfDay()
  ) {
    return "OVERDUE" as const;
  }
  return expense.status;
}

function expenseSnapshot(expense: {
  title: string;
  vendor: string | null;
  categoryId: string;
  amountBeforeTax: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  currency: string;
  invoiceNumber: string | null;
  invoiceDate: Date | null;
  dueDate: Date | null;
  paidDate: Date | null;
  status: OperationalExpenseStatus;
  paymentMethod: ExpensePaymentMethod | null;
  paymentSourceId: string | null;
  isRecurring: boolean;
  recurrenceInterval: ExpenseRecurrenceInterval | null;
  nextRenewalDate: Date | null;
  notes: string | null;
}) {
  return {
    title: expense.title,
    vendor: expense.vendor,
    categoryId: expense.categoryId,
    amountBeforeTax: expense.amountBeforeTax.toString(),
    taxAmount: expense.taxAmount.toString(),
    totalAmount: expense.totalAmount.toString(),
    currency: expense.currency,
    invoiceNumber: expense.invoiceNumber,
    invoiceDate: expense.invoiceDate?.toISOString() || null,
    dueDate: expense.dueDate?.toISOString() || null,
    paidDate: expense.paidDate?.toISOString() || null,
    status: expense.status,
    paymentMethod: expense.paymentMethod,
    paymentSourceId: expense.paymentSourceId,
    isRecurring: expense.isRecurring,
    recurrenceInterval: expense.recurrenceInterval,
    nextRenewalDate: expense.nextRenewalDate?.toISOString() || null,
    notes: expense.notes,
  } satisfies Record<string, unknown>;
}

function json(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    expenseId: string;
    action: string;
    summary: string;
    actor: AccountingActor;
    request?: AccountingRequestContext;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  },
) {
  await tx.expenseAuditEntry.create({
    data: {
      expenseId: input.expenseId,
      action: input.action,
      summary: input.summary,
      actorUserId: input.actor.id,
      actorName: clipped(input.actor.name),
      ipAddress: clipped(input.request?.ipAddress),
      userAgent: clipped(input.request?.userAgent),
      beforeJson: input.before ? json(input.before) : undefined,
      afterJson: input.after ? json(input.after) : undefined,
    },
  });
}

async function logGlobal(
  input: {
    actor: AccountingActor;
    request?: AccountingRequestContext;
    action: string;
    title: string;
    expenseId?: string;
    details?: Record<string, unknown>;
  },
) {
  await logAdminActivity({
    actorUserId: input.actor.id,
    category: "ACCOUNTING",
    action: input.action,
    severity: "SUCCESS",
    title: input.title,
    details: { expenseId: input.expenseId, ...input.details },
    ipAddress: input.request?.ipAddress,
    userAgent: input.request?.userAgent,
  });
}

function serializeExpense(expense: ExpenseWithRelations) {
  return {
    ...expense,
    amountBeforeTax: money(expense.amountBeforeTax),
    taxAmount: money(expense.taxAmount),
    totalAmount: money(expense.totalAmount),
    effectiveStatus: effectiveStatus(expense),
    invoiceDate: expense.invoiceDate?.toISOString() || null,
    dueDate: expense.dueDate?.toISOString() || null,
    paidDate: expense.paidDate?.toISOString() || null,
    nextRenewalDate: expense.nextRenewalDate?.toISOString() || null,
    archivedAt: expense.archivedAt?.toISOString() || null,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    payments: expense.payments.map((payment) => ({
      ...payment,
      amountBeforeTax: money(payment.amountBeforeTax),
      taxAmount: money(payment.taxAmount),
      totalAmount: money(payment.totalAmount),
      paidAt: payment.paidAt.toISOString(),
      createdAt: payment.createdAt.toISOString(),
    })),
    attachments: expense.attachments.map((attachment) => ({
      ...attachment,
      archivedAt: attachment.archivedAt?.toISOString() || null,
      createdAt: attachment.createdAt.toISOString(),
    })),
    audits: expense.audits.map((audit) => ({
      ...audit,
      createdAt: audit.createdAt.toISOString(),
    })),
  };
}

function statusWhere(status: ExpenseFilters["status"]): Prisma.OperationalExpenseWhereInput {
  const today = startOfDay();
  if (status === "OVERDUE") {
    return {
      OR: [
        { status: "OVERDUE" },
        { status: "DUE", dueDate: { lt: today } },
      ],
    };
  }
  if (status === "DUE") {
    return {
      status: "DUE",
      OR: [{ dueDate: null }, { dueDate: { gte: today } }],
    };
  }
  return status === "ALL" ? {} : { status };
}

function expenseWhere(filters: ExpenseFilters): Prisma.OperationalExpenseWhereInput {
  const dateRange =
    filters.dateFrom || filters.dateTo
      ? {
          gte: filters.dateFrom ? startOfDay(asDate(filters.dateFrom)!) : undefined,
          lte: filters.dateTo ? endOfDay(asDate(filters.dateTo)!) : undefined,
        }
      : undefined;
  return {
    AND: [
      { archivedAt: null },
      statusWhere(filters.status),
      {
        categoryId: filters.categoryId || undefined,
        paymentSourceId: filters.paymentSourceId || undefined,
        vendor: filters.vendor ? { contains: filters.vendor } : undefined,
        isRecurring:
          filters.recurring === "YES"
            ? true
            : filters.recurring === "NO"
              ? false
              : undefined,
        dueDate: dateRange,
      },
      filters.search
        ? {
            OR: [
              { title: { contains: filters.search } },
              { vendor: { contains: filters.search } },
              { invoiceNumber: { contains: filters.search } },
            ],
          }
        : {},
    ],
  };
}

export async function getAccountingDashboardData(
  filters: ExpenseFilters = {
    search: "",
    status: "ALL",
    categoryId: "",
    paymentSourceId: "",
    vendor: "",
    recurring: "ALL",
    dateFrom: "",
    dateTo: "",
  },
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const today = startOfDay(now);
  const upcomingEnd = endOfDay(addDays(today, 30));
  const renewalEnd = endOfDay(addDays(today, 45));

  const [expenses, categories, paymentSources, payments, activeExpenses] =
    await Promise.all([
      prisma.operationalExpense.findMany({
        where: expenseWhere(filters),
        include: expenseInclude,
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 200,
      }),
      prisma.expenseCategory.findMany({
        where: { isActive: true },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      }),
      prisma.expensePaymentSource.findMany({
        where: { isActive: true },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      prisma.expensePaymentRecord.findMany({
        where: { paidAt: { gte: yearStart } },
        select: { totalAmount: true, paidAt: true },
      }),
      prisma.operationalExpense.findMany({
        where: { archivedAt: null, status: { not: "CANCELED" } },
        select: {
          id: true,
          status: true,
          dueDate: true,
          totalAmount: true,
          isRecurring: true,
          nextRenewalDate: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      }),
    ]);

  const monthExpense = payments
    .filter((payment) => payment.paidAt >= monthStart)
    .reduce((sum, payment) => sum + money(payment.totalAmount), 0);
  const yearExpense = payments.reduce(
    (sum, payment) => sum + money(payment.totalAmount),
    0,
  );
  const upcoming = activeExpenses.filter(
    (expense) =>
      expense.status === "DUE" &&
      expense.dueDate &&
      expense.dueDate >= today &&
      expense.dueDate <= upcomingEnd,
  );
  const overdue = activeExpenses.filter(
    (expense) => effectiveStatus(expense) === "OVERDUE",
  );
  const renewals = activeExpenses.filter(
    (expense) =>
      expense.isRecurring &&
      expense.nextRenewalDate &&
      expense.nextRenewalDate >= today &&
      expense.nextRenewalDate <= renewalEnd,
  );
  const categoryTotals = new Map<
    string,
    { categoryId: string; name: string; total: number; count: number }
  >();
  for (const expense of activeExpenses) {
    const current = categoryTotals.get(expense.categoryId) || {
      categoryId: expense.categoryId,
      name: expense.category.name,
      total: 0,
      count: 0,
    };
    current.total += money(expense.totalAmount);
    current.count += 1;
    categoryTotals.set(expense.categoryId, current);
  }

  return {
    expenses: expenses.map(serializeExpense),
    categories: categories.map((category) => ({
      ...category,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    })),
    paymentSources: paymentSources.map((source) => ({
      ...source,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    })),
    metrics: {
      monthExpense,
      yearExpense,
      upcomingCount: upcoming.length,
      upcomingTotal: upcoming.reduce(
        (sum, expense) => sum + money(expense.totalAmount),
        0,
      ),
      overdueCount: overdue.length,
      overdueTotal: overdue.reduce(
        (sum, expense) => sum + money(expense.totalAmount),
        0,
      ),
      paidCount: activeExpenses.filter((expense) => expense.status === "PAID")
        .length,
      renewalCount: renewals.length,
      renewalTotal: renewals.reduce(
        (sum, expense) => sum + money(expense.totalAmount),
        0,
      ),
    },
    categoryDistribution: [...categoryTotals.values()].sort(
      (first, second) => second.total - first.total,
    ),
    generatedAt: new Date().toISOString(),
  };
}

function inputData(input: ExpenseInput, actor: AccountingActor) {
  const amountBeforeTax = new Prisma.Decimal(input.amountBeforeTax);
  const taxAmount = new Prisma.Decimal(input.taxAmount);
  const dueDate = asDate(input.dueDate);
  let status: OperationalExpenseStatus = input.status;
  if (status === "DUE" && dueDate && dueDate < startOfDay()) status = "OVERDUE";
  return {
    title: input.title,
    vendor: nullable(input.vendor),
    categoryId: input.categoryId,
    amountBeforeTax,
    taxAmount,
    totalAmount: amountBeforeTax.plus(taxAmount),
    currency: input.currency,
    invoiceNumber: nullable(input.invoiceNumber),
    invoiceDate: asDate(input.invoiceDate),
    dueDate,
    status,
    isRecurring: input.isRecurring,
    recurrenceInterval: input.isRecurring ? input.recurrenceInterval : null,
    nextRenewalDate: input.isRecurring ? asDate(input.nextRenewalDate) : null,
    notes: nullable(input.notes),
    updatedById: actor.id,
    updatedByName: nullable(actor.name),
  };
}

export async function createExpense(
  input: ExpenseInput,
  actor: AccountingActor,
  request?: AccountingRequestContext,
) {
  const category = await prisma.expenseCategory.findFirst({
    where: { id: input.categoryId, isActive: true },
  });
  if (!category) throw new AccountingError("التصنيف المحدد غير متاح.");
  const data = inputData(input, actor);
  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.operationalExpense.create({
      data: {
        ...data,
        createdById: actor.id,
        createdByName: nullable(actor.name),
      },
    });
    await writeAudit(tx, {
      expenseId: created.id,
      action: "CREATED",
      summary: "إنشاء المصروف",
      actor,
      request,
      after: expenseSnapshot(created),
    });
    return created;
  });
  await logGlobal({
    actor,
    request,
    action: "EXPENSE_CREATED",
    title: "إنشاء مصروف تشغيلي",
    expenseId: expense.id,
    details: { title: expense.title, totalAmount: expense.totalAmount.toString() },
  });
  return expense;
}

async function activeExpense(expenseId: string) {
  const expense = await prisma.operationalExpense.findFirst({
    where: { id: expenseId, archivedAt: null },
  });
  if (!expense) throw new AccountingError("المصروف غير موجود.", 404);
  return expense;
}

export async function updateExpense(
  expenseId: string,
  input: ExpenseInput,
  actor: AccountingActor,
  request?: AccountingRequestContext,
) {
  const previous = await activeExpense(expenseId);
  const category = await prisma.expenseCategory.findFirst({
    where: { id: input.categoryId, isActive: true },
  });
  if (!category) throw new AccountingError("التصنيف المحدد غير متاح.");
  const data = inputData(input, actor);
  if (
    previous.status === "PAID" &&
    (!previous.amountBeforeTax.equals(data.amountBeforeTax) ||
      !previous.taxAmount.equals(data.taxAmount) ||
      previous.currency !== data.currency)
  ) {
    throw new AccountingError(
      "لا يمكن تغيير مبالغ مصروف مدفوع. ابدأ دورة جديدة للمصروف المتكرر أو أنشئ مصروفًا جديدًا.",
      409,
    );
  }
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.operationalExpense.update({
      where: { id: expenseId },
      data: {
        ...data,
        status: previous.status === "PAID" ? "PAID" : data.status,
      },
    });
    await writeAudit(tx, {
      expenseId,
      action: "UPDATED",
      summary: "تعديل بيانات المصروف",
      actor,
      request,
      before: expenseSnapshot(previous),
      after: expenseSnapshot(result),
    });
    return result;
  });
  await logGlobal({
    actor,
    request,
    action: "EXPENSE_UPDATED",
    title: "تحديث مصروف تشغيلي",
    expenseId,
  });
  return updated;
}

export async function markExpensePaid(
  expenseId: string,
  input: PaidInput,
  actor: AccountingActor,
  request?: AccountingRequestContext,
) {
  const [expense, source] = await Promise.all([
    activeExpense(expenseId),
    prisma.expensePaymentSource.findFirst({
      where: { id: input.paymentSourceId, isActive: true },
    }),
  ]);
  if (!source) throw new AccountingError("مصدر الدفع المحدد غير متاح.");
  if (expense.status === "CANCELED") {
    throw new AccountingError("لا يمكن دفع مصروف ملغي.", 409);
  }
  if (expense.status === "PAID") {
    throw new AccountingError("المصروف مسجل كمدفوع بالفعل.", 409);
  }
  const paidAt = asDate(input.paidDate)!;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.expensePaymentRecord.create({
      data: {
        expenseId,
        amountBeforeTax: expense.amountBeforeTax,
        taxAmount: expense.taxAmount,
        totalAmount: expense.totalAmount,
        currency: expense.currency,
        paymentMethod: input.paymentMethod,
        paymentSourceId: source.id,
        paymentSourceName: source.name,
        paymentSourceType: source.type,
        paymentSourceSnapshot: json({
          name: source.name,
          type: source.type,
          institutionName: source.institutionName,
          maskedIdentifier: source.maskedIdentifier,
        }),
        paidAt,
        reference: nullable(input.reference),
        recordedById: actor.id,
        recordedByName: nullable(actor.name),
      },
    });
    const result = await tx.operationalExpense.update({
      where: { id: expenseId },
      data: {
        status: "PAID",
        paidDate: paidAt,
        paymentMethod: input.paymentMethod,
        paymentSourceId: source.id,
        paidById: actor.id,
        paidByName: nullable(actor.name),
        updatedById: actor.id,
        updatedByName: nullable(actor.name),
      },
    });
    await writeAudit(tx, {
      expenseId,
      action: "MARKED_PAID",
      summary: `تسجيل السداد من ${source.name}`,
      actor,
      request,
      before: expenseSnapshot(expense),
      after: {
        ...expenseSnapshot(result),
        paymentSourceName: source.name,
        paymentSourceType: source.type,
        paymentReference: nullable(input.reference),
      },
    });
    return result;
  });
  await logGlobal({
    actor,
    request,
    action: "EXPENSE_MARKED_PAID",
    title: "تسجيل سداد مصروف",
    expenseId,
    details: {
      totalAmount: expense.totalAmount.toString(),
      paymentSourceId: source.id,
      paymentSourceName: source.name,
      paymentMethod: input.paymentMethod,
      paidDate: paidAt.toISOString(),
    },
  });
  return updated;
}

export async function activateNextExpenseCycle(
  expenseId: string,
  actor: AccountingActor,
  request?: AccountingRequestContext,
) {
  const expense = await activeExpense(expenseId);
  if (
    !expense.isRecurring ||
    !expense.recurrenceInterval ||
    !expense.nextRenewalDate
  ) {
    throw new AccountingError("بيانات التجديد الدوري غير مكتملة.", 409);
  }
  const dueDate = expense.nextRenewalDate;
  const nextRenewalDate = addRecurrence(dueDate, expense.recurrenceInterval);
  const status = dueDate < startOfDay() ? "OVERDUE" : "DUE";
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.operationalExpense.update({
      where: { id: expenseId },
      data: {
        dueDate,
        nextRenewalDate,
        status,
        paidDate: null,
        paymentMethod: null,
        paymentSourceId: null,
        paidById: null,
        paidByName: null,
        updatedById: actor.id,
        updatedByName: nullable(actor.name),
      },
    });
    await writeAudit(tx, {
      expenseId,
      action: "NEXT_CYCLE_ACTIVATED",
      summary: "بدء دورة الاستحقاق التالية",
      actor,
      request,
      before: expenseSnapshot(expense),
      after: expenseSnapshot(result),
    });
    return result;
  });
  await logGlobal({
    actor,
    request,
    action: "EXPENSE_NEXT_CYCLE_ACTIVATED",
    title: "بدء دورة مصروف متكرر",
    expenseId,
  });
  return updated;
}

export async function cancelExpense(
  expenseId: string,
  actor: AccountingActor,
  request?: AccountingRequestContext,
) {
  const expense = await activeExpense(expenseId);
  if (expense.status === "PAID") {
    throw new AccountingError("لا يمكن إلغاء مصروف مدفوع مع الاحتفاظ بالتاريخ المالي.", 409);
  }
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.operationalExpense.update({
      where: { id: expenseId },
      data: {
        status: "CANCELED",
        updatedById: actor.id,
        updatedByName: nullable(actor.name),
      },
    });
    await writeAudit(tx, {
      expenseId,
      action: "CANCELED",
      summary: "إلغاء المصروف مع إبقائه في السجل",
      actor,
      request,
      before: expenseSnapshot(expense),
      after: expenseSnapshot(result),
    });
    return result;
  });
  await logGlobal({
    actor,
    request,
    action: "EXPENSE_CANCELED",
    title: "إلغاء مصروف تشغيلي",
    expenseId,
  });
  return updated;
}

export async function createExpenseCategory(name: string, actor: AccountingActor) {
  const normalized = name.trim();
  const duplicate = await prisma.expenseCategory.findUnique({
    where: { name: normalized },
  });
  if (duplicate) throw new AccountingError("هذا التصنيف موجود بالفعل.", 409);
  const category = await prisma.expenseCategory.create({
    data: {
      name: normalized,
      slug: `custom-${randomUUID()}`,
      isSystem: false,
      createdById: actor.id,
    },
  });
  await logGlobal({
    actor,
    action: "EXPENSE_CATEGORY_CREATED",
    title: "إنشاء تصنيف مصروفات",
    details: { categoryId: category.id, name: category.name },
  });
  return category;
}

export async function createPaymentSource(
  input: PaymentSourceInput,
  actor: AccountingActor,
) {
  const source = await prisma.expensePaymentSource.create({
    data: {
      name: input.name,
      type: input.type,
      institutionName: nullable(input.institutionName),
      maskedIdentifier: nullable(input.maskedIdentifier),
      notes: nullable(input.notes),
      createdById: actor.id,
    },
  });
  await logGlobal({
    actor,
    action: "EXPENSE_PAYMENT_SOURCE_CREATED",
    title: "إنشاء مصدر دفع للمصروفات",
    details: { paymentSourceId: source.id, name: source.name, type: source.type },
  });
  return source;
}

export async function addExpenseAttachment(
  input: {
    expenseId: string;
    originalFileName: string;
    storedFileName: string;
    mimeType: string;
    sizeBytes: number;
    fileUrl: string;
  },
  actor: AccountingActor,
  request?: AccountingRequestContext,
) {
  await activeExpense(input.expenseId);
  const attachment = await prisma.$transaction(async (tx) => {
    const created = await tx.expenseAttachment.create({
      data: {
        ...input,
        createdById: actor.id,
        createdByName: nullable(actor.name),
      },
    });
    await writeAudit(tx, {
      expenseId: input.expenseId,
      action: "ATTACHMENT_ADDED",
      summary: `إضافة مرفق: ${input.originalFileName}`.slice(0, 190),
      actor,
      request,
      after: {
        attachmentId: created.id,
        fileName: created.originalFileName,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes,
      },
    });
    return created;
  });
  await logGlobal({
    actor,
    request,
    action: "EXPENSE_ATTACHMENT_ADDED",
    title: "إضافة مرفق مصروف",
    expenseId: input.expenseId,
    details: { attachmentId: attachment.id },
  });
  return attachment;
}

export async function archiveExpenseAttachment(
  expenseId: string,
  attachmentId: string,
  actor: AccountingActor,
  request?: AccountingRequestContext,
) {
  const attachment = await prisma.expenseAttachment.findFirst({
    where: { id: attachmentId, expenseId, isArchived: false },
  });
  if (!attachment) throw new AccountingError("المرفق غير موجود.", 404);
  await prisma.$transaction(async (tx) => {
    await tx.expenseAttachment.update({
      where: { id: attachment.id },
      data: { isArchived: true, archivedAt: new Date(), archivedById: actor.id },
    });
    await writeAudit(tx, {
      expenseId,
      action: "ATTACHMENT_ARCHIVED",
      summary: `أرشفة المرفق: ${attachment.originalFileName}`.slice(0, 190),
      actor,
      request,
      before: { attachmentId, fileName: attachment.originalFileName },
    });
  });
  await logGlobal({
    actor,
    request,
    action: "EXPENSE_ATTACHMENT_ARCHIVED",
    title: "أرشفة مرفق مصروف",
    expenseId,
    details: { attachmentId },
  });
}
