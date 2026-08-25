import { NextResponse } from "next/server";

import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { commitNoorImportSession } from "@/lib/noor-import/commit-noor-import-session";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> | { sessionId: string } };

export async function POST(request: Request, context: RouteContext) {
  try {
    const current = (await resolveCurrentSchoolContext()) as any;
    const actorUserId = current?.user?.id || current?.currentUser?.id || current?.sessionUser?.id || current?.userId;
    if (!current?.schoolAccountId || !actorUserId) {
      return NextResponse.json({ error: "يجب تسجيل الدخول بحساب مرتبط بمدرسة قبل اعتماد بيانات الطلاب." }, { status: 401 });
    }

    const { sessionId } = await context.params;
    let body: any = {};
    try { body = await request.json(); } catch { /* empty body is valid */ }

    const result = await commitNoorImportSession({
      sessionId,
      schoolAccountId: current.schoolAccountId,
      actorUserId,
      deactivateMissing: body?.deactivateMissing === true,
    });

    return NextResponse.json({
      message: "تم استيراد بيانات الطلاب وربطها بالمدرسة.",
      deactivatedCount: result.deactivatedCount,
      importResult: {
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        importedStudents: result.importedStudents,
      },
      session: { ...result.session, rowCount: result.session._count.rows },
    });
  } catch (error) {
    console.error("noor import commit failed", error);
    const message = error instanceof Error
      ? ({
          UNAUTHENTICATED_SCHOOL_USER: "يجب تسجيل الدخول بحساب مرتبط بمدرسة قبل اعتماد بيانات الطلاب.",
          IMPORT_SESSION_NOT_FOUND: "لم يتم العثور على جلسة الاستيراد.",
          IMPORT_SESSION_ALREADY_COMMITTED: "تم استيراد هذه الجلسة مسبقًا.",
          IMPORT_SESSION_HAS_NO_VALID_ROWS: "لا توجد صفوف صالحة للاستيراد في هذا الملف.",
        } as Record<string, string>)[error.message] || error.message
      : "تعذر استيراد بيانات الطلاب.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
