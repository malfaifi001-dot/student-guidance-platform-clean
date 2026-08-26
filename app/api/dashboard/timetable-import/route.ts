import { NextResponse } from "next/server";

import { requireTimetableApiAccess } from "@/lib/timetable/timetable-access";
import { parseTimetableImport } from "@/lib/timetable-import/timetable-import-parser";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const access = await requireTimetableApiAccess({ requireActiveSubscription: true });
  if (!access.ok) return access.response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "اختر ملف الجدول أولًا." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: "حجم الملف غير صالح أو يتجاوز الحد المسموح." }, { status: 400 });
  }

  try {
    const result = await parseTimetableImport({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
    });

    return NextResponse.json({
      success: true,
      reviewRequired: true,
      schoolAccountId: access.schoolAccountId,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر تحليل ملف الجدول.",
      },
      { status: 422 },
    );
  }
}
