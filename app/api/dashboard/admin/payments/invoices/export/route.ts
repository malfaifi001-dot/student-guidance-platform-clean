import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseWhere(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query = String(searchParams.get("query") || "").trim();
  const status = String(searchParams.get("status") || "ALL");
  const tax = String(searchParams.get("tax") || "ALL");
  const from = String(searchParams.get("from") || "").trim();
  const to = String(searchParams.get("to") || "").trim();

  const where: Prisma.InvoiceWhereInput = {};

  if (query) {
    where.OR = [
      { invoiceNumber: { contains: query } },
      { buyerName: { contains: query } },
      { buyerEmail: { contains: query } },
      { buyerSchoolName: { contains: query } },
      { buyerAccountName: { contains: query } },
      { paymentTransactionId: { contains: query } },
    ];
  }

  if (status !== "ALL") {
    where.status = status;
  }

  if (tax === "WITH_TAX") {
    where.taxAmount = {
      gt: 0,
    };
  }

  if (tax === "WITHOUT_TAX") {
    where.taxAmount = 0;
  }

  if (from || to) {
    const issuedAt: Prisma.DateTimeFilter = {};

    if (from) {
      issuedAt.gte = new Date(`${from}T00:00:00.000`);
    }

    if (to) {
      issuedAt.lte = new Date(`${to}T23:59:59.999`);
    }

    where.issuedAt = issuedAt;
  }

  return {
    where,
    filterSummary: {
      query,
      status,
      tax,
      from,
      to,
    },
  };
}

export async function GET(request: NextRequest) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const device = await getRequestDeviceInfo();
  const { where, filterSummary } = parseWhere(request);

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: {
      issuedAt: "desc",
    },
    take: 5000,
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
  });

  const activeInvoices = invoices.filter((invoice) => invoice.status === "ISSUED");
  const canceledInvoices = invoices.filter((invoice) => invoice.status === "CANCELED");

  const activeTotalAmount = activeInvoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0
  );
  const activeTaxAmount = activeInvoices.reduce(
    (sum, invoice) => sum + invoice.taxAmount,
    0
  );
  const activeSubtotalAmount = activeInvoices.reduce(
    (sum, invoice) => sum + invoice.subtotalAmount,
    0
  );

  const canceledTotalAmount = canceledInvoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0
  );
  const canceledTaxAmount = canceledInvoices.reduce(
    (sum, invoice) => sum + invoice.taxAmount,
    0
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Teachix";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("ملخص الفواتير", {
    views: [{ rightToLeft: true }],
  });

  summarySheet.columns = [
    { header: "البند", key: "label", width: 34 },
    { header: "القيمة", key: "value", width: 38 },
  ];

  summarySheet.addRows([
    { label: "تاريخ التصدير", value: formatDate(new Date()) },
    { label: "عدد الفواتير في التصدير", value: invoices.length },
    { label: "عدد الفواتير السارية", value: activeInvoices.length },
    { label: "عدد الفواتير الملغاة", value: canceledInvoices.length },
    { label: "المجموع الساري قبل الضريبة", value: activeSubtotalAmount },
    { label: "ضريبة الفواتير السارية", value: activeTaxAmount },
    { label: "إجمالي الفواتير السارية", value: activeTotalAmount },
    { label: "إجمالي الفواتير الملغاة", value: canceledTotalAmount },
    { label: "ضريبة الفواتير الملغاة", value: canceledTaxAmount },
    { label: "فلتر البحث", value: filterSummary.query || "الكل" },
    { label: "فلتر الحالة", value: filterSummary.status },
    { label: "فلتر الضريبة", value: filterSummary.tax },
    { label: "من تاريخ", value: filterSummary.from || "غير محدد" },
    { label: "إلى تاريخ", value: filterSummary.to || "غير محدد" },
  ]);

  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).alignment = { horizontal: "center" };

  const sheet = workbook.addWorksheet("الفواتير", {
    views: [{ state: "frozen", ySplit: 1, rightToLeft: true }],
  });

  sheet.columns = [
    { header: "رقم الفاتورة", key: "invoiceNumber", width: 24 },
    { header: "تاريخ الإصدار", key: "issuedAt", width: 24 },
    { header: "الحالة", key: "status", width: 16 },
    { header: "الموجه/الموجهة", key: "buyerName", width: 28 },
    { header: "البريد", key: "buyerEmail", width: 28 },
    { header: "المدرسة/الحساب", key: "buyerSchoolName", width: 28 },
    { header: "الوصف", key: "itemTitle", width: 42 },
    { header: "قبل الضريبة", key: "subtotalAmount", width: 16 },
    { header: "نسبة الضريبة", key: "taxRate", width: 14 },
    { header: "مبلغ الضريبة", key: "taxAmount", width: 16 },
    { header: "الإجمالي", key: "totalAmount", width: 16 },
    { header: "العملة", key: "currency", width: 12 },
    { header: "رقم عملية الدفع", key: "paymentTransactionId", width: 32 },
    { header: "طريقة الدفع", key: "method", width: 18 },
    { header: "مرجع خارجي", key: "externalRef", width: 36 },
  ];

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF020617" },
  };
  sheet.getRow(1).alignment = { horizontal: "center" };

  for (const invoice of invoices) {
    sheet.addRow({
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: formatDate(invoice.issuedAt),
      status: invoice.status === "CANCELED" ? "ملغاة" : "صادرة",
      buyerName: invoice.buyerName,
      buyerEmail: invoice.buyerEmail || "—",
      buyerSchoolName: invoice.buyerSchoolName || invoice.buyerAccountName || "—",
      itemTitle: invoice.itemTitle,
      subtotalAmount: invoice.subtotalAmount,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      paymentTransactionId: invoice.paymentTransactionId,
      method: invoice.paymentTransaction.method,
      externalRef: invoice.paymentTransaction.externalRef || "—",
    });
  }

  sheet.autoFilter = {
    from: "A1",
    to: "O1",
  };

  await logAdminActivity({
    actorUserId: current?.user.id || null,
    category: "PAYMENT",
    action: "INVOICES_EXPORTED",
    severity: "SUCCESS",
    title: "تصدير الفواتير إلى Excel",
    details: {
      count: invoices.length,
      activeCount: activeInvoices.length,
      canceledCount: canceledInvoices.length,
      activeTotalAmount,
      activeTaxAmount,
      canceledTotalAmount,
      canceledTaxAmount,
      filters: filterSummary,
    },
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `invoices-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
