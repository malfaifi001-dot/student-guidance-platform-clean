import type { PortfolioReportTable } from "@/lib/portfolio/portfolio-report-content";

export function PortfolioReportTable({ table }: { table: PortfolioReportTable }) {
  return (
    <section className="portfolio-report-table-section" dir="rtl">
      <h2>{table.title}</h2>
      <table className="portfolio-report-table">
        <colgroup>
          {table.columns.map((column) => (
            <col key={column.key} style={column.width ? { width: `${column.width}%` } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {table.columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id}>
              {table.columns.map((column) => <td key={`${row.id}-${column.key}`}>{row.cells[column.key] || ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        .portfolio-report-table-section{break-inside:avoid;page-break-inside:avoid}
        .portfolio-report-table-section h2{margin:0 0 3mm;font-size:12px}
        .portfolio-report-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px;line-height:1.55}
        .portfolio-report-table thead{display:table-header-group}
        .portfolio-report-table tr{break-inside:avoid;page-break-inside:avoid}
        .portfolio-report-table th,.portfolio-report-table td{border:1px solid #cfd6dc;padding:1.8mm 1.7mm;text-align:right;vertical-align:top;overflow-wrap:anywhere;white-space:pre-wrap}
        .portfolio-report-table th{background:#edf2f5;font-weight:800}
      `}</style>
    </section>
  );
}
