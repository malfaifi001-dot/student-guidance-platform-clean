import { NextResponse, type NextRequest } from "next/server";
import { commitStudentImportSession } from "@/engine/students/student-import-engine";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;

  try {
    const session = await commitStudentImportSession(sessionId);

    return NextResponse.json({
      message: "تم اعتماد دفعة الاستيراد بنجاح.",
      session,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء اعتماد الدفعة.",
      },
      { status: 400 }
    );
  }
}