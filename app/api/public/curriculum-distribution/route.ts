import { NextResponse } from "next/server";

import {
  getCurriculumOptions,
  getDistribution,
} from "@/lib/curriculum-distribution/queries";

export const dynamic = "force-dynamic";

const allowedKinds = new Set([
  "stages",
  "child-stages",
  "tracks",
  "grades",
  "semesters",
  "subjects",
]);

function clean(value: string | null) {
  return String(value || "").trim().slice(0, 120);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = clean(url.searchParams.get("kind"));

  if (kind === "distribution") {
    const subjectId = clean(url.searchParams.get("subjectId"));
    const semesterId = clean(url.searchParams.get("semesterId"));
    if (!subjectId || !semesterId) {
      return NextResponse.json(
        { error: "اختيارات المنهج غير مكتملة." },
        { status: 400 },
      );
    }

    const distribution = await getDistribution(subjectId, semesterId);
    return distribution
      ? NextResponse.json({ success: true, distribution })
      : NextResponse.json(
          { success: false, error: "التوزيع غير موجود." },
          { status: 404 },
        );
  }

  if (!allowedKinds.has(kind)) {
    return NextResponse.json({ error: "نوع البيانات غير صالح." }, { status: 400 });
  }

  const data = await getCurriculumOptions(kind, {
    stageId: clean(url.searchParams.get("stageId")),
    trackId: clean(url.searchParams.get("trackId")),
    gradeId: clean(url.searchParams.get("gradeId")),
    semesterId: clean(url.searchParams.get("semesterId")),
    parentId: clean(url.searchParams.get("parentId")),
  });

  return NextResponse.json({ success: true, data });
}
