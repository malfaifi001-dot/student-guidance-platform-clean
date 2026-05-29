import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { reportId } = await context.params;

  const report = await prisma.guidanceReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    reportId: report.id,
  });
}