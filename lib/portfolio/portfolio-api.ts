import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireDashboardUser } from "@/lib/auth/require-auth";
import {
  assertPortfolioActor,
  PortfolioServiceError,
} from "@/lib/portfolio/portfolio-authorization";

export async function requirePortfolioApiUser() {
  const current = await requireDashboardUser();
  assertPortfolioActor(current.user);
  return current.user;
}

export function portfolioApiError(error: unknown) {
  if (error instanceof PortfolioServiceError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { ok: false, error: error.issues[0]?.message || "البيانات المدخلة غير صحيحة." },
      { status: 400 },
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ ok: false, error: "تعذر قراءة البيانات المرسلة." }, { status: 400 });
  }

  console.error("Portfolio API error", error);
  return NextResponse.json(
    { ok: false, error: "تعذر إكمال العملية الآن. حاول مرة أخرى." },
    { status: 500 },
  );
}
