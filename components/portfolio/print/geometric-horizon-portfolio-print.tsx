import type { CSSProperties, ReactNode } from "react";

import {
  buildPortfolioReportPages,
  getPortfolioEvidenceImageHeightMm,
  getPortfolioEvidencePerPage,
} from "@/components/portfolio/print/portfolio-print-pagination";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { PortfolioCoverOfficialLogos } from "@/components/portfolio/print/portfolio-cover-official-logos";
import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";

const HORIZON = {
  indigo: "#25316D",
  violet: "#6C5CE7",
  amber: "#F4B942",
  mint: "#2CB67D",
  coral: "#EF6F6C",
  ink: "#1F2937",
  muted: "#6B7280",
  paper: "#FCFBF8",
  soft: "#F4F2ED",
  line: "#E2E0DA",
  white: "#FFFFFF",
} as const;

function HorizonPageNumber() {
  return <span className="hzn-page-number" aria-label="رقم الصفحة" />;
}

function HorizonPage({
  children,
  sectionLabel,
  className = "",
  style,
  code = "00",
}: {
  children: ReactNode;
  sectionLabel: string;
  className?: string;
  style?: CSSProperties;
  code?: string;
}) {
  return (
    <section
      className={`hzn-page ${className}`}
      style={style}
      data-page-label={sectionLabel}
    >
      <div className="hzn-corner-code" aria-hidden="true">
        <span>{code}</span>
      </div>

      <header className="hzn-header">
        <span className="hzn-header-brand">ملف الإنجاز</span>
        <span>{sectionLabel}</span>
      </header>

      <main className="hzn-body">{children}</main>

      <footer className="hzn-footer">
        <span>منصة التوجيه الطلابي</span>
        <span>{sectionLabel}</span>
        <HorizonPageNumber />
      </footer>
    </section>
  );
}

function HorizonHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="hzn-heading">
      {eyebrow ? <span className="hzn-eyebrow">{eyebrow}</span> : null}
      <div className="hzn-heading-row">
        <i aria-hidden="true" />
        <h2>{title}</h2>
      </div>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

function renderValue(value: string | string[]) {
  if (Array.isArray(value)) {
    return (
      <ul className="hzn-value-list">
        {value.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  return value || "غير محدد";
}

function HorizonReportPages({ report }: { report: PortfolioReportContent }) {
  const pages = buildPortfolioReportPages(report);
  const evidenceHeightMm = getPortfolioEvidenceImageHeightMm(report);
  const evidenceColumns =
    getPortfolioEvidencePerPage(report) <= 1
      ? "minmax(0, 1fr)"
      : "repeat(2, minmax(0, 1fr))";

  return (
    <>
      {pages.map((page, pageIndex) => (
        <HorizonPage
          key={page.key}
          sectionLabel={report.serviceName || "التقرير"}
          code={String(pageIndex + 1).padStart(2, "0")}
        >
          <header className="hzn-report-title">
            <span>{report.serviceName || report.subtitle || "تقرير"}</span>
            <h1>{report.title}</h1>
            <small>
              صفحة {pageIndex + 1} من {pages.length}
            </small>
          </header>

          <div className="hzn-report-sections">
            {page.sections.map((section, sectionIndex) => {
              if (section.kind === "details") {
                if (!section.fields.length) return null;

                return (
                  <section
                    key={`details-${page.key}-${sectionIndex}`}
                    className="hzn-report-section"
                  >
                    <h2>التفاصيل</h2>

                    <div className="hzn-detail-grid">
                      {section.fields.map((field, fieldIndex) => {
                        const serialized = Array.isArray(field.value)
                          ? field.value.join(" ")
                          : String(field.value);

                        const wide =
                          serialized.length > 150 ||
                          (!Array.isArray(field.value) &&
                            serialized.includes("\n"));

                        return (
                          <article
                            key={`${field.key}-${field.label}`}
                            className={[
                              "hzn-detail-card",
                              wide ? "hzn-detail-card-wide" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <span className="hzn-detail-number">
                              {String(fieldIndex + 1).padStart(2, "0")}
                            </span>

                            <div className="hzn-detail-content">
                              <small>{field.label}</small>
                              <strong>{renderValue(field.value)}</strong>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              }

              if (section.kind === "narrative") {
                if (!section.body.trim()) return null;

                return (
                  <section
                    key={`narrative-${page.key}-${sectionIndex}`}
                    className="hzn-report-section"
                  >
                    <h2>وصف التنفيذ</h2>
                    <p className="hzn-narrative">{section.body}</p>
                  </section>
                );
              }

              if (!section.items.length) return null;

              return (
                <section
                  key={`evidence-${page.key}-${sectionIndex}`}
                  className="hzn-report-section"
                >
                  <h2>الشواهد والمرفقات</h2>
                  <div
                    className="hzn-evidence-grid"
                    style={{ gridTemplateColumns: evidenceColumns }}
                  >
                    {section.items.map((item) => {
                      const isImage =
                        item.type === "IMAGE" ||
                        Boolean(
                          item.url &&
                            /\.(png|jpe?g|webp|gif|svg)$/i.test(item.url),
                        );

                      if (!item.url) return null;

                      if (!isImage) {
                        return (
                          <a
                            key={item.id}
                            className="hzn-file"
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            فتح الملف المرفق
                          </a>
                        );
                      }

                      return (
                        <figure key={item.id} className="hzn-evidence">
                          <img
                            src={item.url}
                            alt={item.title?.trim() || "صورة مرفقة"}
                            style={{
                              height: `${evidenceHeightMm}mm`,
                              objectFit: report.evidenceSettings.fit,
                            }}
                          />
                        </figure>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </HorizonPage>
      ))}
    </>
  );
}

export function GeometricHorizonPortfolioPrint({
  data,
}: {
  data: PortfolioPrintData;
}) {
  const enabledSections = data.performanceSections
    .filter((section) => section.isEnabled)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  const sectionByKey = new Map(
    data.sections.map((section) => [section.key, section]),
  );

  const sectionEnabled = (key: string) =>
    sectionByKey.get(key)?.isEnabled !== false;

  const sectionOrder = (key: string) =>
    sectionByKey.get(key)?.sortOrder ?? 0;

  const qualifications = data.qualificationItems
    .filter((item) => item.isVisible)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  return (
    <div
      className="hzn-root"
      dir="rtl"
      style={
        {
          "--hzn-indigo": HORIZON.indigo,
          "--hzn-violet": HORIZON.violet,
          "--hzn-amber": HORIZON.amber,
          "--hzn-mint": HORIZON.mint,
          "--hzn-coral": HORIZON.coral,
          "--hzn-ink": HORIZON.ink,
          "--hzn-muted": HORIZON.muted,
          "--hzn-paper": HORIZON.paper,
          "--hzn-soft": HORIZON.soft,
          "--hzn-line": HORIZON.line,
          "--hzn-white": HORIZON.white,
        } as CSSProperties
      }
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .hzn-root {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            background: #ffffff !important;
          }

          .hzn-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }

          .hzn-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }

        .hzn-root {
          counter-reset: hzn-page;
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          gap: 24px;
          padding: 24px 0;
          background: #e9ebef;
          color: var(--hzn-ink);
          font-family: "Cairo", "Tahoma", "Arial", sans-serif;
        }

        .hzn-page {
          counter-increment: hzn-page;
          position: relative;
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          overflow: hidden;
          background: var(--hzn-paper);
          box-shadow: 0 22px 70px rgba(37, 49, 109, 0.15);
        }

        .hzn-page::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 6mm;
          background:
            linear-gradient(
              90deg,
              var(--hzn-violet) 0 38%,
              var(--hzn-amber) 38% 56%,
              var(--hzn-mint) 56% 100%
            );
        }

        .hzn-corner-code {
          position: absolute;
          top: 15mm;
          left: 15mm;
          display: grid;
          width: 16mm;
          height: 16mm;
          place-items: center;
          border-radius: 4mm;
          background: var(--hzn-indigo);
          color: #ffffff;
          transform: rotate(8deg);
        }

        .hzn-corner-code span {
          transform: rotate(-8deg);
          font-size: 9px;
          font-weight: 900;
        }

        .hzn-header {
          position: absolute;
          top: 14mm;
          right: 17mm;
          left: 39mm;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--hzn-muted);
          font-size: 9px;
          font-weight: 700;
        }

        .hzn-header-brand {
          color: var(--hzn-indigo);
          font-weight: 900;
        }

        .hzn-body {
          height: 100%;
          padding: 34mm 18mm 25mm;
          overflow: hidden;
        }

        .hzn-footer {
          position: absolute;
          right: 18mm;
          bottom: 8mm;
          left: 18mm;
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 7mm;
          color: var(--hzn-muted);
          font-size: 8px;
          font-weight: 700;
        }

        .hzn-footer::before {
          content: "";
          position: absolute;
          top: -3mm;
          right: 0;
          left: 0;
          height: 1px;
          background:
            linear-gradient(
              90deg,
              var(--hzn-violet),
              var(--hzn-amber),
              var(--hzn-mint)
            );
        }

        .hzn-page-number::before {
          content: counter(hzn-page, decimal-leading-zero);
          color: var(--hzn-indigo);
          font-weight: 900;
        }

        .hzn-heading {
          margin-bottom: 7mm;
        }

        .hzn-eyebrow {
          display: block;
          margin-bottom: 1.5mm;
          color: var(--hzn-coral);
          font-size: 9px;
          font-weight: 900;
        }

        .hzn-heading-row {
          display: flex;
          align-items: center;
          gap: 3mm;
        }

        .hzn-heading-row i {
          display: block;
          width: 1.3mm;
          height: 11mm;
          border-radius: 999px;
          background: var(--hzn-violet);
        }

        .hzn-heading h2 {
          margin: 0;
          color: var(--hzn-indigo);
          font-size: 30px;
          font-weight: 900;
          line-height: 1.25;
        }

        .hzn-heading p {
          max-width: 152mm;
          margin: 3mm 0 0;
          color: var(--hzn-muted);
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1.8;
        }

        .hzn-cover {
          background:
            linear-gradient(
              140deg,
              #1f2755 0%,
              var(--hzn-indigo) 55%,
              var(--hzn-violet) 100%
            );
          color: #ffffff;
        }

        .hzn-cover::before {
          height: 8mm;
          background:
            linear-gradient(
              90deg,
              var(--hzn-amber) 0 34%,
              var(--hzn-mint) 34% 67%,
              var(--hzn-coral) 67% 100%
            );
        }

        .hzn-cover .hzn-header,
        .hzn-cover .hzn-corner-code {
          display: none;
        }

        .hzn-cover .hzn-body {
          display: grid;
          align-content: center;
          padding: 26mm 24mm;
        }

        .hzn-cover-grid {
          position: absolute;
          inset: 24mm 20mm auto auto;
          display: grid;
          grid-template-columns: repeat(4, 12mm);
          gap: 3mm;
          opacity: 0.22;
        }

        .hzn-cover-grid span {
          width: 12mm;
          height: 12mm;
          border: 1px solid rgba(255,255,255,.6);
          border-radius: 3mm;
          transform: rotate(12deg);
        }

        .hzn-cover-content {
          position: relative;
          z-index: 2;
          max-width: 148mm;
        }

        .hzn-cover-kicker {
          color: var(--hzn-amber);
          font-size: 14px;
          font-weight: 900;
        }

        .hzn-cover h1 {
          margin: 4mm 0 0;
          color: #ffffff;
          font-size: 44px;
          font-weight: 900;
          line-height: 1.35;
        }

        .hzn-cover-subtitle {
          margin: 4mm 0 0;
          color: rgba(255,255,255,.82);
          font-size: 17px;
          font-weight: 700;
        }

        .hzn-cover-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5mm 12mm;
          margin-top: 17mm;
          border-top: 1px solid rgba(255,255,255,.28);
          padding-top: 7mm;
        }

        .hzn-cover-meta span {
          display: block;
          color: rgba(255,255,255,.62);
          font-size: 8px;
          font-weight: 700;
        }

        .hzn-cover-meta strong {
          display: block;
          margin-top: 1mm;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
        }

        .hzn-cover .hzn-footer {
          color: rgba(255,255,255,.72);
        }

        .hzn-cover .hzn-footer::before {
          background: rgba(255,255,255,.28);
        }

        .hzn-cover .hzn-page-number::before {
          color: #ffffff;
        }

        .hzn-index {
          display: grid;
          gap: 3mm;
        }

        .hzn-index-item {
          display: grid;
          grid-template-columns: 15mm minmax(0, 1fr) auto;
          min-height: 15mm;
          align-items: center;
          border-radius: 3mm;
          padding: 2.5mm 3mm;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px var(--hzn-line);
        }

        .hzn-index-item:nth-child(3n + 1) {
          border-inline-start: 1.5mm solid var(--hzn-violet);
        }

        .hzn-index-item:nth-child(3n + 2) {
          border-inline-start: 1.5mm solid var(--hzn-mint);
        }

        .hzn-index-item:nth-child(3n + 3) {
          border-inline-start: 1.5mm solid var(--hzn-amber);
        }

        .hzn-index-item span {
          color: var(--hzn-violet);
          font-size: 9px;
          font-weight: 900;
        }

        .hzn-index-item strong {
          color: var(--hzn-ink);
          font-size: 10px;
          font-weight: 800;
        }

        .hzn-index-item small {
          color: var(--hzn-muted);
          font-size: 7px;
        }

        .hzn-intro-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4mm;
        }

        .hzn-intro-card {
          position: relative;
          min-height: 38mm;
          overflow: hidden;
          border-radius: 4mm;
          padding: 5mm;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px var(--hzn-line);
        }

        .hzn-intro-card::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 1.2mm;
          background: var(--hzn-violet);
        }

        .hzn-intro-card-mint::before {
          background: var(--hzn-mint);
        }

        .hzn-intro-card small {
          color: var(--hzn-muted);
          font-size: 8px;
        }

        .hzn-intro-card h3 {
          margin: 0.5mm 0 0;
          color: var(--hzn-indigo);
          font-size: 16px;
          font-weight: 900;
        }

        .hzn-intro-card p {
          margin: 2.5mm 0 0;
          color: var(--hzn-ink);
          font-size: 9px;
          font-weight: 600;
          line-height: 1.75;
          text-align: justify;
        }

        .hzn-lists {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6mm;
          margin-top: 5mm;
        }

        .hzn-list {
          border-radius: 4mm;
          padding: 4mm;
          background: var(--hzn-soft);
        }

        .hzn-list h3 {
          margin: 0;
          color: var(--hzn-indigo);
          font-size: 14px;
          font-weight: 900;
        }

        .hzn-list ol {
          margin: 3mm 0 0;
          padding: 0;
          list-style: none;
          counter-reset: hzn-list;
        }

        .hzn-list li {
          counter-increment: hzn-list;
          position: relative;
          min-height: 6.5mm;
          border-bottom: 1px solid var(--hzn-line);
          padding: 1mm 8mm 1mm 0;
          font-size: 8px;
          font-weight: 700;
        }

        .hzn-list li::before {
          content: counter(hzn-list, decimal-leading-zero);
          position: absolute;
          right: 0;
          color: var(--hzn-coral);
          font-size: 6.5px;
          font-weight: 900;
        }

        .hzn-objectives {
          margin-top: 5mm;
          border-radius: 4mm;
          padding: 4mm;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px var(--hzn-line);
        }

        .hzn-objectives h3 {
          margin: 0 0 3mm;
          color: var(--hzn-indigo);
          font-size: 14px;
          font-weight: 900;
        }

        .hzn-objectives ol {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 6mm;
          margin: 0;
          padding: 0;
          list-style: none;
          counter-reset: hzn-objective;
        }

        .hzn-objectives li {
          counter-increment: hzn-objective;
          position: relative;
          min-height: 7mm;
          border-bottom: 1px solid var(--hzn-line);
          padding: 1mm 8mm 1mm 0;
          font-size: 7.8px;
          font-weight: 650;
        }

        .hzn-objectives li::before {
          content: counter(hzn-objective, decimal-leading-zero);
          position: absolute;
          right: 0;
          color: var(--hzn-violet);
          font-size: 6.5px;
          font-weight: 900;
        }

        .hzn-profile-summary {
          margin: 0 0 7mm;
          border-radius: 4mm;
          padding: 5mm;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px var(--hzn-line);
          font-size: 10.5px;
          line-height: 1.9;
        }

        .hzn-profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4mm;
        }

        .hzn-profile-item {
          min-height: 20mm;
          border-radius: 3mm;
          padding: 4mm;
          background: var(--hzn-soft);
        }

        .hzn-profile-item:nth-child(4n + 1) {
          border-top: 1mm solid var(--hzn-violet);
        }

        .hzn-profile-item:nth-child(4n + 2) {
          border-top: 1mm solid var(--hzn-mint);
        }

        .hzn-profile-item:nth-child(4n + 3) {
          border-top: 1mm solid var(--hzn-amber);
        }

        .hzn-profile-item:nth-child(4n + 4) {
          border-top: 1mm solid var(--hzn-coral);
        }

        .hzn-profile-item span {
          display: block;
          color: var(--hzn-muted);
          font-size: 8px;
        }

        .hzn-profile-item strong {
          display: block;
          margin-top: 1.5mm;
          color: var(--hzn-indigo);
          font-size: 11px;
          font-weight: 900;
        }

        .hzn-qualification-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 2mm;
          margin-bottom: 5mm;
        }

        .hzn-qualification-meta span {
          border-radius: 999px;
          padding: 1.2mm 3mm;
          background: var(--hzn-soft);
          color: var(--hzn-muted);
          font-size: 8px;
        }

        .hzn-qualification-stage {
          display: grid;
          width: 164mm;
          height: 182mm;
          place-items: center;
          margin: 0 auto;
        }

        .hzn-qualification-stage img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .hzn-qualification-description {
          margin-top: 5mm;
          border-top: 1px solid var(--hzn-line);
          padding-top: 3mm;
          font-size: 9px;
          line-height: 1.8;
        }

        .hzn-divider .hzn-body {
          display: grid;
          align-content: center;
        }

        .hzn-divider-number {
          color: rgba(108, 92, 231, 0.14);
          font-size: 54px;
          font-weight: 900;
          line-height: 1;
        }

        .hzn-divider h2 {
          max-width: 142mm;
          margin: -2mm 0 0;
          color: var(--hzn-indigo);
          font-size: 40px;
          font-weight: 900;
          line-height: 1.3;
        }

        .hzn-divider p {
          max-width: 138mm;
          margin: 5mm 0 0;
          color: var(--hzn-muted);
          font-size: 11px;
          line-height: 1.9;
        }

        .hzn-divider-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4mm;
          margin-top: 11mm;
        }

        .hzn-divider-stats div {
          border-radius: 3mm;
          padding: 4mm;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px var(--hzn-line);
        }

        .hzn-divider-stats strong {
          display: block;
          color: var(--hzn-indigo);
          font-size: 20px;
          font-weight: 900;
        }

        .hzn-divider-stats span {
          color: var(--hzn-muted);
          font-size: 8px;
        }

        .hzn-report-title {
          position: relative;
          margin-bottom: 6mm;
        }

        .hzn-report-title > span {
          color: var(--hzn-coral);
          font-size: 8.5px;
          font-weight: 900;
        }

        .hzn-report-title h1 {
          margin: 2mm 0 0;
          color: var(--hzn-indigo);
          font-size: 28px;
          font-weight: 900;
          line-height: 1.3;
        }

        .hzn-report-title small {
          position: absolute;
          top: 1mm;
          left: 0;
          color: var(--hzn-muted);
          font-size: 7.5px;
        }

        .hzn-report-sections {
          display: grid;
          gap: 4mm;
        }

        .hzn-report-section h2 {
          margin: 0 0 2mm;
          color: var(--hzn-indigo);
          font-size: 14px;
          font-weight: 900;
        }

        .hzn-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-auto-flow: row dense;
          gap: 2.5mm;
        }

        .hzn-detail-card {
          display: grid;
          grid-template-columns: 8mm minmax(0, 1fr);
          min-height: 18mm;
          align-items: center;
          gap: 2.5mm;
          border-radius: 3mm;
          padding: 3mm;
          background: #ffffff;
          box-shadow: inset 0 0 0 1px var(--hzn-line);
        }

        .hzn-detail-card:nth-child(4n + 1) {
          border-inline-start: 1.2mm solid var(--hzn-violet);
        }

        .hzn-detail-card:nth-child(4n + 2) {
          border-inline-start: 1.2mm solid var(--hzn-mint);
        }

        .hzn-detail-card:nth-child(4n + 3) {
          border-inline-start: 1.2mm solid var(--hzn-amber);
        }

        .hzn-detail-card:nth-child(4n + 4) {
          border-inline-start: 1.2mm solid var(--hzn-coral);
        }

        .hzn-detail-card-wide {
          grid-column: 1 / -1;
        }

        .hzn-detail-number {
          display: grid;
          width: 6mm;
          height: 6mm;
          place-items: center;
          border-radius: 2mm;
          background: var(--hzn-soft);
          color: var(--hzn-violet);
          font-size: 6px;
          font-weight: 900;
        }

        .hzn-detail-content small {
          display: block;
          color: var(--hzn-muted);
          font-size: 7.4px;
        }

        .hzn-detail-content strong {
          display: block;
          margin-top: 0.8mm;
          color: var(--hzn-ink);
          font-size: 9.5px;
          font-weight: 800;
          line-height: 1.5;
        }

        .hzn-value-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .hzn-value-list li {
          position: relative;
          padding: 0.3mm 3.5mm 0.3mm 0;
        }

        .hzn-value-list li::before {
          content: "";
          position: absolute;
          top: 2.4mm;
          right: 0;
          width: 1.2mm;
          height: 1.2mm;
          border-radius: 50%;
          background: var(--hzn-mint);
        }

        .hzn-narrative {
          margin: 0;
          border-radius: 3mm;
          padding: 4mm;
          background: var(--hzn-soft);
          font-size: 9.7px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .hzn-evidence-grid {
          display: grid;
          gap: 5mm;
        }

        .hzn-evidence {
          margin: 0;
          overflow: hidden;
          border-radius: 4mm;
        }

        .hzn-evidence img {
          display: block;
          width: 100%;
          border-radius: 4mm;
        }

        .hzn-file {
          display: grid;
          min-height: 23mm;
          place-items: center;
          border-radius: 3mm;
          background: var(--hzn-soft);
          color: var(--hzn-indigo);
          text-decoration: none;
          font-weight: 800;
        }

        .hzn-closing {
          background:
            linear-gradient(
              135deg,
              var(--hzn-soft),
              #ffffff 70%
            );
        }

        @media screen and (max-width: 900px) {
          .hzn-page {
            width: 100%;
          }
        }
      `}</style>

      <HorizonPage
        sectionLabel="الغلاف"
        className="hzn-cover"
        code="01"
      >
        <div className="hzn-cover-grid" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="hzn-cover-content">
          <PortfolioCoverOfficialLogos
            ministryLogoSrc="/uploads/school-logos/MOE.png"
            visionLogoSrc="/uploads/school-logos/VISION2030.png"
            tone="dark"
          />
          <span className="hzn-cover-kicker">ملف مهني موثّق</span>
          <h1>{data.portfolio.title}</h1>
          <p className="hzn-cover-subtitle">{data.owner.jobTitle}</p>

          <div className="hzn-cover-meta">
            <div>
              <span>صاحب الملف</span>
              <strong>{data.owner.name}</strong>
            </div>

            {data.portfolio.preferences.showSchoolName ? (
              <div>
                <span>المدرسة</span>
                <strong>{data.school.name}</strong>
              </div>
            ) : null}

            <div>
              <span>العام الدراسي</span>
              <strong>{data.portfolio.academicYear}</strong>
            </div>

            <div>
              <span>الفصل الدراسي</span>
              <strong>{data.portfolio.term}</strong>
            </div>
          </div>
        </div>
      </HorizonPage>

      {data.portfolio.preferences.showTableOfContents ? (
        <HorizonPage sectionLabel="الفهرس" code="02">
          <HorizonHeading
            eyebrow="خارطة الملف"
            title="فهرس المحتويات"
            description="عرض منظم لأقسام ملف الإنجاز."
          />

          <div className="hzn-index">
            {data.sections
              .filter((section) => section.isEnabled)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((section, index) => (
                <article key={section.id} className="hzn-index-item">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{section.title}</strong>
                  <small>قسم</small>
                </article>
              ))}
          </div>
        </HorizonPage>
      ) : null}

      {sectionEnabled("introduction") ? (
        <div style={{ order: sectionOrder("introduction") }}>
          <HorizonPage sectionLabel="المقدمة" code="03">
            <HorizonHeading
              eyebrow="مدخل الملف"
              title="المقدمة"
              description={
                data.portfolio.introText ||
                "يعرض هذا الملف أبرز الأعمال والتقارير والشواهد المهنية خلال الفصل الدراسي."
              }
            />

            {data.educationIdentity.vision ||
            data.educationIdentity.mission ? (
              <div className="hzn-intro-grid">
                {data.educationIdentity.vision ? (
                  <section className="hzn-intro-card">
                    <small>نطمح إلى</small>
                    <h3>الرؤية</h3>
                    <p>{data.educationIdentity.vision}</p>
                  </section>
                ) : null}

                {data.educationIdentity.mission ? (
                  <section className="hzn-intro-card hzn-intro-card-mint">
                    <small>نعمل من أجل</small>
                    <h3>الرسالة</h3>
                    <p>{data.educationIdentity.mission}</p>
                  </section>
                ) : null}
              </div>
            ) : null}

            {data.educationIdentity.pillars.length ||
            data.educationIdentity.values.length ? (
              <div className="hzn-lists">
                {data.educationIdentity.pillars.length ? (
                  <section className="hzn-list">
                    <h3>المحاور</h3>
                    <ol>
                      {data.educationIdentity.pillars.map((item, index) => (
                        <li key={`pillar-${index}`}>{item}</li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                {data.educationIdentity.values.length ? (
                  <section className="hzn-list">
                    <h3>القيم</h3>
                    <ol>
                      {data.educationIdentity.values.map((item, index) => (
                        <li key={`value-${index}`}>{item}</li>
                      ))}
                    </ol>
                  </section>
                ) : null}
              </div>
            ) : null}

            {data.educationIdentity.strategicObjectives.length ? (
              <section className="hzn-objectives">
                <h3>الأهداف الاستراتيجية</h3>
                <ol>
                  {data.educationIdentity.strategicObjectives.map(
                    (item, index) => (
                      <li key={`objective-${index}`}>{item}</li>
                    ),
                  )}
                </ol>
              </section>
            ) : null}
          </HorizonPage>
        </div>
      ) : null}

      {sectionEnabled("profile") ? (
        <div style={{ order: sectionOrder("profile") }}>
          <HorizonPage sectionLabel="السيرة المهنية" code="04">
            <HorizonHeading
              eyebrow="صاحب الملف"
              title="السيرة المهنية"
            />

            {data.biography.professionalSummary ? (
              <p className="hzn-profile-summary">
                {data.biography.professionalSummary}
              </p>
            ) : null}

            <div className="hzn-profile-grid">
              {[
                ["الاسم", data.owner.name],
                ["المسمى الوظيفي", data.owner.jobTitle],
                [
                  "المدرسة",
                  data.portfolio.preferences.showSchoolName
                    ? data.school.name
                    : "",
                ],
                ["التخصص", data.biography.specialization],
                ["المؤهل العلمي", data.biography.academicQualification],
                ["سنوات الخبرة", data.biography.yearsOfExperience],
                ["المهارات", data.biography.skills],
                ["الاهتمامات المهنية", data.biography.professionalInterests],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value], index) => (
                  <article
                    key={`${label}-${index}`}
                    className="hzn-profile-item"
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
            </div>
          </HorizonPage>
        </div>
      ) : null}

      {sectionEnabled("qualifications") ? (
        <div style={{ order: sectionOrder("qualifications") }}>
          {qualifications.map((item) => {
            const hasImage =
              Boolean(item.attachmentUrl) &&
              (item.attachmentKind === "IMAGE" ||
                item.attachmentMimeType.startsWith("image/") ||
                /\.(?:jpe?g|png|webp|gif|svg)(?:\?.*)?$/i.test(
                  item.attachmentUrl,
                ));

            return (
              <HorizonPage
                key={item.id}
                sectionLabel="المؤهلات والدورات"
                code="05"
              >
                <HorizonHeading
                  eyebrow={
                    item.type === "QUALIFICATION"
                      ? "مؤهل"
                      : item.type === "COURSE"
                        ? "دورة"
                        : "شهادة"
                  }
                  title={item.title}
                />

                <div className="hzn-qualification-meta">
                  {item.issuer ? <span>{item.issuer}</span> : null}
                  {item.date ? <span>{item.date}</span> : null}
                  {item.hours ? <span>{item.hours} ساعة</span> : null}
                </div>

                <div className="hzn-qualification-stage">
                  {hasImage ? (
                    <img src={item.attachmentUrl} alt={item.title} />
                  ) : (
                    <span>لا توجد صورة مرفقة</span>
                  )}
                </div>

                {item.description ? (
                  <p className="hzn-qualification-description">
                    {item.description}
                  </p>
                ) : null}
              </HorizonPage>
            );
          })}
        </div>
      ) : null}

      {enabledSections.map((section, index) => (
        <div key={section.key} style={{ order: section.sortOrder }}>
          {data.portfolio.preferences.showPerformanceDividers ? (
            <HorizonPage
              sectionLabel={section.title}
              className="hzn-divider"
              code={String(index + 1).padStart(2, "0")}
            >
              <span className="hzn-divider-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2>{section.title}</h2>
              {section.intro ? <p>{section.intro}</p> : null}

              <div className="hzn-divider-stats">
                {data.showWeights !== false ? <div>
                  <strong>{section.weight}%</strong>
                  <span>الوزن</span>
                </div> : null}
                <div>
                  <strong>{section.reports.length}</strong>
                  <span>التقارير</span>
                </div>
                <div>
                  <strong>
                    {section.reports.reduce(
                      (total, report) => total + report.evidenceCount,
                      0,
                    )}
                  </strong>
                  <span>الشواهد</span>
                </div>
              </div>
            </HorizonPage>
          ) : null}

          {section.reports.map((report) =>
            report.content ? (
              <HorizonReportPages key={report.id} report={report.content} />
            ) : null,
          )}
        </div>
      ))}

      {sectionEnabled("closing") ? (
        <HorizonPage
          sectionLabel="الخاتمة"
          className="hzn-divider hzn-closing"
          style={{ order: sectionOrder("closing") }}
          code="∞"
        >
          <span className="hzn-divider-number">∞</span>
          <h2>الخاتمة</h2>
          <p>
            {data.portfolio.conclusionText ||
              "ختامًا، يمثل هذا الملف توثيقًا مهنيًا لأبرز الإنجازات وفرص التطوير القادمة."}
          </p>
        </HorizonPage>
      ) : null}
    </div>
  );
}
