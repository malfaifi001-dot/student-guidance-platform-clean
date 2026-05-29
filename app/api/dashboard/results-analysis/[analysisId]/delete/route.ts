import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    analysisId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { analysisId } = await context.params;

  await prisma.resultsAnalysis.delete({
    where: {
      id: analysisId,
    },
  });

  return NextResponse.json({
    success: true,
  });
}