import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { activateSchoolAccount } from "@/lib/activation/activation-service";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

async function requireAdmin() {
  const current = await getCurrentSessionUser();

  if (!current?.user?.id) {
    return {
      response: NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول." },
        { status: 401 }
      ),
      user: null,
    };
  }

  if (current.user.role !== "ADMIN") {
    return {
      response: NextResponse.json(
        { success: false, error: "لا تملك صلاحية تنفيذ هذا الإجراء." },
        { status: 403 }
      ),
      user: null,
    };
  }

  return {
    response: null,
    user: current.user,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.response) return admin.response;

  try {
    const { requestId } = await context.params;
    const payload = await request.json().catch(() => ({}));

    const requestDays = Number(payload?.days || 0);
    const days = Number.isFinite(requestDays) && requestDays > 0 ? requestDays : 30;

    const bankRequest = await prisma.bankTransferRequest.findUnique({
      where: {
        id: requestId,
      },
    });

    if (!bankRequest) {
      return NextResponse.json(
        { success: false, error: "طلب التحويل غير موجود." },
        { status: 404 }
      );
    }

    if (bankRequest.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "هذا الطلب تمت معالجته مسبقًا." },
        { status: 409 }
      );
    }

    await activateSchoolAccount({
      schoolAccountId: bankRequest.schoolAccountId,
      days: bankRequest.durationDays || days,
      activatedById: admin.user!.id,
      reason: `قبول تحويل بنكي بقيمة ${bankRequest.amount} ${bankRequest.currency}`,
    });

    await prisma.bankTransferRequest.update({
      where: {
        id: bankRequest.id,
      },
      data: {
        status: "PAID",
        adminNote: `تم قبول الطلب وتفعيل الحساب لمدة ${bankRequest.durationDays || days} يوم.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "تم قبول طلب التحويل وتفعيل الحساب بنجاح.",
    });
  } catch (error) {
    console.error("APPROVE_BANK_TRANSFER_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر قبول طلب التحويل.",
      },
      { status: 500 }
    );
  }
}
