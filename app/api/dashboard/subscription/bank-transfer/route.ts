import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { logBankTransferRequestedEvent } from "@/lib/admin/activity-events";

export async function POST(request: Request) {
  const current = await getCurrentSessionUser();

  if (!current?.user?.schoolAccountId) {
    return NextResponse.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      }
    );
  }

  const payload = await request.json().catch(() => null);

  const senderName = String(payload?.senderName || "").trim();
  const phone = String(payload?.phone || "").trim();
  const amount = Number(payload?.amount || 0);
  const receiptUrl = String(payload?.receiptUrl || "").trim();
  const note = String(payload?.note || "").trim();

  if (!senderName) {
    return NextResponse.json(
      {
        error: "اكتب اسم المحوّل.",
      },
      {
        status: 400,
      }
    );
  }

  if (!amount || amount <= 0) {
    return NextResponse.json(
      {
        error: "اكتب مبلغ التحويل.",
      },
      {
        status: 400,
      }
    );
  }

  await prisma.bankTransferRequest.create({
    data: {
      schoolAccountId: current.user.schoolAccountId,
      amount,
      currency: "SAR",
      senderName,
      receiptUrl: receiptUrl || null,
      adminNote: [phone ? `جوال: ${phone}` : "", note ? `ملاحظة: ${note}` : ""]
        .filter(Boolean)
        .join(" | "),
      status: "PENDING",
    },
  });

  
    // audit-log:bank-transfer-requested
    await logBankTransferRequestedEvent({
      userId: current.user.id,
      schoolAccountId: current.user.schoolAccountId,
      amount: Number(amount || 0),
    });

return NextResponse.json({
    message: "تم إرسال طلب التفعيل. سيقوم الأدمن بمراجعته.",
  });
}
