import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin/admin-api-guard";
import { getCurrentSessionUser } from "@/lib/auth/current-user";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> }
) {
  const adminError = await requireAdminApi();

  if (adminError) {
    return adminError;
  }

  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }

  const { requestId } = await context.params;
  const payload = await request.json().catch(() => null);
  const reason = String(payload?.reason || "").trim();

  const transferRequest = await prisma.bankTransferRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!transferRequest) {
    return NextResponse.json(
      { error: "طلب التحويل غير موجود." },
      { status: 404 }
    );
  }

  if (transferRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "هذا الطلب تمت معالجته مسبقًا." },
      { status: 400 }
    );
  }

  await prisma.bankTransferRequest.update({
    where: {
      id: transferRequest.id,
    },
    data: {
      status: "FAILED",
      adminNote: [
        transferRequest.adminNote || "",
        `سبب الرفض: ${reason || "تم رفض الطلب من لوحة الأدمن."}`,
      ]
        .filter(Boolean)
        .join(" | "),
    },
  });

  return NextResponse.json({
    message: "تم رفض طلب التحويل وحفظ السبب.",
  });
}
