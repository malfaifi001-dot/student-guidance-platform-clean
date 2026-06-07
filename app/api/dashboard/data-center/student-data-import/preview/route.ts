import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type AppTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";
import { writeNoorImportActivity } from "@/lib/data-center/noor-import-audit";
import {
  parseNoorStudentWorkbook,
  type NoorParsedWorkbook,
} from "@/lib/noor-import/noor-student-data-list-parser";
import { syncNoorImportCycle } from "@/lib/noor-import/noor-import-cycle-sync";

export const runtime = "nodejs";

type PlanAction =
  | "NEW"
  | "UPDATE"
  | "UNCHANGED"
  | "DUPLICATE_IN_FILE"
  | "NEEDS_REVIEW";

type ParsedStudentRow = NoorParsedWorkbook["rows"][number];

type PlannedRow = Omit<ParsedStudentRow, "status"> & {
  status: "VALID" | "INVALID" | "CONFLICT";
  planAction: PlanAction;
};

function normalize(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDifferent(
  existing: {
    fullName?: string | null;
    stage?: string | null;
    grade?: string | null;
    classroom?: string | null;
    guardian?: { name?: string | null } | null;
  },
  row: {
    fullName: string;
    stage: string | null;
    grade: string | null;
    classroom: string | null;
    guardianName: string | null;
  },
) {
  return (
    normalize(existing.fullName) !== normalize(row.fullName) ||
    normalize(existing.stage) !== normalize(row.stage) ||
    normalize(existing.grade) !== normalize(row.grade) ||
    normalize(existing.classroom) !== normalize(row.classroom) ||
    normalize(existing.guardian?.name) !== normalize(row.guardianName)
  );
}

function buildPlanSummary(rows: Array<{ planAction: string | null }>) {
  return rows.reduce(
    (summary: any, row: any) => {
      const action = row.planAction || "NEEDS_REVIEW";
      summary[action] = (summary[action] || 0) + 1;
      return summary;
    },
    {} as Record<string, number>,
  );
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function toImportRowCreateManyData(sessionId: string, rows: PlannedRow[]) {
  return rows.map((row: any) => ({
    sessionId,
    rowIndex: row.rowIndex,
    status: row.status,
    planAction: row.planAction,
    fullName: row.fullName,
    nationalId: row.nationalId,
    gender: row.gender,
    stage: row.stage,
    grade: row.grade,
    classroom: row.classroom,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    errorMessage: [...row.errors, ...row.warnings].join(" | ") || null,
    rawJson: {
      ...row.raw,
      errors: row.errors,
      warnings: row.warnings,
      planAction: row.planAction,
    },
  }));
}

export async function POST(request: Request) {
  try {
    const context = await resolveCurrentSchoolContext();

    const formData = await request.formData();

    const uploaded = formData.get("file");
    const academicYear = String(formData.get("academicYear") || "").trim() || null;
    const term = String(formData.get("term") || "").trim() || null;
    const cycleId = String(formData.get("cycleId") || "").trim() || null;

    if (!cycleId) {
      return NextResponse.json(
        { error: "يجب رفع ملف بيانات الطلاب من داخل بطاقة بيانات الطلاب وليس من رابط مباشر." },
        { status: 400 },
      );
    }

    const cycle = await prisma.noorImportCycle.findFirst({
      where: {
        id: cycleId,
        schoolAccountId: context.schoolAccountId,
      },
    });

    if (!cycle) {
      return NextResponse.json(
        { error: "لم يتم العثور على بطاقة بيانات الطلاب." },
        { status: 404 },
      );
    }

    const pendingSession = await prisma.studentImportSession.findFirst({
      where: {
        cycleId,
        schoolAccountId: context.schoolAccountId,
        status: {
          not: "COMMITTED",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (pendingSession) {
      return NextResponse.json(
        {
          error:
            "يوجد تحديث بانتظار المراجعة داخل هذه البطاقة. راجع التحديث الحالي أو احذفه قبل رفع ملف جديد.",
        },
        { status: 409 },
      );
    }

    if (!uploaded || typeof uploaded === "string" || typeof uploaded.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "الرجاء اختيار ملف Excel صادر من نور." },
        { status: 400 },
      );
    }

    const file = uploaded as File;
    const fileName = file.name || "noor-students.xlsx";
    const lowerName = fileName.toLowerCase();

    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      return NextResponse.json(
        { error: "صيغة الملف غير مدعومة. ارفع ملف Excel بصيغة xlsx أو xls." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseNoorStudentWorkbook(buffer, fileName);

    if (!parsed.totalRows) {
      return NextResponse.json(
        {
          error:
            "لم يتم العثور على طلاب داخل الملف. تأكد أن الملف هو كشف بيانات الطلاب من نور.",
        },
        { status: 422 },
      );
    }

    const nationalIdCounts = new Map<string, number>();

    for (const row of parsed.rows) {
      if (row.nationalId) {
        nationalIdCounts.set(row.nationalId, (nationalIdCounts.get(row.nationalId) || 0) + 1);
      }
    }

    const nationalIds = Array.from(nationalIdCounts.keys());

    const existingStudents = await prisma.student.findMany({
      where: {
        schoolAccountId: context.schoolAccountId,
        nationalId: {
          in: nationalIds,
        },
      },
      include: {
        guardian: true,
      },
    });

    const existingByNationalId = new Map(
      existingStudents
        .filter((student: any) => student.nationalId)
        .map((student: any) => [student.nationalId as string, student]),
    );

    const rowsWithPlan: PlannedRow[] = parsed.rows.map((row: any) => {
      let planAction: PlanAction = "NEW";
      let rowStatus: "VALID" | "INVALID" | "CONFLICT" = row.status;

      if (!row.nationalId || row.errors.length > 0) {
        planAction = "NEEDS_REVIEW";
        rowStatus = "INVALID";
      } else if ((nationalIdCounts.get(row.nationalId) || 0) > 1) {
        planAction = "DUPLICATE_IN_FILE";
        rowStatus = "CONFLICT";
      } else {
        const existing = existingByNationalId.get(row.nationalId);

        if (!existing) {
          planAction = "NEW";
        } else if (isDifferent(existing, row)) {
          planAction = "UPDATE";
        } else {
          planAction = "UNCHANGED";
        }
      }

      return {
        ...row,
        status: rowStatus,
        planAction,
      };
    });

    const planSummary = buildPlanSummary(rowsWithPlan);
    const validRows = rowsWithPlan.filter((row: any) => row.status === "VALID").length;
    const invalidRows = rowsWithPlan.filter((row: any) => row.status === "INVALID").length;
    const conflictCount = rowsWithPlan.filter((row: any) => row.status === "CONFLICT").length;

    const session = await prisma.$transaction(async (tx: AppTransactionClient) => {
      const createdSession = await tx.studentImportSession.create({
        data: {
          schoolAccountId: context.schoolAccountId,
          cycleId,
          title: `تحديث نور - ${new Date().toLocaleDateString("ar-SA")}`,
          source: "NOOR_EXCEL",
          status: "PARSED",
          academicYear: academicYear ?? cycle.academicYear,
          term: term ?? cycle.term,
          importMode: "FULL_SYNC",
          totalRows: rowsWithPlan.length,
          validRows,
          invalidRows,
          conflictCount,
        },
      });

      await tx.studentImportFile.create({
        data: {
          sessionId: createdSession.id,
          fileName,
          mimeType: file.type || null,
          size: file.size || buffer.length,
          rowCount: rowsWithPlan.length,
        },
      });

      const chunks = chunkArray(rowsWithPlan, 50);

      for (const chunk of chunks) {
        await tx.studentImportRow.createMany({
          data: toImportRowCreateManyData(createdSession.id, chunk),
        });
      }

      await syncNoorImportCycle(tx, {
        cycleId,
        schoolAccountId: context.schoolAccountId,
      });

      return tx.studentImportSession.findUniqueOrThrow({
        where: {
          id: createdSession.id,
        },
        include: {
          files: true,
          rows: {
            orderBy: { rowIndex: "asc" },
            take: 50,
          },
          _count: {
            select: { rows: true },
          },
        },
      });
    });

    await writeNoorImportActivity({
      schoolAccountId: context.schoolAccountId,
      userId: context.user.id,
      event: "NOOR_IMPORT_PREVIEW_CREATED",
      title: "تم إنشاء تحديث بيانات الطلاب للمراجعة",
      description: `تمت قراءة ${rowsWithPlan.length} طالب/طالبة من ملف بيانات الطلاب قبل الاعتماد النهائي.`,
      metadata: {
        sessionId: session.id,
        cycleId,
        fileName,
        sheetsCount: parsed.sheetsCount,
        totalRows: rowsWithPlan.length,
        validRows,
        invalidRows,
        conflictCount,
        planSummary,
        grades: parsed.grades,
        classrooms: parsed.classrooms,
      },
    });

    return NextResponse.json({
      message: "تم إنشاء تحديث نور بنجاح. راجع التحديث قبل الاعتماد.",
      parsedSummary: {
        detectedFormat: parsed.detectedFormat,
        sheetsCount: parsed.sheetsCount,
        totalRows: rowsWithPlan.length,
        validRows,
        invalidRows,
        conflictCount,
        warningsCount: parsed.warningsCount,
        schoolName: parsed.schoolName,
        grades: parsed.grades,
        classrooms: parsed.classrooms,
        planSummary,
      },
      session: {
        ...session,
        rowCount: session._count.rows,
      },
    });
  } catch (error) {
    console.error("NOOR_IMPORT_PREVIEW_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER"
            ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة قبل رفع بيانات الطلاب."
            : "تعذر إنشاء معاينة استيراد نور. راجع Terminal لمعرفة السبب التفصيلي.",
      },
      { status: 500 },
    );
  }
}

