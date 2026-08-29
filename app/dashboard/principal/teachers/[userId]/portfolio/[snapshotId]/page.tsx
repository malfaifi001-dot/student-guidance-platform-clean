import { notFound } from "next/navigation";

import { PortfolioPrintDocument } from "@/components/portfolio/print/portfolio-print-document";
import { requirePrincipalPage } from "@/lib/principal/principal-page-guard";
import { prisma } from "@/lib/prisma";
import { parsePortfolioSnapshotDocument } from "@/lib/portfolio/portfolio-snapshot-types";

export const dynamic = "force-dynamic";

export default async function PrincipalStaffPortfolioSnapshotPage({
  params,
}: {
  params: Promise<{ userId: string; snapshotId: string }>;
}) {
  const principal = await requirePrincipalPage();
  if (!principal.schoolAccountId) notFound();

  const { userId, snapshotId } = await params;
  const snapshot = await prisma.portfolioSnapshot.findFirst({
    where: {
      id: snapshotId,
      ownerUserId: userId,
      schoolAccountId: principal.schoolAccountId,
      roleAtCreation: { in: ["TEACHER", "COUNSELOR", "ACTIVITY_LEADER"] },
    },
    select: { name: true, snapshotJson: true },
  });

  if (!snapshot) notFound();

  return (
    <main dir="rtl" className="min-w-0 max-w-full overflow-hidden">
      <header className="mx-auto w-full max-w-[1200px] px-4 py-5 print:hidden">
        <h1 className="text-xl font-black text-slate-950 dark:text-white">{snapshot.name}</h1>
        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">نسخة محفوظة للقراءة والمراجعة</p>
      </header>
      <PortfolioPrintDocument data={parsePortfolioSnapshotDocument(snapshot.snapshotJson)} />
    </main>
  );
}
