import * as XLSX from "xlsx";
import {
  CERTIFICATE_RECIPIENT_TYPES,
  CERTIFICATE_TYPES,
} from "@/lib/certificates/certificate-types";

export type BulkCertificatePreviewRow = {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  recipientName: string;
  recipientType: string;
  grade: string;
  classroom: string;
  nationalId: string;
  certificateType: string;
  reason: string;
  issueDate: string;
  principalName: string;
  issuerName: string;
};

function normalizeArabic(value: unknown) {
  return String(value ?? "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function getCell(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && String(row[name]).trim()) {
      return String(row[name]).trim();
    }
  }

  const normalizedLookup = new Map<string, unknown>();

  Object.entries(row).forEach(([key, value]) => {
    normalizedLookup.set(normalizeArabic(key), value);
  });

  for (const name of names) {
    const value = normalizedLookup.get(normalizeArabic(name));

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function toIsoDate(value: string) {
  if (!value.trim()) {
    return new Date().toISOString().slice(0, 10);
  }

  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function mapRecipientType(value: string) {
  const normalized = normalizeArabic(value);

  const map: Record<string, string> = {
    "طالب": "student",
    "الطالبه": "student_female",
    "طالبه": "student_female",
    "معلم": "teacher",
    "المعلم": "teacher",
    "معلمه": "teacher_female",
    "ولي امر": "guardian",
    "ولي": "guardian",
    "اخرى": "other",
    "اخري": "other",
  };

  if (map[normalized]) {
    return map[normalized];
  }

  const direct = CERTIFICATE_RECIPIENT_TYPES.find((item) => {
    return normalizeArabic(item.label) === normalized || item.value === value;
  });

  return direct?.value || "student";
}

function mapCertificateType(value: string) {
  const normalized = normalizeArabic(value);

  const map: Record<string, string> = {
    "شكر وتقدير": "thanks",
    "شكر": "thanks",
    "مشاركه": "participation",
    "تميز": "excellence",
    "انجاز": "achievement",
    "تعاون": "cooperation",
  };

  if (map[normalized]) {
    return map[normalized];
  }

  const direct = CERTIFICATE_TYPES.find((item) => {
    return normalizeArabic(item.label) === normalized || item.value === value;
  });

  return direct?.value || "thanks";
}

export function parseBulkCertificatesExcel(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  return rows.map((row, index): BulkCertificatePreviewRow => {
    const recipientName = getCell(row, ["اسم المستفيد", "الاسم", "اسم الطالب", "اسم الطالبة"]);
    const recipientType = mapRecipientType(getCell(row, ["نوع المستفيد"]));
    const grade = getCell(row, ["الصف"]);
    const classroom = getCell(row, ["الفصل"]);
    const nationalId = getCell(row, ["رقم الهوية", "الهوية", "السجل المدني"]);
    const certificateType = mapCertificateType(getCell(row, ["نوع الشهادة"]));
    const reason = getCell(row, ["سبب التكريم", "السبب"]);
    const issueDate = toIsoDate(getCell(row, ["تاريخ الإصدار", "تاريخ الاصدار", "التاريخ"]));
    const principalName = getCell(row, ["اسم المدير", "مدير المدرسة"]);
    const issuerName = getCell(row, ["اسم المنفذ", "اسم الموجه", "اسم رائد النشاط"]);

    const errors: string[] = [];

    if (!recipientName) {
      errors.push("اسم المستفيد مطلوب.");
    }

    if (!reason) {
      errors.push("سبب التكريم مطلوب.");
    }

    return {
      rowNumber: index + 2,
      isValid: errors.length === 0,
      errors,
      recipientName,
      recipientType,
      grade,
      classroom,
      nationalId,
      certificateType,
      reason,
      issueDate,
      principalName,
      issuerName,
    };
  });
}