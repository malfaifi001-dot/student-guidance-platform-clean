import { NextResponse, type NextRequest } from "next/server";
import { commitStudentImportSession } from "@/engine/students/student-import-engine";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { sessionId } = await context.params;

  try {
    const session = await commitStudentImportSession({
      schoolAccountId: authResult.schoolAccountId,
      sessionId,
    });

    return NextResponse.json({
      success: true,
      message: "تم اعتماد دفعة الاستيراد بنجاح.",
      session,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء اعتماد الدفعة.",
      },
      { status: 400 }
    );
  }
}
