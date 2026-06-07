import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";
import { logAdminActivity } from "@/lib/admin/activity-log";
import { getInvoiceSettings, updateInvoiceSettings } from "@/lib/admin/invoices";

export async function GET() {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const settings = await getInvoiceSettings();

  return NextResponse.json({
    settings,
  });
}

export async function PUT(request: NextRequest) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();
  const device = await getRequestDeviceInfo();
  const body = await request.json().catch(() => ({}));

  const settings = await updateInvoiceSettings(body);

  await logAdminActivity({
    actorUserId: current?.user.id || null,
    category: "PAYMENT",
    action: "INVOICE_SETTINGS_UPDATED",
    severity: "SUCCESS",
    title: "تحديث إعدادات الفواتير",
    details: {
      vatEnabled: settings.vatEnabled,
      vatRate: settings.vatRate,
      invoicePrefix: settings.invoicePrefix,
      sellerName: settings.sellerName,
    },
    ipAddress: device.ipAddress,
    userAgent: device.userAgent,
  });

  return NextResponse.json({
    settings,
    message: "تم حفظ إعدادات الفواتير بنجاح.",
  });
}