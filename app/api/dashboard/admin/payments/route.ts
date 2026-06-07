import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import {
  getAdminPaymentsCenterData,
  type AdminPaymentsFilters,
} from "@/lib/admin/payments";

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
    take: Number(searchParams.get("take") || 50),
  };

  const data = await getAdminPaymentsCenterData(filters);

  return NextResponse.json({
    ...data,
    filters,
  });
}