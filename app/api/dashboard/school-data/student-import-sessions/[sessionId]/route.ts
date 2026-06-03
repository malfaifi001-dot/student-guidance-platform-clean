import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const authResult = await requireSchoolDashboardApiContext();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { sessionId } = await context.params;

  const session = await prisma.studentImportSession.findFirst({
    where: {
      id: sessionId,
      schoolAccountId: authResult.schoolAccountId,
    },
    include: {
      files: true,
      rows: {
        orderBy: {
          rowIndex: "asc",
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: "دفعة الاستيراد غير موجودة أو لا تملك صلاحية الوصول إليها.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    session,
  });
}
