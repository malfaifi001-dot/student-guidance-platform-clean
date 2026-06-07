import ExcelJS from "exceljs";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { prisma } from "@/lib/prisma";
import {
  buildAdminPaymentsWhere,
  getAdminPaymentsCenterData,
  type AdminPaymentsFilters,
} from "@/lib/admin/payments";

export const runtime = "nodejs";

function parsePaymentStatus(value: string | null): PaymentStatus | "ALL" {
  if (!value || value === "ALL") return "ALL";

  if (Object.values(PaymentStatus).includes(value as PaymentStatus)) {
    return value as PaymentStatus;
  }

  return "ALL";
}

function parsePaymentMethod(value: string | null): PaymentMethod | "ALL" {
  if (!value || value === "ALL") return "ALL";

  if (Object.values(PaymentMethod).includes(value as PaymentMethod)) {
    return value as PaymentMethod;
  }

  return "ALL";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "معلقة",
    PAID: "مكتملة",
    FAILED: "فاشلة",
    REFUNDED: "مستردة",
    CANCELED: "ملغاة",
  };

  return labels[status] || status;
}

function getMethodLabel(method: string | null | undefined) {
  const labels: Record<string, string> = {
    CARD: "بطاقة",
    BANK_TRANSFER: "تحويل بنكي",
    MANUAL: "يدوي",
  };

  if (!method) return "غير محدد";
  return labels[method] || method;
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

function applyHeaderStyle(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 12,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  });
}

function applyBodyStyle(worksheet: ExcelJS.Worksheet) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.height = 24;

    row.eachCell((cell) => {
      cell.alignment = {
        horizontal: "right",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFF1F5F9" } },
        left: { style: "thin", color: { argb: "FFF1F5F9" } },
        bottom: { style: "thin", color: { argb: "FFF1F5F9" } },
        right: { style: "thin", color: { argb: "FFF1F5F9" } },
      };
    });
  });
}

function safeText(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

export async function GET(request: NextRequest) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const searchParams = request.nextUrl.searchParams;

  const filters: AdminPaymentsFilters = {
    query: searchParams.get("query") || "",
    status: parsePaymentStatus(searchParams.get("status")),
    method: parsePaymentMethod(searchParams.get("method")),
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    take: 1,
  };

  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") || 5000), 1),
    5000
  );

  await getAdminPaymentsCenterData(filters);

  const transactions = await prisma.paymentTransaction.findMany({
    where: buildAdminPaymentsWhere(filters),
    orderBy: { createdAt: "desc" },
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

  const requesterUserIds = Array.from(
    new Set(
      transactions
        .map((transaction) => getRequesterUserId(transaction.metadataJson))
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
        },
      })
    : [];

  const requesterUserById = new Map(requesterUsers.map((user) => [user.id, user]));

  const rows = transactions.map((transaction) => {
    const requesterUserId = getRequesterUserId(transaction.metadataJson);
    const requesterUser = requesterUserId
      ? requesterUserById.get(requesterUserId) || null
      : null;

    const counselorName =
      requesterUser?.officialName ||
      requesterUser?.name ||
      getSenderName(transaction.metadataJson) ||
      "موجه غير محدد";

    const counselorEmail = requesterUser?.email || "—";
    const counselorJobTitle = requesterUser?.jobTitle || "—";

    const schoolName =
      transaction.subscription?.schoolAccount.profile?.schoolName ||
      transaction.subscription?.schoolAccount.name ||
      "—";

    return {
      transactionId: transaction.id,
      createdAt: formatDate(transaction.createdAt),
      counselorName,
      counselorEmail,
      counselorJobTitle,
      schoolName,
      planName: transaction.subscription?.plan.name || "—",
      amount: transaction.amount,
      currency: transaction.currency,
      methodLabel: getMethodLabel(transaction.method),
      statusLabel: getStatusLabel(transaction.status),
      providerName: transaction.provider?.name || "—",
      externalRef: transaction.externalRef || "—",
      subscriptionId: transaction.subscription?.id || "—",
      subscriptionStatus: transaction.subscription?.status || "—",
      subscriptionStartsAt: formatDate(transaction.subscription?.startsAt),
      subscriptionEndsAt: formatDate(transaction.subscription?.endsAt),
    };
  });

  const paidTotal = rows
    .filter((row) => row.statusLabel === "مكتملة")
    .reduce((sum, row) => sum + row.amount, 0);

  const pendingTotal = rows
    .filter((row) => row.statusLabel === "معلقة")
    .reduce((sum, row) => sum + row.amount, 0);

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "منصة التوجيه الطلابي";
  workbook.lastModifiedBy = "منصة التوجيه الطلابي";
  workbook.created = new Date();
  workbook.modified = new Date();

  const summarySheet = workbook.addWorksheet("ملخص التقرير", {
    views: [{ rightToLeft: true }],
  });

  summarySheet.columns = [
    { width: 28 },
    { width: 42 },
    { width: 28 },
    { width: 42 },
  ];

  summarySheet.mergeCells("A1:D1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "تقرير المدفوعات";
  titleCell.font = {
    bold: true,
    size: 18,
    color: { argb: "FF0F172A" },
  };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  summarySheet.getRow(1).height = 34;

  summarySheet.addRow([]);
  summarySheet.addRow(["تاريخ التصدير", formatDate(new Date()), "عدد العمليات", rows.length]);
  summarySheet.addRow(["إجمالي المدفوعات المكتملة", paidTotal, "إجمالي العمليات المعلقة", pendingTotal]);
  summarySheet.addRow(["فلتر البحث", filters.query || "كل العمليات", "فلتر الحالة", filters.status || "ALL"]);
  summarySheet.addRow(["طريقة الدفع", filters.method || "ALL", "من تاريخ", filters.from || "—"]);
  summarySheet.addRow(["إلى تاريخ", filters.to || "—", "حد التصدير", limit]);

  summarySheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.height = 24;
    row.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: "right",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (colNumber === 1 || colNumber === 3) {
        cell.font = { bold: true, color: { argb: "FF334155" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  summarySheet.getCell("B4").numFmt = '#,##0 "ر.س"';
  summarySheet.getCell("D4").numFmt = '#,##0 "ر.س"';

  const paymentsSheet = workbook.addWorksheet("عمليات الدفع", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  paymentsSheet.columns = [
    { header: "رقم العملية", key: "transactionId", width: 36 },
    { header: "التاريخ", key: "createdAt", width: 24 },
    { header: "الموجه/الموجهة", key: "counselorName", width: 26 },
    { header: "البريد", key: "counselorEmail", width: 34 },
    { header: "المسمى الوظيفي", key: "counselorJobTitle", width: 22 },
    { header: "الحساب/المدرسة", key: "schoolName", width: 30 },
    { header: "الباقة", key: "planName", width: 24 },
    { header: "المبلغ", key: "amount", width: 16 },
    { header: "العملة", key: "currency", width: 12 },
    { header: "طريقة الدفع", key: "methodLabel", width: 18 },
    { header: "الحالة", key: "statusLabel", width: 16 },
    { header: "المزود", key: "providerName", width: 20 },
    { header: "المرجع الخارجي", key: "externalRef", width: 34 },
    { header: "رقم الاشتراك", key: "subscriptionId", width: 34 },
    { header: "حالة الاشتراك", key: "subscriptionStatus", width: 18 },
    { header: "بداية الاشتراك", key: "subscriptionStartsAt", width: 24 },
    { header: "نهاية الاشتراك", key: "subscriptionEndsAt", width: 24 },
  ];

  paymentsSheet.addRows(
    rows.map((row) => ({
      transactionId: safeText(row.transactionId),
      createdAt: safeText(row.createdAt),
      counselorName: safeText(row.counselorName),
      counselorEmail: safeText(row.counselorEmail),
      counselorJobTitle: safeText(row.counselorJobTitle),
      schoolName: safeText(row.schoolName),
      planName: safeText(row.planName),
      amount: row.amount,
      currency: safeText(row.currency),
      methodLabel: safeText(row.methodLabel),
      statusLabel: safeText(row.statusLabel),
      providerName: safeText(row.providerName),
      externalRef: safeText(row.externalRef),
      subscriptionId: safeText(row.subscriptionId),
      subscriptionStatus: safeText(row.subscriptionStatus),
      subscriptionStartsAt: safeText(row.subscriptionStartsAt),
      subscriptionEndsAt: safeText(row.subscriptionEndsAt),
    }))
  );

  applyHeaderStyle(paymentsSheet.getRow(1));
  applyBodyStyle(paymentsSheet);

  paymentsSheet.getColumn("amount").numFmt = "#,##0.00";
  paymentsSheet.autoFilter = {
    from: "A1",
    to: "Q1",
  };

  paymentsSheet.getColumn("transactionId").alignment = {
    horizontal: "left",
    vertical: "middle",
  };
  paymentsSheet.getColumn("externalRef").alignment = {
    horizontal: "left",
    vertical: "middle",
  };
  paymentsSheet.getColumn("subscriptionId").alignment = {
    horizontal: "left",
    vertical: "middle",
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `payments-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}