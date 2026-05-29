import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { reportId } = await context.params;

  await prisma.guidanceReport.delete({
    where: {
      id: reportId,
    },
  });

  return NextResponse.json({
    success: true,
  });
}