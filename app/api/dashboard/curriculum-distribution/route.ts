import { NextResponse } from "next/server";
import { requireServiceAccessForCurrentUser } from "@/bin/require-auth";
import { getCurriculumOptions, getDistribution } from "@/lib/curriculum-distribution/queries";

const SERVICE = "curriculum-distribution";
function forbidden() { return NextResponse.json({ success: false, error: "هذه الخدمة متاحة للمعلمين فقط.", code: "FORBIDDEN" }, { status: 403 }); }

export async function GET(request: Request) {
  const context = await requireServiceAccessForCurrentUser(SERVICE);
  if (context instanceof Response) return context;
  if (!context.isAdmin && context.user.role !== "TEACHER") return forbidden();
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || "";
  const allowed = new Set(["stages", "child-stages", "tracks", "grades", "semesters", "subjects", "distribution"]);
  if (!allowed.has(kind)) return NextResponse.json({ success: false, error: "طلب غير صالح." }, { status: 400 });
  const values = { stageId: url.searchParams.get("stageId") || undefined, trackId: url.searchParams.get("trackId") || undefined, gradeId: url.searchParams.get("gradeId") || undefined, semesterId: url.searchParams.get("semesterId") || undefined, parentId: url.searchParams.get("parentId") || undefined };
  if (kind === "distribution") {
    if (!values.semesterId || !url.searchParams.get("subjectId")) return NextResponse.json({ success: false, error: "يجب تحديد المادة والفصل." }, { status: 400 });
    const distribution = await getDistribution(url.searchParams.get("subjectId")!, values.semesterId);
    return distribution ? NextResponse.json({ success: true, distribution }) : NextResponse.json({ success: false, error: "التوزيع غير موجود." }, { status: 404 });
  }
  const data = await getCurriculumOptions(kind, values);
  return NextResponse.json({ success: true, data });
}
