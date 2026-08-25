import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSchoolDashboardApiContext } from "@/lib/auth/dashboard-context";
import { requireServiceAccessApi } from "@/lib/subscription/subscription-api-guard";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const nameAliases = ["اسم الطالب", "اسم الطالبة", "الطالب", "الطالبة", "الاسم", "student", "studentname", "name"];
const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[\s_\-]/g, "");
const isName = (value: unknown) => nameAliases.some((alias) => normalize(value).includes(normalize(alias)));

export async function POST(request: Request) {
  const context = await requireSchoolDashboardApiContext();
  if (context instanceof Response) return context;
  const guard = await requireServiceAccessApi("assessment-center");
  if (guard) return guard;
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0 || file.size > MAX_FILE_SIZE || !/\.(xlsx|xls|csv)$/i.test(file.name)) return NextResponse.json({ success: false, error: "ملف Excel غير صالح أو أكبر من 8MB." }, { status: 400 });
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const headerIndex = matrix.findIndex((row) => row.some((cell) => isName(cell)));
    if (headerIndex < 0) return NextResponse.json({ success: false, error: "تعذر العثور على عمود اسم الطالب." }, { status: 400 });
    const headers = (matrix[headerIndex] || []).map((value, index) => String(value || `عمود ${index + 1}`).trim());
    const rows = matrix.slice(headerIndex + 1).filter((row) => row.some((cell) => String(cell || "").trim())).slice(0, 3000).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
    const students = await prisma.student.findMany({ where: { schoolAccountId: context.schoolAccountId, isActive: true }, select: { id: true, fullName: true, grade: true, classroom: true } });
    const nameHeader = headers.find((header) => isName(header)) || headers[0];
    const matched = rows.map((row) => { const name = String(row[nameHeader] || "").trim(); const exact = students.find((student) => normalize(student.fullName) === normalize(name)); const candidates = exact ? [] : students.filter((student) => normalize(student.fullName).includes(normalize(name)) || normalize(name).includes(normalize(student.fullName))).slice(0, 5); return { name, values: row, match: exact ? { studentId: exact.id, studentName: exact.fullName, grade: exact.grade, classroom: exact.classroom, status: "MATCHED" } : candidates.length === 1 ? { studentId: candidates[0].id, studentName: candidates[0].fullName, grade: candidates[0].grade, classroom: candidates[0].classroom, status: "MATCHED" } : { studentId: null, studentName: name, status: candidates.length > 1 ? "AMBIGUOUS" : "UNMATCHED", candidates: candidates.map((candidate) => ({ id: candidate.id, name: candidate.fullName })) } }; });
    return NextResponse.json({ success: true, headers, nameHeader, rows: matched });
  } catch { return NextResponse.json({ success: false, error: "تعذر قراءة ملف النتائج." }, { status: 400 }); }
}
