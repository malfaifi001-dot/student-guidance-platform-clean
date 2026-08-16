import { notFound } from "next/navigation";
import { TimetableV3PrintController } from "@/components/timetable-v3/print-controller";
import { requireTimetablePageAccess } from "@/lib/timetable/timetable-access";
import { getTimetableV3PrintData } from "@/lib/timetable-v3/schedule-service";
import { filterTimetableV3ScheduleEntries } from "@/lib/timetable-v3/schedule-view";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  scheduleId?: string;
  mode?: string;
  teacherId?: string;
  print?: string;
}>;

const siteUrl = "https://teachix.sa";

export default async function TimetableV3PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: SearchParams;
}) {
  const access = await requireTimetablePageAccess();
  const { projectId } = await params;
  const query = await searchParams;
  if (!query.scheduleId || !["full", "teacher"].includes(query.mode ?? "full")) notFound();

  let data;
  try {
    data = await getTimetableV3PrintData(projectId, query.scheduleId, access.schoolAccountId);
  } catch (error) {
    if (error instanceof Error && ["PROJECT_NOT_FOUND", "SCHEDULE_NOT_FOUND"].includes(error.message)) notFound();
    throw error;
  }

  const mode = query.mode === "teacher" ? "teacher" : "full";
  const teacher = mode === "teacher" ? data.teachers.find((item) => item.id === query.teacherId) : null;
  if (mode === "teacher" && !teacher) notFound();
  const entries = teacher
    ? filterTimetableV3ScheduleEntries(data.entries, { mode: "teacher", teacherId: teacher.id })
    : filterTimetableV3ScheduleEntries(data.entries, { mode: "full" });
  const cell = (classId: string, dayId: string, periodId: string) =>
    entries.find((entry) => entry.classId === classId && entry.dayId === dayId && entry.periodId === periodId);
  const teacherCell = (dayId: string, periodId: string) =>
    entries.find((entry) => entry.dayId === dayId && entry.periodId === periodId);

  return (
      <main dir="rtl" className="print-document mx-auto bg-white p-6 text-slate-950">
        <style>{`
          @page { size: ${mode === "full" ? "A3 landscape" : "A4 landscape"}; margin: ${mode === "full" ? "5mm" : "12mm"}; }
          @media print {
            :root, html, body { margin: 0 !important; background: white !important; }
            .print-document { box-sizing: border-box; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 0 8mm !important; }
            .print-header { margin-bottom: 3mm !important; padding-bottom: 2.5mm !important; }
            .print-header h1 { font-size: 14pt !important; }
            .print-header .print-meta { font-size: 8pt !important; line-height: 1.35 !important; }
            .full-schedule { width: 100%; table-layout: fixed; font-size: 8pt; }
            .full-schedule th, .full-schedule td { box-sizing: border-box; overflow-wrap: anywhere; word-break: normal; padding: 1.2mm 0.8mm !important; }
            .full-schedule td { height: auto !important; }
            .print-section { break-after: page; page-break-after: always; }
            .print-section:last-of-type { break-after: auto; page-break-after: auto; }
            thead { display: table-header-group; }
            tr { break-inside: avoid; page-break-inside: avoid; }
            .print-footer { margin-top: 3mm !important; padding-top: 1.5mm !important; font-size: 8pt !important; }
          }
        `}</style>
        <TimetableV3PrintController enabled={query.print === "1"} />

        <header className="print-header mb-5 border-b-2 border-slate-900 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xl font-black">تيتش اكس</div>
              <div className="mt-1 text-sm font-bold">{data.project.schoolName}</div>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-black">{teacher ? data.project.name : "الجدول الدراسي الشامل"}</h1>
              <p className="mt-1 text-sm">{teacher ? `المعلم: ${teacher.name}` : data.project.name}</p>
            </div>
            <div className="print-meta text-left text-xs leading-6 text-slate-600">
              <div>النسخة {data.schedule.version}</div>
              <div>العام الدراسي: {data.project.academicYear}</div>
              <div>الفصل الدراسي: {data.project.semester}</div>
              <div>{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}</div>
            </div>
          </div>
        </header>

        {mode === "full" ? (
          <section className="print-section">
            <table className="full-schedule w-full table-fixed border-collapse text-[7px] leading-tight">
              <colgroup>
                <col style={{ width: "7%" }} />
                {data.days.flatMap((day) => data.periods.map((period) => (
                  <col key={`${day.id}-${period.id}`} />
                )))}
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-slate-600 bg-[#1E3A5F] px-1 py-2 font-black text-white">الفصل / الشعبة</th>
                  {data.days.map((day) => (
                    <th key={day.id} colSpan={data.periods.length} className="border border-slate-600 bg-[#1E3A5F] px-1 py-2 text-[8px] font-black text-white">
                      {day.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {data.days.flatMap((day) => data.periods.map((period) => (
                    <th key={`${day.id}-${period.id}`} className="border border-slate-500 bg-[#DCEAF3] px-0.5 py-1.5 font-bold text-[#1E3A5F]">
                      {period.label}
                    </th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {data.classes.map((classItem) => (
                  <tr key={classItem.id}>
                    <th className="border border-slate-500 bg-slate-100 px-1 py-2 text-[8px] font-black text-[#1E3A5F]">{classItem.name}</th>
                    {data.days.flatMap((day) => data.periods.map((period) => {
                      const entry = cell(classItem.id, day.id, period.id);
                      return (
                        <td key={`${day.id}-${period.id}`} className="h-11 border border-slate-300 px-0.5 py-1 text-center align-middle">
                          {entry ? (
                            <>
                              <div className="font-bold">{entry.subjectName}</div>
                              <div className="mt-0.5 text-[6.5px] text-slate-600">{entry.teacherName}</div>
                            </>
                          ) : "—"}
                        </td>
                      );
                    }))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <section className="print-section">
            {teacher?.specialty ? <p className="mb-3 text-sm text-slate-600">التخصص: {teacher.specialty}</p> : null}
            <table className="w-full table-fixed border-collapse text-xs">
              <thead><tr><th className="w-24 border border-slate-500 bg-slate-100 p-2">اليوم</th>{data.periods.map((period) => <th key={period.id} className="border border-slate-500 bg-slate-100 p-2">{period.label}</th>)}</tr></thead>
              <tbody>{data.days.map((day) => (
                <tr key={day.id}>
                  <th className="border border-slate-400 bg-slate-50 p-2">{day.label}</th>
                  {data.periods.map((period) => {
                    const entry = teacherCell(day.id, period.id);
                    return <td key={period.id} className="h-16 border border-slate-300 p-2 text-center">{entry ? <><div className="font-bold">{entry.subjectName}</div><div className="mt-1 text-slate-600">{entry.className}</div></> : "—"}</td>;
                  })}
                </tr>
              ))}</tbody>
            </table>
          </section>
        )}

        <footer className="print-footer mt-6 flex items-center justify-between border-t border-slate-300 pt-3 text-[10px] text-slate-500">
          <span>تم إنشاء الجدول بواسطة تيتش اكس</span>
          <span>{siteUrl}</span>
        </footer>
      </main>
  );
}
