import { NextResponse } from "next/server";
import { certificatePrisma } from "@/lib/certificates/certificate-db";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StudentOption = {
  id: string;
  fullName: string;
  nationalId: string | null;
  grade: string | null;
  classroom: string | null;
  gender: string | null;
};

export async function GET(request: Request) {
  let actor;

  try {
    actor = await getCertificateActor();
  } catch {
    actor = null;
  }

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  let grade = "";
  let classroom = "";
  let query = "";

  try {
    const url = new URL(request.url);
    grade = url.searchParams.get("grade")?.trim() || "";
    classroom = url.searchParams.get("classroom")?.trim() || "";
    query = url.searchParams.get("query")?.trim() || "";
  } catch {
    grade = "";
    classroom = "";
    query = "";
  }

  try {
    const gradeRows = await certificatePrisma.student.findMany({
      where: {
        schoolAccountId: actor.schoolAccountId,
        isActive: true,
        grade: { not: null },
      },
      select: { grade: true },
      distinct: ["grade"],
      orderBy: { grade: "asc" },
    });

    const grades = Array.from(
      new Set(
        gradeRows
          .map((row) => row.grade?.trim())
          .filter((value): value is string => Boolean(value && value !== "")),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const classroomWhere = {
      schoolAccountId: actor.schoolAccountId,
      isActive: true,
      classroom: { not: null } as const,
      ...(grade ? { grade } : {}),
    };

    const classroomRows = await certificatePrisma.student.findMany({
      where: classroomWhere,
      select: { classroom: true },
      distinct: ["classroom"],
      orderBy: { classroom: "asc" },
    });

    const classrooms = Array.from(
      new Set(
        classroomRows
          .map((row) => row.classroom?.trim())
          .filter((value): value is string => Boolean(value && value !== "")),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const students = await certificatePrisma.student.findMany({
      where: {
        schoolAccountId: actor.schoolAccountId,
        isActive: true,
        ...(grade ? { grade } : {}),
        ...(classroom ? { classroom } : {}),
        ...(query
          ? {
              OR: [
                { fullName: { contains: query } },
                { nationalId: { contains: query } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        nationalId: true,
        grade: true,
        classroom: true,
        gender: true,
      },
      orderBy: { fullName: "asc" },
      take: 200,
    });

    return NextResponse.json({
      grades,
      classrooms,
      students: students.map((student) => ({
        ...student,
        gender: student.gender?.toString() || null,
      })),
    });
  } catch (error) {
    console.error(
      "Certificate student options failed.",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: "تعذر تحميل خيارات الطلاب. حاول مرة أخرى." },
      { status: 500 },
    );
  }
}
