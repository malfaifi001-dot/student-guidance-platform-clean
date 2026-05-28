import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;

  const session = await prisma.studentImportSession.findUnique({
    where: {
      id: sessionId,
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
      { error: "دفعة الاستيراد غير موجودة." },
      { status: 404 }
    );
  }

  return NextResponse.json({ session });
}