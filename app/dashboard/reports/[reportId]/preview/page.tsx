import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportPreviewA4 } from "@/components/reports/report-preview-a4";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function ReportPreviewPage({ params }: PageProps) {
  const { reportId } = await params;

  const report = await prisma.guidanceReport.findUnique({
    where: {
      id: reportId,
    },
    include: {
      evidenceItems: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      caseEntry: {
        include: {
          service: true,
          student: true,
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  return <ReportPreviewA4 report={report} />;
}