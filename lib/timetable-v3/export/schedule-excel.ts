import ExcelJS from "exceljs";
import type { getTimetableV3PrintData } from "@/lib/timetable-v3/schedule-service";

type ExportData = Awaited<ReturnType<typeof getTimetableV3PrintData>>;
const SITE_URL = "https://teachix.sa";
const border: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCBD5E1" } },
  bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
  left: { style: "thin", color: { argb: "FFCBD5E1" } },
  right: { style: "thin", color: { argb: "FFCBD5E1" } },
};

function prepareSheet(sheet: ExcelJS.Worksheet, title: string, data: ExportData, width: number) {
  sheet.views = [{ rightToLeft: true, state: "frozen", ySplit: 5 }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.headerFooter.oddFooter = `&Rتم إنشاء الجدول بواسطة تيتش اكس&C${SITE_URL}`;
  sheet.mergeCells(1, 1, 1, width);
  sheet.getCell(1, 1).value = `تيتش اكس — ${title}`;
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: "FF1E3A5F" } };
  sheet.getCell(1, 1).alignment = { horizontal: "center" };
  sheet.mergeCells(2, 1, 2, width);
  sheet.getCell(2, 1).value = `${data.project.schoolName} — ${data.project.name}`;
  sheet.getCell(2, 1).font = { bold: true, size: 12 };
  sheet.getCell(2, 1).alignment = { horizontal: "center" };
  sheet.mergeCells(3, 1, 3, width);
  sheet.getCell(3, 1).value = `النسخة ${data.schedule.version} | ${data.project.academicYear} | ${data.project.semester} | ${new Intl.DateTimeFormat("ar-SA").format(new Date())}`;
  sheet.getCell(3, 1).alignment = { horizontal: "center" };
  sheet.getCell(3, 1).font = { size: 10, color: { argb: "FF64748B" } };
  sheet.getRow(1).height = 26;
  sheet.getRow(2).height = 22;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3478B8" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });
}

function styleBody(row: ExcelJS.Row) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });
}

export async function buildTimetableV3Workbook(data: ExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Teachix";
  workbook.created = new Date();
  workbook.modified = new Date();

  const full = workbook.addWorksheet("الجدول الكامل");
  const fullWidth = 1 + data.days.length * data.periods.length;
  full.views = [{ rightToLeft: true, showGridLines: false, state: "frozen", xSplit: 1, ySplit: 6 }];
  full.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.2, right: 0.2, top: 0.35, bottom: 0.45, header: 0.1, footer: 0.2 },
  };
  full.headerFooter.oddFooter = `&Rتم إنشاء الجدول بواسطة تيتش اكس&C${SITE_URL}`;

  full.mergeCells(1, 1, 1, fullWidth);
  full.getCell(1, 1).value = "الجدول الدراسي الشامل";
  full.getCell(1, 1).font = { bold: true, size: 18, color: { argb: "FF1E3A5F" } };
  full.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };

  full.mergeCells(2, 1, 2, fullWidth);
  full.getCell(2, 1).value = `${data.project.schoolName} — ${data.project.name}`;
  full.getCell(2, 1).font = { bold: true, size: 12, color: { argb: "FF334155" } };
  full.getCell(2, 1).alignment = { horizontal: "center", vertical: "middle" };

  full.mergeCells(3, 1, 3, fullWidth);
  full.getCell(3, 1).value = `العام الدراسي: ${data.project.academicYear} | الفصل الدراسي: ${data.project.semester} | النسخة: ${data.schedule.version}`;
  full.getCell(3, 1).font = { size: 10, color: { argb: "FF475569" } };
  full.getCell(3, 1).alignment = { horizontal: "center", vertical: "middle" };

  full.mergeCells(4, 1, 4, fullWidth);
  full.getCell(4, 1).value = `تاريخ التصدير: ${new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`;
  full.getCell(4, 1).font = { size: 9, color: { argb: "FF64748B" } };
  full.getCell(4, 1).alignment = { horizontal: "center", vertical: "middle" };
  full.getRow(1).height = 28;
  full.getRow(2).height = 22;
  full.getRow(3).height = 20;
  full.getRow(4).height = 20;

  full.mergeCells(5, 1, 6, 1);
  full.getCell(5, 1).value = "الفصل / الشعبة";
  full.getColumn(1).width = 18;

  let dayColumn = 2;
  for (const day of data.days) {
    const dayEnd = dayColumn + data.periods.length - 1;
    full.mergeCells(5, dayColumn, 5, dayEnd);
    full.getCell(5, dayColumn).value = day.label;
    data.periods.forEach((period, index) => {
      full.getCell(6, dayColumn + index).value = period.label;
    });
    dayColumn = dayEnd + 1;
  }

  const dayHeader = full.getRow(5);
  const periodHeader = full.getRow(6);
  dayHeader.height = 26;
  periodHeader.height = 30;
  dayHeader.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });
  periodHeader.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FF1E3A5F" }, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEAF3" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = border;
  });
  for (let column = 2; column <= fullWidth; column += 1) full.getColumn(column).width = 15;

  const entryBySlot = new Map(
    data.entries.map((entry) => [`${entry.classId}:${entry.dayId}:${entry.periodId}`, entry]),
  );
  for (const classItem of data.classes) {
    const row = full.addRow([
      classItem.name,
      ...data.days.flatMap((day) => data.periods.map((period) => {
        const entry = entryBySlot.get(`${classItem.id}:${day.id}:${period.id}`);
        return entry ? `${entry.subjectName}\n${entry.teacherName}` : "";
      })),
    ]);
    row.height = 44;
    styleBody(row);
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.font = columnNumber === 1
        ? { bold: true, size: 10, color: { argb: "FF1E3A5F" } }
        : { size: 9, color: { argb: "FF0F172A" } };
      if (columnNumber === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      }
    });
  }
  full.pageSetup.printTitlesRow = "5:6";

  const classes = workbook.addWorksheet("حسب الفصول");
  prepareSheet(classes, "الجداول حسب الفصول", data, 1 + data.periods.length);
  classes.getColumn(1).width = 16;
  for (let column = 2; column <= data.periods.length + 1; column += 1) classes.getColumn(column).width = 22;
  let classRow = 5;
  for (const classItem of data.classes) {
    classes.mergeCells(classRow, 1, classRow, data.periods.length + 1);
    classes.getCell(classRow, 1).value = `الفصل: ${classItem.name}`;
    classes.getCell(classRow, 1).font = { bold: true, size: 12, color: { argb: "FF1E3A5F" } };
    classRow += 1;
    const header = classes.getRow(classRow);
    header.values = ["اليوم", ...data.periods.map((period) => period.label)];
    styleHeader(header);
    classRow += 1;
    for (const day of data.days) {
      const row = classes.getRow(classRow++);
      row.values = [day.label, ...data.periods.map((period) => {
        const entry = data.entries.find((item) => item.classId === classItem.id && item.dayId === day.id && item.periodId === period.id);
        return entry ? `${entry.subjectName}\n${entry.teacherName}` : "";
      })];
      row.height = 34;
      styleBody(row);
      row.getCell(1).font = { bold: true };
    }
    classRow += 2;
  }

  const teachers = workbook.addWorksheet("حسب المعلمين");
  prepareSheet(teachers, "الجداول حسب المعلمين", data, 5);
  [18, 18, 15, 24, 18].forEach((width, index) => { teachers.getColumn(index + 1).width = width; });
  let teacherRow = 5;
  for (const teacher of data.teachers) {
    teachers.mergeCells(teacherRow, 1, teacherRow, 5);
    teachers.getCell(teacherRow, 1).value = `المعلم: ${teacher.name}${teacher.specialty ? ` — ${teacher.specialty}` : ""}`;
    teachers.getCell(teacherRow, 1).font = { bold: true, size: 12, color: { argb: "FF1E3A5F" } };
    teacherRow += 1;
    const header = teachers.getRow(teacherRow++);
    header.values = ["اليوم", "الحصة", "الترتيب", "المادة", "الفصل"];
    styleHeader(header);
    const entries = data.entries.filter((entry) => entry.teacherId === teacher.id).sort((a, b) => {
      const dayDifference = data.days.findIndex((day) => day.id === a.dayId) - data.days.findIndex((day) => day.id === b.dayId);
      return dayDifference || a.periodOrder - b.periodOrder;
    });
    for (const entry of entries) {
      const row = teachers.getRow(teacherRow++);
      row.values = [entry.dayLabel, entry.periodLabel, entry.periodOrder, entry.subjectName, entry.className];
      row.height = 24;
      styleBody(row);
    }
    teacherRow += 2;
  }

  return workbook;
}
