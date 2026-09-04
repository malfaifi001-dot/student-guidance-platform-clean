import { NextResponse } from "next/server";

import { portfolioApiError, requirePortfolioApiUser } from "@/lib/portfolio/portfolio-api";
import { deletePortfolioSnapshot, getPortfolioSnapshot } from "@/lib/portfolio/portfolio-snapshot-service";

type Context = {
  params: Promise<{ portfolioId: string; snapshotId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId, snapshotId } = await context.params;
    const snapshot = await getPortfolioSnapshot(user, snapshotId);
    if (snapshot.portfolioId !== portfolioId) {
      return NextResponse.json({ ok: false, error: "نسخة ملف الإنجاز غير موجودة." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return portfolioApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requirePortfolioApiUser();
    const { portfolioId, snapshotId } = await context.params;
    await deletePortfolioSnapshot(user, portfolioId, snapshotId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return portfolioApiError(error);
  }
}
