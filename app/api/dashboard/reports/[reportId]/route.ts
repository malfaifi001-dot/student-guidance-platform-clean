import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    reportId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { reportId } = await context.params;
  const body = await request.json();

  const report = await prisma.guidanceReport.update({
    where: {
      id: reportId,
    },
    data: {
      status: "DRAFT",
      genderMode: body.genderMode,
      editableContent: body.editableContent,
      renderedContent: body.renderedContent,
    },
  });

  return NextResponse.json({
    success: true,
    reportId: report.id,
  });
}