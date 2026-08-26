import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { persistReviewedTimetableImport, TimetableImportValidationError } from "@/lib/timetable-import/timetable-v3-import-persistence";

export const runtime = "nodejs";
const entrySchema = z.object({ teacherName: z.string().trim().min(1).max(160), day: z.string().trim().min(1).max(80), period: z.number().int().min(1).max(7), subjectName: z.string().trim().max(160).nullable().optional(), gradeName: z.string().trim().max(160).nullable().optional(), classroomName: z.string().trim().min(1).max(160), rawCell: z.string().max(2000).nullable().optional(), confidence: z.number().min(0).max(1).nullable().optional() }).strict();
const requestSchema = z.object({ result: z.object({ sourceType: z.enum(["EXCEL", "IMAGE", "PDF"]).optional(), entries: z.array(entrySchema).min(1).max(10000), warnings: z.array(z.string().max(500)).max(500).optional() }).strict(), name: z.string().trim().max(120).optional(), academicYear: z.string().trim().max(40).optional(), semester: z.string().trim().max(80).optional() }).strict();

export async function POST(request: Request) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "بيانات المراجعة غير صالحة." }, { status: 400 });
  try {
    const created = await persistReviewedTimetableImport({ schoolAccountId: access.schoolAccountId!, createdById: access.user.id, entries: parsed.data.result.entries, sourceType: parsed.data.result.sourceType, warnings: parsed.data.result.warnings, name: parsed.data.name, academicYear: parsed.data.academicYear, semester: parsed.data.semester });
    return NextResponse.json({ success: true, ...created, redirectUrl: "/dashboard/timetable-v3" }, { status: 201 });
  } catch (error) {
    if (error instanceof TimetableImportValidationError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    console.error("TIMETABLE_IMPORT_CONFIRM_FAILED", error);
    return NextResponse.json({ success: false, error: "تعذر إنشاء مشروع الجدول التشغيلي." }, { status: 500 });
  }
}
