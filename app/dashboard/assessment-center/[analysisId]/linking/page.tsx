import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireDashboardPageContext } from "@/lib/auth/dashboard-context";
import type { AssessmentResultRow } from "@/lib/assessment-center/assessment-center-types";
import { AssessmentLinkingReview } from "@/components/assessment-center/assessment-linking-review";

type PageProps = {
  params: Promise<{
    analysisId: string;
  }>;
};

function asRows(value: unknown): AssessmentResultRow[] {
  if (!Array.isArray(value)) return [];
  return value as AssessmentResultRow[];
}

export default async function AssessmentLinkingPage({ params }: PageProps) {
  const context = await requireDashboardPageContext();
  const { analysisId } = await params;

  const analysis = await prisma.assessmentAnalysis.findFirst({
    where: context.isAdmin
      ? {
          id: analysisId,
        }
      : {
          id: analysisId,
          schoolAccountId: context.schoolAccountId,
        },
  });

  if (!analysis) {
    notFound();
  }

  const schoolAccountId = analysis.schoolAccountId || context.schoolAccountId;

  const students = schoolAccountId
    ? await prisma.student.findMany({
        where: {
          schoolAccountId,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          nationalId: true,
          grade: true,
          classroom: true,
        },
        orderBy: {
          fullName: "asc",
        },
      })
    : [];

  return (
    <AssessmentLinkingReview
      analysis={{
        id: analysis.id,
        title: analysis.title,
      }}
      rows={asRows(analysis.rowsJson)}
      students={students}
    />
  );
}