import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ sessionId: string }> | { sessionId: string };
};

async function getParams(context: RouteContext) {
  return await context.params;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const current = await resolveCurrentSchoolContext();
    const params = await getParams(context);

    const session = await prisma.studentImportSession.findFirst({
      where: {
        id: params.sessionId,
        schoolAccountId: current.schoolAccountId,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "لم يتم العثور على جلسة الاستيراد." },
        { status: 404 },
      );
    }

    if (session.status !== "COMMITTED") {
      return NextResponse.json(
        { error: "الأرشفة مخصصة للجلسات المعتمدة فقط. الجلسات غير المعتمدة يمكن حذفها." },
        { status: 409 },
      );
    }

    const updated = await prisma.studentImportSession.update({
      where: {
        id: session.id,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedByUserId: current.user.id,
      },
    });

    await writeNoorImportActivity({
      schoolAccountId: current.schoolAccountId,
      userId: current.user.id,
      event: "NOOR_IMPORT_SESSION_ARCHIVED",
      title: "تمت أرشفة جلسة استيراد نور",
      description: "تمت أرشفة جلسة معتمدة مع إبقاء أثرها محفوظًا.",
      metadata: {
        sessionId: session.id,
        title: session.title,
      },
    });

    return NextResponse.json({
      message: "تمت أرشفة جلسة الاستيراد.",
      session: updated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
            : "تعذر أرشفة جلسة الاستيراد.",
      },
      { status: 500 },
    );
  }
}
