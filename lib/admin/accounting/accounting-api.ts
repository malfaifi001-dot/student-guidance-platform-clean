import { ZodError } from "zod";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { AccountingError } from "@/lib/admin/accounting/accounting-service";
import { getCurrentSessionUser, getRequestDeviceInfo } from "@/lib/auth/current-user";

export async function requireAccountingApiActor() {
  const adminError = await requireAdminApi();
  if (adminError) return { error: adminError } as const;
  const current = await getCurrentSessionUser();
  if (!current?.user || current.user.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "غير مصرح." }, { status: 403 }),
    } as const;
  }
  const device = await getRequestDeviceInfo();
  return {
    actor: { id: current.user.id, name: current.user.name },
    request: device,
  } as const;
}

export function accountingApiError(error: unknown) {
  if (error instanceof AccountingError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message || "بيانات المصروف غير صحيحة." },
      { status: 400 },
    );
  }
  console.error("ADMIN accounting request failed", error);
  return NextResponse.json(
    { error: "تعذر إكمال العملية المحاسبية." },
    { status: 500 },
  );
}
