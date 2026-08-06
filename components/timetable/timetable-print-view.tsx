"use client";

import { useEffect } from "react";

type Day = {
  id: string;
  label: string;
};

type Period = {
  id: string;
  label: string;
  startTime?: string;
  endTime?: string;
};

type Session = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  subjectName: string;
  dayId: string;
  periodId: string;
};

export function TimetablePrintView({
  project,
  mode,
  selectedId,
  shouldPrint,
}: {
  project: {
    name: string;
    academicYear: string;
    semester: string;
    status: string;
    days: Day[];
    periods: Period[];
    sessions: Session[];
  };
  mode: "class" | "teacher";
  selectedId: string;
  shouldPrint: boolean;
}) {
  useEffect(() => {
    if (!shouldPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [shouldPrint]);

  const selectedSession = project.sessions.find(
    (session) =>
      mode === "class"
        ? session.classId === selectedId
        : session.teacherId === selectedId,
  );

  const title =
    mode === "class"
      ? selectedSession?.className || "جدول الفصل"
      : selectedSession?.teacherName || "جدول المعلم";

  function findSession(
    dayId: string,
    periodId: string,
  ) {
    return project.sessions.find((session) => {
      if (
        session.dayId !== dayId ||
        session.periodId !== periodId
      ) {
        return false;
      }

      return mode === "class"
        ? session.classId === selectedId
        : session.teacherId === selectedId;
    });
  }

  return (
    <>
      <div className="print-toolbar">
        <button
          type="button"
          onClick={() => window.print()}
        >
          طباعة الجدول
        </button>

        <button
          type="button"
          onClick={() => window.close()}
        >
          إغلاق
        </button>
      </div>

      <main className="print-sheet" dir="rtl">
        <header className="document-header">
          <div>
            <p className="platform-name">
              منصة التوجيه الطلابي
            </p>

            <h1>{project.name}</h1>
          </div>

          <div className="document-meta">
            <p>
              العام الدراسي:{" "}
              <strong>{project.academicYear}</strong>
            </p>

            <p>
              الفصل الدراسي:{" "}
              <strong>{project.semester}</strong>
            </p>
          </div>
        </header>

        <section className="document-title">
          <h2>{title}</h2>

          <p>
            {mode === "class"
              ? "الجدول الأسبوعي للفصل"
              : "الجدول الأسبوعي للمعلم"}
          </p>
        </section>

        {!project.sessions.length ? (
          <div className="empty-state">
            لم يتم إنشاء جدول لهذا المشروع.
          </div>
        ) : !selectedSession ? (
          <div className="empty-state">
            لا توجد حصص للعنصر المحدد.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="period-column">
                  الحصة
                </th>

                {project.days.map((day) => (
                  <th key={day.id}>
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {project.periods.map((period) => (
                <tr key={period.id}>
                  <th className="period-cell">
                    <span>{period.label}</span>

                    {period.startTime &&
                    period.endTime ? (
                      <small>
                        {period.startTime} -{" "}
                        {period.endTime}
                      </small>
                    ) : null}
                  </th>

                  {project.days.map((day) => {
                    const session = findSession(
                      day.id,
                      period.id,
                    );

                    return (
                      <td
                        key={`${day.id}:${period.id}`}
                      >
                        {session ? (
                          <div className="lesson-card">
                            <strong>
                              {session.subjectName}
                            </strong>

                            <span>
                              {mode === "class"
                                ? session.teacherName
                                : session.className}
                            </span>
                          </div>
                        ) : (
                          <span className="empty-slot">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <footer>
          <span>
            الحالة: {statusLabel(project.status)}
          </span>

          <span>
            تاريخ الطباعة:{" "}
            {new Intl.DateTimeFormat("ar-SA", {
              dateStyle: "medium",
            }).format(new Date())}
          </span>
        </footer>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #eef2f7;
          color: #0f172a;
          font-family:
            Tahoma,
            Arial,
            sans-serif;
        }

        .print-toolbar {
          display: flex;
          justify-content: center;
          gap: 10px;
          padding: 16px;
        }

        .print-toolbar button {
          border: 0;
          border-radius: 10px;
          background: #0369a1;
          color: white;
          cursor: pointer;
          font-weight: 700;
          padding: 10px 18px;
        }

        .print-toolbar button:last-child {
          background: #475569;
        }

        .print-sheet {
          width: 297mm;
          min-height: 210mm;
          margin: 0 auto 24px;
          padding: 12mm;
          background: white;
          box-shadow: 0 8px 28px rgb(15 23 42 / 10%);
        }

        .document-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #0f6f91;
        }

        .platform-name {
          margin: 0 0 5px;
          color: #0369a1;
          font-size: 12px;
          font-weight: 700;
        }

        .document-header h1 {
          margin: 0;
          font-size: 22px;
        }

        .document-meta {
          font-size: 12px;
          line-height: 1.8;
        }

        .document-meta p {
          margin: 0;
        }

        .document-title {
          margin: 14px 0;
          text-align: center;
        }

        .document-title h2 {
          margin: 0;
          font-size: 20px;
        }

        .document-title p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
        }

        th,
        td {
          border: 1px solid #94a3b8;
          padding: 6px;
          text-align: center;
          vertical-align: middle;
        }

        thead th {
          background: #e0f2fe;
          color: #0c4a6e;
          font-size: 12px;
        }

        .period-column {
          width: 30mm;
        }

        .period-cell {
          background: #f8fafc;
        }

        .period-cell span,
        .period-cell small {
          display: block;
        }

        .period-cell small {
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
          direction: ltr;
        }

        .lesson-card {
          display: grid;
          min-height: 18mm;
          place-content: center;
          gap: 4px;
          border-radius: 6px;
          background: #f0f9ff;
          padding: 5px;
        }

        .lesson-card strong {
          color: #0c4a6e;
        }

        .lesson-card span {
          color: #475569;
          font-size: 10px;
        }

        .empty-slot {
          color: #cbd5e1;
        }

        .empty-state {
          margin: 30px 0;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          padding: 30px;
          color: #64748b;
          text-align: center;
        }

        footer {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #cbd5e1;
          color: #64748b;
          font-size: 10px;
        }

        @page {
          size: A4 landscape;
          margin: 7mm;
        }

        @media print {
          body {
            background: white;
          }

          .print-toolbar {
            display: none;
          }

          .print-sheet {
            width: auto;
            min-height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }

          thead {
            display: table-header-group;
          }

          tr,
          td,
          th,
          .lesson-card {
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}

function statusLabel(status: string) {
  if (status === "PUBLISHED") {
    return "منشور";
  }

  if (status === "APPROVED") {
    return "معتمد";
  }

  if (status === "GENERATED") {
    return "تم التوليد";
  }

  return "مسودة";
}