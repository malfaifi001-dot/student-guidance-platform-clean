import type { PortfolioActivityPlanRow, PortfolioActivityTeamContent } from "@/lib/portfolio/service-outputs/service-output-types";

type TableRow = {
  id: string;
  cells: Record<string, string>;
  signatureUrl?: string;
};

type TableColumn = { key: string; label: string; width?: string };

export function PortfolioStructuredTable({
  className,
  columns,
  rows,
}: {
  className: string;
  columns: TableColumn[];
  rows: TableRow[];
}) {
  return (
    <div className="portfolio-structured-table-wrap" dir="rtl">
      <table className={className}>
        <colgroup>{columns.map((column) => <col key={column.key} style={column.width ? { width: column.width } : undefined} />)}</colgroup>
        <thead><tr>{columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.key === "signature" && row.signatureUrl ? <img src={row.signatureUrl} alt="توقيع المشرف" className="portfolio-structured-table-signature" /> : row.cells[column.key] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function activityPlanTableRows(rows: PortfolioActivityPlanRow[]) {
  return rows.map((row) => ({
    id: row.id,
    cells: {
      week: row.week,
      day: row.day,
      date: row.date,
      activityArea: row.activityArea,
      activity: row.activity,
      period: row.period,
      grade: row.grade,
      supervisor: row.supervisor,
    },
  }));
}

export function activityTeamTableRows(rows: PortfolioActivityTeamContent["rows"]) {
  return rows.map((row, index) => ({
    id: row.key,
    signatureUrl: row.signatureUrl,
    cells: { number: String(index + 1), field: row.label, supervisor: row.supervisor, signature: "" },
  }));
}
