import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toArrayBuffer(value: ExcelJS.Buffer) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value as ArrayBuffer);

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "منصة التوجيه الطلابي";

  const sheet = workbook.addWorksheet("الشهادات");

  sheet.views = [{ rightToLeft: true }];

  sheet.columns = [
    { header: "اسم المستفيد", key: "recipientName", width: 28 },
    { header: "نوع المستفيد", key: "recipientType", width: 18 },
    { header: "الصف", key: "grade", width: 14 },
    { header: "الفصل", key: "classroom", width: 14 },
    { header: "رقم الهوية", key: "nationalId", width: 18 },
    { header: "نوع الشهادة", key: "certificateType", width: 18 },
    { header: "سبب التكريم", key: "reason", width: 42 },
    { header: "تاريخ الإصدار", key: "issueDate", width: 18 },
    { header: "اسم المدير", key: "principalName", width: 22 },
    { header: "اسم المنفذ", key: "issuerName", width: 22 },
  ];

  sheet.getRow(1).height = 24;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF075985" },
  };

  sheet.addRows([
    {
      recipientName: "محمد أحمد علي",
      recipientType: "طالب",
      grade: "الأول متوسط",
      classroom: "أ",
      nationalId: "",
      certificateType: "شكر وتقدير",
      reason: "المشاركة الفاعلة في أنشطة المدرسة",
      issueDate: new Date().toISOString().slice(0, 10),
      principalName: "",
      issuerName: "",
    },
    {
      recipientName: "سارة خالد محمد",
      recipientType: "طالبة",
      grade: "الثاني متوسط",
      classroom: "ب",
      nationalId: "",
      certificateType: "تميز",
      reason: "التميز في الانضباط والمبادرة",
      issueDate: new Date().toISOString().slice(0, 10),
      principalName: "",
      issuerName: "",
    },
  ]);

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  const guide = workbook.addWorksheet("الدليل");
  guide.views = [{ rightToLeft: true }];
  guide.columns = [
    { header: "الحقل", key: "field", width: 28 },
    { header: "القيم المقبولة", key: "values", width: 60 },
  ];

  guide.addRows([
    { field: "اسم المستفيد", values: "مطلوب" },
    { field: "سبب التكريم", values: "مطلوب" },
    { field: "نوع المستفيد", values: "طالب، طالبة، معلم، معلمة، ولي أمر، أخرى" },
    { field: "نوع الشهادة", values: "شكر وتقدير، مشاركة، تميز، إنجاز، تعاون" },
    { field: "تاريخ الإصدار", values: "اختياري، مثال: 2026-06-18" },
  ]);

  guide.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  guide.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF075985" },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = "نموذج-الشهادات-الجماعية.xlsx";

  return new NextResponse(toArrayBuffer(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}