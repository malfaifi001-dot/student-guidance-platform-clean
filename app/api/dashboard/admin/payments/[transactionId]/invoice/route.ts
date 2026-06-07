import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import {
  AdminInvoiceError,
  getOrCreateInvoiceForPaymentTransaction,
} from "@/lib/admin/invoices";

type RouteContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  try {
    const current = await getCurrentSessionUser();
    const device = await getRequestDeviceInfo();
    const { transactionId } = await context.params;

    const result = await getOrCreateInvoiceForPaymentTransaction(
      transactionId,
      current?.user.id || null
    );

    if (result.wasCreated) {
      await logAdminActivity({
        actorUserId: current?.user.id || null,
        category: "PAYMENT",
        action: "INVOICE_ISSUED",
        severity: "SUCCESS",
        title: "إصدار فاتورة عملية دفع",
        details: {
          transactionId,
          invoiceNumber: result.payload.invoice.invoiceNumber,
          totalAmount: result.payload.invoice.amounts.totalAmount,
          taxRate: result.payload.invoice.amounts.taxRate,
          taxAmount: result.payload.invoice.amounts.taxAmount,
        },
        ipAddress: device.ipAddress,
        userAgent: device.userAgent,
      });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("ADMIN_PAYMENT_INVOICE_ERROR", error);

    if (error instanceof AdminInvoiceError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: error.status,
        }
      );
    }

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