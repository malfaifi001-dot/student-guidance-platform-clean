import type {
  EvidenceLayout,
  OfficialReportData,
  ReportEvidence,
  ReportIdentity,
} from "@/lib/report-engine/report-types";
import { officialSaudiSchoolReportTheme as theme } from "@/lib/report-engine/report-theme";

type Props = {
  identity: ReportIdentity;
  report: OfficialReportData;
};

export function OfficialReportDocument({ identity, report }: Props) {
  return (
    <main
      dir="rtl"
      className="report-root"
      style={{
        fontFamily: theme.typography.fontFamily,
      }}
    >
      <ReportStyles />

      <section className="report-page cover-page">
        <ReportHeader identity={identity} />

        <div className="cover-body">
          <div className="cover-badge">{report.serviceName}</div>

          <h1>{report.title}</h1>

          {report.subtitle ? <h2>{report.subtitle}</h2> : null}

          <div className="cover-card">
            <InfoRow label="عنوان البرنامج" value={report.cover.programTitle} />
            <InfoRow label="تاريخ التنفيذ" value={report.cover.executionDate} />
            <InfoRow label="العام الدراسي" value={report.cover.schoolYear} />
            <InfoRow label="الفصل الدراسي" value={report.cover.semester} />
            <InfoRow label="الفئة المستهدفة" value={report.targetGroup || "غير محدد"} />
            <InfoRow label="المعد" value={identity.counselorName} />
          </div>
        </div>

        <ReportFooter identity={identity} />
      </section>

      <section className="report-page">
        <ReportHeader identity={identity} />

        <div className="content">
          <SectionTitle title="بيانات التقرير" />

          <div className="meta-grid">
            <InfoRow label="اسم المدرسة" value={identity.schoolName} />
            <InfoRow label="مكتب التعليم" value={identity.educationOffice} />
            <InfoRow label="إدارة التعليم" value={identity.educationDepartment} />
            <InfoRow label="اسم الموجه/الموجهة" value={identity.counselorName} />
            <InfoRow label="الصفة" value={identity.counselorTitle} />
            <InfoRow label="تاريخ التقرير" value={report.reportDate} />
          </div>

          {report.sections.map((section) => (
            <section key={section.id} className="report-section">
              <SectionTitle title={section.title} />

              {section.content ? (
                <p className="section-text">{section.content}</p>
              ) : null}

              {section.items?.length ? (
                <div className="section-items">
                  {section.items.map((item, index) => (
                    <InfoRow
                      key={`${item.label}-${index}`}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ))}

          <EvidenceSection
            evidences={report.evidences}
            layout={report.evidenceLayout}
          />

          <ApprovalBlock
            counselorName={report.approval.counselorName}
            principalName={report.approval.principalName}
            date={report.approval.date}
          />
        </div>

        <ReportFooter identity={identity} />
      </section>
    </main>
  );
}

function ReportHeader({ identity }: { identity: ReportIdentity }) {
  return (
    <header className="report-header">
      <div className="header-accent" />

      <div className="header-main">
        <div className="header-logo ministry-logo">
          <img src={identity.ministryLogoUrl} alt="شعار وزارة التعليم" />
        </div>

        <div className="header-text">
          <strong>{identity.ministryName}</strong>
          <span>{identity.educationDepartment}</span>
          <span>{identity.educationOffice}</span>
          <b>{identity.schoolName}</b>
        </div>

        <div className="header-logo school-logo">
          {identity.schoolLogoUrl ? (
            <img src={identity.schoolLogoUrl} alt="شعار المدرسة" />
          ) : (
            <span>شعار المدرسة</span>
          )}
        </div>
      </div>
    </header>
  );
}

function ReportFooter({ identity }: { identity: ReportIdentity }) {
  return (
    <footer className="report-footer">
      <div className="footer-line" />

      <div className="footer-content">
        <span>{identity.schoolName}</span>
        <span>{identity.academicYear} - {identity.semester}</span>
        <span className="page-number">صفحة</span>
      </div>
    </footer>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="section-title">
      <span />
      <h3>{title}</h3>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EvidenceSection({
  evidences,
  layout,
}: {
  evidences: ReportEvidence[];
  layout: EvidenceLayout;
}) {
  if (!evidences.length) return null;

  const className =
    layout === "single-large"
      ? "evidence-list single-large"
      : layout === "stacked"
        ? "evidence-list stacked"
        : layout === "grid-2x2"
          ? "evidence-list grid-2x2"
          : layout === "one-per-page"
            ? "evidence-list one-per-page"
            : "evidence-list two-columns";

  return (
    <section className="report-section evidence-section">
      <SectionTitle title="الشواهد والمرفقات" />

      <div className={className}>
        {evidences.map((evidence) => (
          <EvidenceCard key={evidence.id} evidence={evidence} />
        ))}
      </div>
    </section>
  );
}

function EvidenceCard({ evidence }: { evidence: ReportEvidence }) {
  return (
    <article className="evidence-card">
      <div className="evidence-frame">
        {evidence.imageUrl ? (
          <img src={evidence.imageUrl} alt={evidence.title || "شاهد"} />
        ) : (
          <div className="evidence-placeholder">
            {evidence.fileName || "مرفق"}
          </div>
        )}
      </div>

      {(evidence.title || evidence.description) && (
        <div className="evidence-caption">
          {evidence.title ? <strong>{evidence.title}</strong> : null}
          {evidence.description ? <p>{evidence.description}</p> : null}
        </div>
      )}
    </article>
  );
}

function ApprovalBlock({
  counselorName,
  principalName,
  date,
}: {
  counselorName: string;
  principalName?: string;
  date: string;
}) {
  return (
    <section className="approval-block">
      <div>
        <span>الموجه/الموجهة الطلابية</span>
        <strong>{counselorName}</strong>
        <em>التوقيع: ....................</em>
      </div>

      <div>
        <span>قائد/قائدة المدرسة</span>
        <strong>{principalName || "...................."}</strong>
        <em>الختم: ....................</em>
      </div>

      <div>
        <span>التاريخ</span>
        <strong>{date}</strong>
      </div>
    </section>
  );
}

function ReportStyles() {
  return (
    <style>{`
      .report-root {
        background: #f3f5f4;
        color: ${theme.colors.text};
        padding: 24px;
      }

      .report-page {
        width: ${theme.page.width};
        min-height: ${theme.page.minHeight};
        margin: 0 auto 24px;
        padding: ${theme.page.padding};
        background: ${theme.colors.background};
        position: relative;
        box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12);
        overflow: hidden;
        page-break-after: always;
      }

      .report-page::before {
        content: "";
        position: absolute;
        inset-inline-start: -80px;
        top: -80px;
        width: 220px;
        height: 220px;
        border-radius: 999px;
        background: ${theme.colors.softGreen};
        z-index: 0;
      }

      .report-header,
      .content,
      .cover-body,
      .report-footer {
        position: relative;
        z-index: 1;
      }

      .report-header {
        margin-bottom: 28px;
      }

      .header-accent {
        height: 8px;
        border-radius: 999px;
        background: linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.accent});
        margin-bottom: 8px;
      }

      .header-main {
        min-height: 92px;
        border: 1px solid ${theme.colors.border};
        border-radius: 22px;
        background:
          linear-gradient(135deg, rgba(15, 81, 50, 0.08), rgba(255,255,255,1)),
          #fff;
        display: grid;
        grid-template-columns: 110px 1fr 110px;
        align-items: center;
        gap: 16px;
        padding: 14px 18px;
      }

      .header-logo {
        width: 86px;
        height: 66px;
        border-radius: 18px;
        background: #fff;
        border: 1px solid ${theme.colors.border};
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        color: ${theme.colors.muted};
        font-size: 11px;
        text-align: center;
      }

      .header-logo img {
        max-width: 78px;
        max-height: 58px;
        object-fit: contain;
      }

      .header-text {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 4px;
        line-height: 1.5;
      }

      .header-text strong {
        color: ${theme.colors.primary};
        font-size: 18px;
      }

      .header-text span {
        color: ${theme.colors.muted};
        font-size: 13px;
      }

      .header-text b {
        color: ${theme.colors.text};
        font-size: 15px;
      }

      .cover-page {
        display: flex;
        flex-direction: column;
      }

      .cover-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .cover-badge {
        padding: 8px 18px;
        border-radius: 999px;
        background: ${theme.colors.softGreen};
        color: ${theme.colors.primary};
        border: 1px solid ${theme.colors.border};
        font-weight: 700;
        margin-bottom: 18px;
      }

      .cover-body h1 {
        margin: 0;
        font-size: 34px;
        color: ${theme.colors.primary};
        text-align: center;
      }

      .cover-body h2 {
        margin: 14px 0 26px;
        font-size: 22px;
        color: ${theme.colors.text};
        text-align: center;
        font-weight: 700;
      }

      .cover-card {
        width: 80%;
        border-radius: 24px;
        border: 1px solid ${theme.colors.border};
        background: #fff;
        padding: 22px;
        display: grid;
        gap: 10px;
      }

      .content {
        padding-bottom: 38px;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 26px;
      }

      .info-row {
        border: 1px solid ${theme.colors.border};
        background: #fff;
        border-radius: 14px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        break-inside: avoid;
      }

      .info-row span {
        color: ${theme.colors.muted};
        font-size: 12px;
        white-space: nowrap;
      }

      .info-row strong {
        color: ${theme.colors.text};
        font-size: 13px;
        text-align: left;
      }

      .report-section {
        margin-top: 22px;
        break-inside: avoid;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }

      .section-title span {
        width: 8px;
        height: 28px;
        border-radius: 999px;
        background: ${theme.colors.primary};
      }

      .section-title h3 {
        margin: 0;
        color: ${theme.colors.primary};
        font-size: 19px;
      }

      .section-text {
        margin: 0;
        border: 1px solid ${theme.colors.border};
        border-radius: 18px;
        padding: 16px 18px;
        line-height: 2;
        font-size: 15px;
        text-align: justify;
        background: #fff;
      }

      .section-items {
        display: grid;
        gap: 10px;
      }

      .evidence-section {
        break-inside: auto;
      }

      .evidence-list {
        display: grid;
        gap: 14px;
      }

      .evidence-list.two-columns {
        grid-template-columns: 1fr 1fr;
      }

      .evidence-list.grid-2x2 {
        grid-template-columns: 1fr 1fr;
      }

      .evidence-list.stacked,
      .evidence-list.single-large,
      .evidence-list.one-per-page {
        grid-template-columns: 1fr;
      }

      .evidence-list.one-per-page .evidence-card {
        page-break-after: always;
      }

      .evidence-card {
        border: 1px solid ${theme.colors.border};
        border-radius: 20px;
        padding: 10px;
        background: #fff;
        break-inside: avoid;
      }

      .evidence-frame {
        min-height: 180px;
        border-radius: 16px;
        border: 1px dashed ${theme.colors.border};
        background: #f8faf9;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }

      .single-large .evidence-frame {
        min-height: 360px;
      }

      .stacked .evidence-frame {
        min-height: 280px;
      }

      .evidence-frame img {
        width: 100%;
        height: 100%;
        max-height: 360px;
        object-fit: contain;
        display: block;
      }

      .evidence-placeholder {
        color: ${theme.colors.muted};
        font-weight: 700;
      }

      .evidence-caption {
        padding: 10px 4px 2px;
      }

      .evidence-caption strong {
        display: block;
        color: ${theme.colors.primary};
        font-size: 14px;
        margin-bottom: 4px;
      }

      .evidence-caption p {
        margin: 0;
        color: ${theme.colors.muted};
        font-size: 12px;
        line-height: 1.7;
      }

      .approval-block {
        margin-top: 34px;
        border: 1px solid ${theme.colors.border};
        border-radius: 20px;
        padding: 18px;
        display: grid;
        grid-template-columns: 1fr 1fr 0.8fr;
        gap: 14px;
        background: ${theme.colors.softGreen};
        break-inside: avoid;
      }

      .approval-block div {
        background: #fff;
        border-radius: 16px;
        padding: 14px;
        border: 1px solid ${theme.colors.border};
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .approval-block span {
        color: ${theme.colors.muted};
        font-size: 12px;
      }

      .approval-block strong {
        color: ${theme.colors.text};
        font-size: 14px;
      }

      .approval-block em {
        color: ${theme.colors.muted};
        font-size: 12px;
        font-style: normal;
      }

      .report-footer {
        position: absolute;
        right: 18mm;
        left: 18mm;
        bottom: 12mm;
      }

      .footer-line {
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.primary});
        margin-bottom: 8px;
      }

      .footer-content {
        display: flex;
        justify-content: space-between;
        color: ${theme.colors.muted};
        font-size: 11px;
      }

      @media print {
        body {
          margin: 0;
          background: #fff;
        }

        .report-root {
          padding: 0;
          background: #fff;
        }

        .report-page {
          margin: 0;
          box-shadow: none;
          width: 210mm;
          min-height: 297mm;
        }

        @page {
          size: A4;
          margin: 0;
        }
      }
    `}</style>
  );
}