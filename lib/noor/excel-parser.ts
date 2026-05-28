import * as XLSX from "xlsx";

export type NoorStudentRow = {
  fullName: string;
  nationalId?: string;
  gender?: "MALE" | "FEMALE" | "UNKNOWN";
  stage?: string;
  grade?: string;
  classroom?: string;
  guardianName?: string;
  guardianPhone?: string;
};

const headerAliases = {
  fullName: ["اسم الطالب", "اسم الطالبة", "الاسم", "اسم الطالب/الطالبة"],
  nationalId: ["رقم الهوية", "السجل المدني", "هوية الطالب", "رقم هوية الطالب"],
  gender: ["الجنس", "النوع"],
  stage: ["المرحلة"],
  grade: ["الصف", "الصف الدراسي"],
  classroom: ["الفصل", "الشعبة"],
  guardianName: ["اسم ولي الأمر", "ولي الأمر", "اسم ولي الامر"],
  guardianPhone: ["جوال ولي الأمر", "رقم ولي الأمر", "رقم الجوال", "جوال ولي الامر"],
};

function normalize(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[ـ]/g, "")
    .trim();
}

function detectGender(value?: string): "MALE" | "FEMALE" | "UNKNOWN" {
  const v = normalize(value);
  if (v.includes("أنث") || v.includes("بنت") || v.includes("طالبة")) return "FEMALE";
  if (v.includes("ذكر") || v.includes("ولد") || v.includes("طالب")) return "MALE";
  return "UNKNOWN";
}

function findHeaderRow(rows: unknown[][]) {
  let bestIndex = 0;
  let bestScore = 0;

  rows.slice(0, 15).forEach((row, index) => {
    const normalizedRow = row.map(normalize);
    let score = 0;

    Object.values(headerAliases).forEach((aliases) => {
      if (aliases.some((alias) => normalizedRow.some((cell) => cell.includes(alias)))) {
        score++;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function mapHeaders(headers: string[]) {
  const map: Partial<Record<keyof NoorStudentRow, number>> = {};

  for (const [key, aliases] of Object.entries(headerAliases)) {
    const index = headers.findIndex((header) =>
      aliases.some((alias) => header.includes(alias))
    );

    if (index !== -1) {
      map[key as keyof NoorStudentRow] = index;
    }
  }

  return map;
}

export async function parseNoorExcel(buffer: ArrayBuffer): Promise<NoorStudentRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });

  const headerRowIndex = findHeaderRow(rows);
  const headers = rows[headerRowIndex].map(normalize);
  const headerMap = mapHeaders(headers);

  const dataRows = rows.slice(headerRowIndex + 1);

  return dataRows
    .map((row) => {
      const get = (key: keyof NoorStudentRow) => {
        const index = headerMap[key];
        if (index === undefined) return "";
        return normalize(row[index]);
      };

      return {
        fullName: get("fullName"),
        nationalId: get("nationalId"),
        gender: detectGender(get("gender")),
        stage: get("stage"),
        grade: get("grade"),
        classroom: get("classroom"),
        guardianName: get("guardianName"),
        guardianPhone: get("guardianPhone"),
      };
    })
    .filter((student) => student.fullName.length > 2);
}