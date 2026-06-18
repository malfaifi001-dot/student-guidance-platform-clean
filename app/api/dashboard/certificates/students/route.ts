import { NextResponse } from "next/server";
import { getCertificateActor } from "@/lib/certificates/certificate-auth";
import { certificatePrisma } from "@/lib/certificates/certificate-db";

export const runtime = "nodejs";

type StudentSearchRow = {
  id: string;
  fullName: string | null;
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
  const query = url.searchParams.get("query")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const like = `%${query}%`;

  const rows = await certificatePrisma.$queryRawUnsafe<StudentSearchRow[]>(
    `
    SELECT id, fullName, nationalId, grade, classroom, gender
    FROM Student
    WHERE schoolAccountId = ?
      AND (
        fullName LIKE ?
        OR nationalId LIKE ?
        OR grade LIKE ?
        OR classroom LIKE ?
      )
    ORDER BY fullName ASC
    LIMIT 10
    `,
    actor.schoolAccountId,
    like,
    like,
    like,
    like,
  );

  return NextResponse.json({
    items: rows.map((student) => ({
      id: student.id,
      name: student.fullName || "طالب بدون اسم",
      nationalId: student.nationalId || "",
      grade: student.grade || "",
      classroom: student.classroom || "",
      gender: student.gender || "",
    })),
  });
}