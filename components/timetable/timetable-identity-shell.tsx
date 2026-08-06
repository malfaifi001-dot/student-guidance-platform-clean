import type { ReactNode } from "react";

export function TimetableIdentityShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div dir="rtl" className="timetable-service-shell space-y-5">
      {children}

      <style>{`
        .timetable-service-shell *,
        .timetable-service-shell *::before,
        .timetable-service-shell *::after {
          box-sizing: border-box;
        }

        .timetable-service-shell input,
        .timetable-service-shell select,
        .timetable-service-shell textarea {
          border-color: #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
        }

        .timetable-service-shell input:focus,
        .timetable-service-shell select:focus,
        .timetable-service-shell textarea:focus {
          border-color: #38bdf8;
          background: #ffffff;
          outline: none;
          box-shadow: 0 0 0 4px #f0f9ff;
        }

        .timetable-service-shell table {
          background: #ffffff;
        }

        .timetable-service-shell thead th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 900;
        }

        .timetable-service-shell th,
        .timetable-service-shell td {
          border-color: #e2e8f0;
        }

        .timetable-service-shell tbody tr {
          transition: background-color 150ms ease;
        }

        .timetable-service-shell tbody tr:hover {
          background: #f8fafc;
        }

        .timetable-service-shell button,
        .timetable-service-shell a {
          transition:
            background-color 150ms ease,
            border-color 150ms ease,
            color 150ms ease,
            box-shadow 150ms ease;
        }
      `}</style>
    </div>
  );
}
