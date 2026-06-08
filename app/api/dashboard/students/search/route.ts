import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveCurrentSchoolContext } from "@/lib/data-center/data-center-auth";

export const runtime = "nodejs";

type StudentSearchRow = {
  id: string;
  fullName: string;
  nationalId: string | null;
  gender: string;
  stage: string | null;
  grade: string | null;
  classroom: string | null;
  phone: string | null;
  guardianId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianRelation: string | null;
};

function normalizeSearchQuery(value: string | null) {
  return String(value || "").trim().slice(0, 80);
}

function isUnauthenticatedSchoolUser(error: unknown) {
  return error instanceof Error && error.message === "UNAUTHENTICATED_SCHOOL_USER";
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function toStudentPickerItem(row: StudentSearchRow) {
  return {
    id: row.id,
    fullName: row.fullName,
    nationalId: row.nationalId,
    gender: row.gender,
    stage: row.stage,
    grade: row.grade,
    classroom: row.classroom,
    phone: row.phone,

    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,

    guardian: row.guardianId
      ? {
          id: row.guardianId,
          name: row.guardianName,
          phone: row.guardianPhone,
          relation: row.guardianRelation,
        }
      : null,
  };
}

async function searchStudentsWithRawSql({
  schoolAccountId,
  q,
}: {
  schoolAccountId: string;
  q: string;
}) {
  if (!q) {
    return prisma.$queryRaw<StudentSearchRow[]>`
      SELECT
        s.id,
        s.fullName,
        s.nationalId,
        s.gender,
        s.stage,
        s.grade,
        s.classroom,
        s.phone,
        s.guardianId,
        g.name AS guardianName,
        g.phone AS guardianPhone,
        g.relation AS guardianRelation
      FROM Student s
      LEFT JOIN Guardian g ON g.id = s.guardianId
      WHERE s.schoolAccountId = ${schoolAccountId}
        AND s.isActive = 1
      ORDER BY s.grade ASC, s.classroom ASC, s.fullName ASC
      LIMIT 40
    `;
  }

  const pattern = `%${escapeLike(q)}%`;

  return prisma.$queryRaw<StudentSearchRow[]>`
    SELECT
      s.id,
      s.fullName,
      s.nationalId,
      s.gender,
      s.stage,
      s.grade,
      s.classroom,
      s.phone,
      s.guardianId,
      g.name AS guardianName,
      g.phone AS guardianPhone,
      g.relation AS guardianRelation
    FROM Student s
    LEFT JOIN Guardian g ON g.id = s.guardianId
    WHERE s.schoolAccountId = ${schoolAccountId}
      AND s.isActive = 1
      AND (
        s.fullName COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
        OR s.nationalId COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
        OR s.grade COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
        OR s.classroom COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
        OR s.phone COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
        OR g.name COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
        OR g.phone COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
      )
    ORDER BY s.grade ASC, s.classroom ASC, s.fullName ASC
    LIMIT 40
  `;
}

export async function GET(request: NextRequest) {
  try {
    const context = await resolveCurrentSchoolContext();

    const q = normalizeSearchQuery(
      request.nextUrl.searchParams.get("q") ||
        request.nextUrl.searchParams.get("query"),
    );

    const students = await searchStudentsWithRawSql({
      schoolAccountId: context.schoolAccountId,
      q,
    });

    return NextResponse.json({
      success: true,
      students: students.map(toStudentPickerItem),
    });
  } catch (error) {
    console.error("[students-search-api]", error);

    return NextResponse.json(
      {
        success: false,
        error: isUnauthenticatedSchoolUser(error)
          ? "يجب تسجيل الدخول بحساب مرتبط بمدرسة."
          : "تعذر البحث في الطلاب.",
      },
      {
        status: isUnauthenticatedSchoolUser(error) ? 401 : 500,
      },
    );
  }
}
