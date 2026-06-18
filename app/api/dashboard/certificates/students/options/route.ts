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
  const actor = await getCertificateActor();

  if (!actor) {
    return NextResponse.json({ error: "غير مصرح." }, { status: 401 });
  }

  const url = new URL(request.url);
  const grade = url.searchParams.get("grade")?.trim() || "";
  const classroom = url.searchParams.get("classroom")?.trim() || "";
  const query = url.searchParams.get("query")?.trim() || "";

  const grades = await certificatePrisma.$queryRawUnsafe<{ grade: string | null }[]>(
    `
    SELECT DISTINCT grade
    FROM Student
    WHERE schoolAccountId = ?
      AND grade IS NOT NULL
      AND grade <> ''
    ORDER BY grade ASC
    `,
    actor.schoolAccountId,
  );

  const classrooms = await certificatePrisma.$queryRawUnsafe<{ classroom: string | null }[]>(
    `
    SELECT DISTINCT classroom
    FROM Student
    WHERE schoolAccountId = ?
      AND classroom IS NOT NULL
      AND classroom <> ''
      AND (? = '' OR grade = ?)
    ORDER BY classroom ASC
    `,
    actor.schoolAccountId,
    grade,
    grade,
  );

  const like = `%${query}%`;

  const students = await certificatePrisma.$queryRawUnsafe<StudentOption[]>(
    `
    SELECT id, fullName, nationalId, grade, classroom, gender
    FROM Student
    WHERE schoolAccountId = ?
      AND (? = '' OR grade = ?)
      AND (? = '' OR classroom = ?)
      AND (
        ? = ''
        OR fullName LIKE ?
        OR nationalId LIKE ?
      )
    ORDER BY fullName ASC
    LIMIT 200
    `,
    actor.schoolAccountId,
    grade,
    grade,
    classroom,
    classroom,
    query,
    like,
    like,
  );

  return NextResponse.json({
    grades: grades.map((item) => item.grade).filter(Boolean),
    classrooms: classrooms.map((item) => item.classroom).filter(Boolean),
    students,
  });
}