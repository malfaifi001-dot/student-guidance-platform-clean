import type { CSSProperties, ReactNode } from "react";

import type { PortfolioReportContent, PortfolioReportField, } from "@/lib/portfolio/portfolio-report-content";
import { getPortfolioTheme } from "@/lib/portfolio/portfolio-theme-registry";
import { getPortfolioEvidenceImageHeightMm, getPortfolioEvidencePerPage } from "@/lib/portfolio/engine/portfolio-smart-content-utils";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { PortfolioCoverOfficialLogos } from "@/components/portfolio/print/portfolio-cover-official-logos";
import { type PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";
import type { PortfolioPhysicalDocument } from "@/lib/portfolio/layout/portfolio-physical-types";
import { getServiceOutputPhysicalWeeks } from "@/lib/portfolio/layout/portfolio-physical-planner";
import type { PortfolioFieldInternalLayout } from "@/lib/portfolio/layout/portfolio-field-layout";
import { getServiceOutputPhysicalChunks, getReportPhysicalPages } from "@/lib/portfolio/layout/portfolio-physical-planner";
import { ActivityLeaderServiceOutputContent } from "@/components/portfolio/print/activity-leader-service-output-content";
import { PortfolioEducationalIdentityContent } from "@/components/portfolio/print/portfolio-educational-identity-content";

function renderFieldValue(value: string | string[], field?: PortfolioReportField, internalLayout?: PortfolioFieldInternalLayout) {
  if (Array.isArray(value)) {
    const columns = internalLayout?.valueColumns || 1;
    return (
      <ul className="portfolio-report-list" style={columns > 1 ? { display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: ".3mm .7mm" } : undefined}>
        {value.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return value || "غير محدد";
}

function PortfolioPageWave() {
  return (
    <svg
      className="portfolio-page-wave"
      viewBox="0 0 854 118"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 74
           C108 46, 213 53, 312 76
           C417 101, 482 107, 575 86
           C676 63, 753 42, 854 38
           L854 118 L0 118 Z"
        fill="#e7f0ea"
      />

      <path
        d="M0 84
           C122 61, 231 70, 340 92
           C445 113, 514 108, 602 79
           C696 48, 772 35, 854 40
           L854 118 L0 118 Z"
        fill="#b9d2c2"
      />

      <path
        d="M0 95
           C112 80, 224 91, 329 103
           C438 115, 508 91, 592 61
           C687 27, 767 25, 854 34
           L854 118 L0 118 Z"
        fill="#7fa58d"
      />

      <path
        d="M0 104
           C126 94, 237 108, 346 111
           C458 114, 529 84, 615 52
           C709 17, 782 15, 854 23
           L854 118 L0 118 Z"
        fill="#2f6d4b"
      />


    </svg>
  );
}
function PageShell({
  children,
  pageLabel,
  className = "",
  style,
  pageId,
  outputId,
  chunkIndex,
}: {
  children: ReactNode;
  pageLabel: string;
  className?: string;
  style?: CSSProperties;
  pageId?: string;
  outputId?: string;
  chunkIndex?: number;
}) {
  return (
    <section className={`portfolio-page ${className}`} style={style} data-page-label={pageLabel} data-portfolio-page-id={pageId} data-portfolio-output-id={outputId} data-portfolio-chunk-index={chunkIndex} data-portfolio-page-type={className.includes("portfolio-service-output-page") ? "service-output" : undefined}>
      <div className="portfolio-page-header" data-portfolio-header-boundary>
        <span>ملف الإنجاز</span>
        <span>{pageLabel}</span>
      </div>

      <div className="portfolio-page-body" data-portfolio-safe-content>{children}</div>

      <PortfolioPageWave />

      <div className="portfolio-page-footer" data-portfolio-footer-boundary>
        <span>Teachix | الاسهل والاشمل</span>
        <span>{pageLabel}</span>
      </div>
    </section>
  );
}

function MiniInfo({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="portfolio-info-card">
      <span>{label}</span>
      <strong>{value || "غير محدد"}</strong>
    </div>
  );
}

function MinistryCurriculumPages({ output, sectionTitle, physicalDocument }: { output: PortfolioServiceOutput; sectionTitle: string; physicalDocument: PortfolioPhysicalDocument }) {
  const content = output.content;
  if (content.kind !== "curriculum-distribution") return null;
  const plannedWeeks = getServiceOutputPhysicalWeeks(physicalDocument, output.id);
  const pageWeeks = plannedWeeks;
  return pageWeeks.map((weeks, index) => (
    <PageShell key={`${output.id}-${index}`} pageLabel={sectionTitle} className="portfolio-curriculum-page">
      <style>{`.portfolio-curriculum-page .portfolio-curriculum-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0 14px}.portfolio-curriculum-page .portfolio-curriculum-ministry-list{display:grid;gap:8px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row{display:grid;grid-template-columns:27% 1fr;gap:12px;padding:10px;border:1px solid #d8e5df;border-inline-start:4px solid #2f6d4b;border-radius:10px;background:#fbfdfb;break-inside:avoid}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header strong,.portfolio-curriculum-page .portfolio-curriculum-ministry-row header span,.portfolio-curriculum-page .portfolio-curriculum-ministry-row header small{display:block}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header strong{color:#24583d;font-size:12px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header span{margin-top:2px;color:#345b65;font-size:10px;font-weight:800}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header small{margin-top:7px;color:#68777b;font-size:8px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row section{margin-bottom:5px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row section>b{color:#2f6d4b;font-size:10px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row ul{margin:2px 0 0;padding-inline-start:16px;font-size:9px;line-height:1.55}.portfolio-curriculum-page .portfolio-curriculum-badge{display:inline-block;margin:0 0 5px 5px;padding:4px 7px;border-radius:999px;background:#edf6ef;color:#2f6d4b;font-size:9px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row .portfolio-info-card{min-height:0}`}</style>
      <style>{`.portfolio-curriculum-page .portfolio-curriculum-meta-grid{gap:4px;margin:5px 0 7px}.portfolio-curriculum-page .portfolio-curriculum-meta-grid .portfolio-info-card{padding:4px 6px}.portfolio-curriculum-page .portfolio-curriculum-ministry-list{gap:3px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row{grid-template-columns:24% 1fr;gap:6px;padding:5px 6px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header strong{font-size:10px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header span{font-size:8px;margin-top:1px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header small{font-size:7px;margin-top:3px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row section{margin-bottom:2px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row section>b{font-size:8px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row ul{margin:0;padding-inline-start:12px;font-size:7.5px;line-height:1.25}.portfolio-curriculum-page .portfolio-curriculum-badge{padding:2px 5px;margin:0 0 2px 3px;font-size:7px}`}</style>
      <style>{`.portfolio-curriculum-page .portfolio-curriculum-ministry-list{grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row{display:block;padding:5px}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header{margin-bottom:3px;padding-bottom:3px;border-bottom:1px solid #d8e5df}.portfolio-curriculum-page .portfolio-curriculum-ministry-row header small{white-space:nowrap}.portfolio-curriculum-page .portfolio-curriculum-ministry-row ul{padding-inline-start:11px}`}</style>
      <style>{`.portfolio-curriculum-page .portfolio-curriculum-ministry-row header strong,.portfolio-curriculum-page .portfolio-curriculum-ministry-row section>b{font-weight:900}.portfolio-curriculum-page .portfolio-curriculum-ministry-row section>b{display:block;margin-bottom:1px}`}</style>
      <div className="portfolio-section-heading">
        <span>{index ? "مخرجات مرتبطة" : sectionTitle}</span>
        <h2>{output.displayTitle}</h2>
      </div>
      {!index ? <div className="portfolio-curriculum-meta-grid">{[["المادة", content.subject], ["المرحلة", content.stage], ["الصف / السنة", content.grade], ["الفصل الدراسي", content.semester]].map(([label, value]) => <MiniInfo key={label} label={label} value={value} />)}</div> : null}
      <div className="portfolio-curriculum-ministry-list">
        {weeks.map((week) => <article key={week.id} className="portfolio-curriculum-ministry-row">
          <header><strong>{week.kind === "BREAK" ? week.title : `الأسبوع ${week.sequence}`}</strong>{week.kind === "CALENDAR_WEEK" ? <span>{week.title}</span> : null}<small>{week.gregorianRange}</small></header>
          <div>{week.kind !== "CURRICULUM_WEEK" ? <b className="portfolio-curriculum-badge">{week.title}</b> : null}{week.units.map((unit) => <section key={unit.name}><b>{unit.name}</b><ul>{unit.lessons.map((lesson, lessonIndex) => <li key={`${unit.name}-${lessonIndex}`}>{lesson}</li>)}</ul></section>)}{week.standalone.map((lesson, lessonIndex) => <b className="portfolio-curriculum-badge" key={`${lesson}-${lessonIndex}`}>{lesson}</b>)}</div>
        </article>)}
      </div>
    </PageShell>
  ));
}

function MinistryActivityOutputPages({ output, sectionTitle, physicalDocument }: { output: PortfolioServiceOutput; sectionTitle: string; physicalDocument: PortfolioPhysicalDocument }) {
  const chunks = getServiceOutputPhysicalChunks(physicalDocument, output.id);
  const pageChunks = chunks;
  return pageChunks.filter((chunk) => chunk.kind !== "curriculum-distribution").map((chunk, index) => (
    <PageShell key={`${output.id}-${index}`} pageId={physicalDocument.serviceOutputPages[output.id]?.[index]?.id} outputId={output.id} chunkIndex={index} pageLabel={sectionTitle} className="portfolio-activity-output-page portfolio-service-output-page">
      <style>{`.portfolio-ministry-elegant-activity-output-body{display:grid;gap:4mm}.portfolio-activity-output-title{font-family:var(--font-cairo),"Cairo",Tahoma,Arial,sans-serif;font-size:32px!important;font-weight:900;line-height:1.25}.portfolio-ministry-elegant-activity-output-week{break-inside:avoid}.portfolio-ministry-elegant-activity-output-week header{display:flex;justify-content:space-between;gap:4mm;padding:2mm 3mm;color:#fff;background:linear-gradient(90deg,#315c49,#62886b);font-size:10px}.portfolio-ministry-elegant-activity-output-week header span{font-size:8px;opacity:.9}.portfolio-ministry-elegant-activity-output-table{width:100%;border-collapse:collapse;font-size:8px}.portfolio-ministry-elegant-activity-output-table th,.portfolio-ministry-elegant-activity-output-table td{padding:1.8mm 2mm;border:1px solid #d5e2d8;text-align:right;vertical-align:middle}.portfolio-ministry-elegant-activity-output-table thead th{color:#fff;background:#527861;font-weight:900}.portfolio-ministry-elegant-activity-output-table tbody th{color:#315c49;background:#f1f7f1}.portfolio-ministry-elegant-activity-output-table td{background:#fff}.portfolio-ministry-elegant-activity-output-table small{display:block;margin-top:.5mm;color:#6a7b73;font-size:7px}`}</style>
      <span className="portfolio-section-kicker">مخرج مرتبط</span>
      <h2 className="portfolio-section-title portfolio-activity-output-title">{output.displayTitle}</h2>
      <ActivityLeaderServiceOutputContent chunk={chunk} design="ministry-elegant" />
    </PageShell>
  ));
}

function PortfolioQualificationDocumentPage({ data, item }: {
  data: PortfolioPrintData;
  item: PortfolioPrintData["qualificationItems"][number];
}) {
  const typeLabel = item.type === "QUALIFICATION" ? "مؤهل" : item.type === "COURSE" ? "دورة" : "شهادة";
  const hasImage = Boolean(item.attachmentUrl) && (item.attachmentKind === "IMAGE" || item.attachmentMimeType.startsWith("image/") || /\.(?:jpe?g|png|webp)(?:\?.*)?$/i.test(item.attachmentUrl));
  const descriptionFontSize = item.description.length > 1000 ? "7px" : item.description.length > 500 ? "8px" : "10px";
  const metadata = [item.issuer, item.date, item.hours ? `${item.hours} ساعة` : ""].filter(Boolean);

  return <section className="portfolio-page portfolio-qualification-document-page">
    <div className="portfolio-page-header"><span>المؤهلات والدورات</span><span>ملف إنجاز {data.owner.name}</span></div>
    <div className="portfolio-page-body portfolio-qualification-document-body">
      <h2 className="portfolio-qualification-title">{item.title}</h2>
      <div className="portfolio-qualification-summary">
        <span className="portfolio-qualification-type">{typeLabel}</span>
        {metadata.length ? <p className="portfolio-qualification-meta">{metadata.map((value, metadataIndex) => <span key={`${value}-${metadataIndex}`}>{value}</span>)}</p> : null}
      </div>
      <div className="portfolio-qualification-image-stage">
        {hasImage ? <img src={item.attachmentUrl} alt={item.title} /> : <div className="portfolio-qualification-image-placeholder">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.75h7.5l3 3v13.5H6.75V3.75Z" /><path d="M14.25 3.75v3h3M9 11.25h6M9 14.25h6" /></svg>
          <span>لا توجد صورة مرفقة لهذا العنصر</span>
        </div>}
      </div>
      {item.description ? <p className="portfolio-qualification-description" style={{ fontSize: descriptionFontSize }}>{item.description}</p> : null}
    </div>
    <PortfolioPageWave />
    <div className="portfolio-page-footer portfolio-qualification-footer"><span>{data.portfolio.preferences.showSchoolName ? data.school.name : data.portfolio.title}</span><span>{data.owner.name}</span><span className="portfolio-global-page-number" /></div>
  </section>;
}

function PortfolioDesignedReportPage({ report, physicalDocument, reportId }: { report: PortfolioReportContent; physicalDocument: PortfolioPhysicalDocument; reportId: string }) {
  const pages = getReportPhysicalPages(physicalDocument, reportId);
  const evidenceImageHeightMm = getPortfolioEvidenceImageHeightMm(report);
  const evidenceGridColumns =
    getPortfolioEvidencePerPage(report) <= 1 ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))";

  return (
    <>
      {pages.map((page, pageIndex) => (
        <section key={page.key} className="portfolio-report-page" data-portfolio-density={page.layoutCandidate} data-portfolio-page-id={physicalDocument.reportPages[reportId]?.[pageIndex]?.id}>
          <div className="portfolio-report-frame">
            <div className="portfolio-report-band" />

            <div className="portfolio-report-fixed-header" data-portfolio-header-boundary>
              <span>{report.serviceName || "التقرير"}</span>
              <span>{`صفحة ${pageIndex + 1} من ${pages.length}`}</span>
            </div>

            <main className="portfolio-report-body" data-portfolio-safe-content>
              <header className="portfolio-report-header">
                <div>
                  <h1>{report.title}</h1>
                  <p>{report.serviceName || report.subtitle || "التقرير"}</p>
                </div>
              </header>

              <div className="portfolio-report-sections">
                {page.sections.map((section, sectionIndex) => {
                  if (section.kind === "details") {
                    return (
                      <section
                        key={`details-${page.key}-${sectionIndex}`}
                        className="portfolio-report-section"
                      >
                        <h2>التفاصيل</h2>

                        {section.fields.length === 0 ? (
                          <div className="portfolio-report-empty">
                            لا توجد حقول متاحة في هذا التقرير.
                          </div>
                        ) : (
                          <div className="portfolio-report-detail-grid" style={{ gridTemplateColumns: `repeat(${page.fieldColumnCount || 4}, minmax(0, 1fr))` }}>
                            {(page.fieldBands || []).flatMap((band) =>
                              band.items.map(({ field, columnStart, columnSpan: effectiveSpan, row, semanticKind: kind, renderedHeightPx, internalLayout }) => (
                                <div
                                  key={`${field.key}-${field.label}`}
                                  className="portfolio-report-detail-box"
                                  style={{ gridColumn: `${columnStart} / span ${effectiveSpan}`, gridRow: `${row + 1}`, height: "100%", alignSelf: "stretch", ...(renderedHeightPx ? { minHeight: `${renderedHeightPx}px` } : {}) }}
                                  data-portfolio-field-kind={kind}
                                  data-portfolio-field-key={field.key}
                                  data-portfolio-field-band={band.id}
                                  data-portfolio-internal-columns={internalLayout.valueColumns}
                                >
                                  <span>{field.label}</span>
                                  <strong>{renderFieldValue(field.value, field, internalLayout)}</strong>
                                </div>
                              )),
                            )}
                          </div>
                        )}
                      </section>
                    );
                  }

                  if (section.kind === "narrative") {
                    return (
                      <section
                        key={`narrative-${page.key}-${sectionIndex}`}
                        className="portfolio-report-section"
                      >
                        <h2>وصف التنفيذ</h2>
                        <p className="portfolio-report-narrative">{section.body}</p>
                      </section>
                    );
                  }

                  return (
                    <section
                      key={`evidence-${page.key}-${sectionIndex}`}
                      className="portfolio-report-section"
                    >
                      <h2>الشواهد والمرفقات</h2>

                      <div
                        className="portfolio-report-evidence-grid"
                        style={{ gridTemplateColumns: evidenceGridColumns }}
                      >
                        {section.items.map((item) => {
                          const isImage =
                            item.type === "IMAGE" ||
                            Boolean(item.url && /\.(png|jpe?g|webp|gif|svg)$/i.test(item.url));

                          return (
                            <figure
                              key={item.id}
                              className="portfolio-report-evidence-card"
                              style={{ minHeight: `${evidenceImageHeightMm}mm` }}
                            >
                              {isImage && item.url ? (
                                <img
                                  src={item.url}
                                  alt={item.title?.trim() || "صورة مرفقة"}
                                  style={{
                                    height: `${evidenceImageHeightMm}mm`,
                                    objectFit: report.evidenceSettings.fit,
                                  }}
                                />
                              ) : (
                                item.url ? (
                                  <a
                                    className="portfolio-report-file-card"
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ height: `${evidenceImageHeightMm}mm` }}
                                  >
                                    فتح الملف المرفق
                                  </a>
                                ) : (
                                  <div
                                    className="portfolio-report-file-card"
                                    style={{ height: `${evidenceImageHeightMm}mm` }}
                                  >
                                    مرفق بدون رابط
                                  </div>
                                )
                              )}
                            </figure>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </main>

            <PortfolioPageWave />
            <div className="portfolio-report-fixed-footer" data-portfolio-footer-boundary>
              <span>ملف الإنجاز</span>
              <span>{report.serviceName || "التقرير"}</span>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

export function MinistryElegantPortfolioPrint({ data, physicalDocument }: { data: PortfolioPrintData; physicalDocument: PortfolioPhysicalDocument }) {
  const theme = getPortfolioTheme(data.portfolio.themeId);
  const enabledSections = data.performanceSections
    .filter((section) => section.isEnabled)
    .sort((first, second) => first.sortOrder - second.sortOrder);
  const sectionByKey = new Map(data.sections.map((section) => [section.key, section]));
  const sectionEnabled = (key: string) => sectionByKey.get(key)?.isEnabled !== false;
  const sectionOrder = (key: string) => sectionByKey.get(key)?.sortOrder ?? 0;
  const visibleQualificationItems = data.qualificationItems.filter((item) => item.isVisible);

  return (
    <div
      className="portfolio-print-root"
      dir="rtl"
      style={
        {
          "--portfolio-primary": theme.palette.primary,
          "--portfolio-secondary": theme.palette.secondary,
          "--portfolio-accent": theme.palette.accent,
          "--portfolio-muted": theme.palette.muted,
        } as CSSProperties
      }
    >
      <style>{`
        @page {
          size: 210mm 297mm;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            min-width: 0 !important;
            overflow: visible !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .portfolio-print-root {
            width: 210mm !important;
            min-width: 0 !important;
            margin: 0 !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .portfolio-page,
          .portfolio-report-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            overflow: hidden !important;
            break-after: page;
            page-break-after: always;
          }

          .portfolio-page:last-child,
          .portfolio-report-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }

        .portfolio-print-root {
          counter-reset: portfolio-page;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #eef4f8;
          padding: 24px 0;
          color: #0f172a;
          font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif;
        }

        .portfolio-page,
        .portfolio-report-page {
          counter-increment: portfolio-page;
          position: relative;
          width: 210mm;
          min-width: 210mm;
          max-width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto 24px;
          overflow: hidden;
          background: white;
          box-shadow: 0 22px 70px rgba(15, 23, 42, 0.12);
          page-break-after: always;
          break-after: page;
        }

        .portfolio-page-wave {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          z-index: 1;
          display: block;
          width: 100%;
          height: 26mm;
          overflow: hidden;
          pointer-events: none;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-page-body {
          padding-bottom: 31mm;
        }

        .portfolio-page-footer {
          right: 18mm;
          bottom: 5.5mm;
          left: 18mm;
          z-index: 5;
          align-items: center;
          border-top: 0;
          padding-top: 0;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(18, 52, 38, 0.18);
        }

        .portfolio-qualification-document-body {
          padding-bottom: 31mm;
        }

        .portfolio-report-page .portfolio-page-wave {
          z-index: 3;
          height: 24mm;
        }

        .portfolio-report-body {
          position: relative;
          z-index: 4;
          padding-bottom: 27mm;
        }

        .portfolio-report-fixed-header {
          z-index: 5;
        }

        .portfolio-report-fixed-footer {
          z-index: 6;
          bottom: 5mm;
          border-top: 0;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(18, 52, 38, 0.18);
        }
        .portfolio-page-body {
          position: relative;
          z-index: 2;
          padding: 34mm 20mm 24mm;
        }

        .portfolio-qualification-document-page {
          break-after: page;
          page-break-after: always;
        }

        .portfolio-qualification-document-body {
          display: flex;
          flex-direction: column;
          padding-top: 26mm;
          padding-bottom: 22mm;
        }

        .portfolio-qualification-type {
          display: inline-block;
          flex: 0 0 auto;
          border-radius: 999px;
          padding: 1.4mm 4mm;
          background: var(--portfolio-secondary);
          color: white;
          font-size: 9px;
          font-weight: 950;
        }

        .portfolio-qualification-title {
          max-width: 158mm;
          margin: 0;
          color: var(--portfolio-secondary);
          font-size: 25px;
          font-weight: 950;
          line-height: 1.35;
        }

        .portfolio-qualification-summary {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2.5mm 5mm;
          min-height: 8mm;
          margin-top: 3mm;
        }

        .portfolio-qualification-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2mm;
          margin: 0;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
        }

        .portfolio-qualification-meta span + span::before {
          content: "·";
          margin-inline-end: 2mm;
          color: rgba(15, 118, 110, 0.58);
        }

        .portfolio-qualification-image-stage {
          display: grid;
          width: 168mm;
          height: 150mm;
          place-items: center;
          margin: 6mm auto 0;
          overflow: hidden;
          border: 0;
          background: transparent;
          box-shadow: none;
          clip-path: polygon(3% 0, 100% 0, 97% 100%, 0 100%);
        }

        .portfolio-qualification-image-stage img {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          box-shadow: none;
          object-fit: contain;
          object-position: center;
        }

        .portfolio-qualification-image-placeholder {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          gap: 3mm;
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
        }

        .portfolio-qualification-image-placeholder svg {
          width: 11mm;
          height: 11mm;
          fill: none;
          stroke: var(--portfolio-primary);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 1.25;
          opacity: 0.62;
        }

        .portfolio-qualification-description {
          max-height: 25mm;
          margin: 4mm 0 0;
          overflow: hidden;
          border-inline-start: 2px solid rgba(15, 118, 110, 0.55);
          padding-inline-start: 4mm;
          color: #475569;
          font-weight: 650;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .portfolio-page-footer.portfolio-qualification-footer {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 6mm;
        }

        .portfolio-global-page-number::before {
          content: counter(portfolio-page);
        }

        .portfolio-qualification-section {
          width: 210mm;
          margin: 0 auto;
        }

        .portfolio-page-header,
        .portfolio-page-footer {
          position: absolute;
          left: 18mm;
          right: 18mm;
          z-index: 3;
          display: flex;
          justify-content: space-between;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .portfolio-page-header {
          top: 14mm;
        }

        .portfolio-page-footer {
          bottom: 12mm;
          border-top: 1px solid rgba(15, 118, 110, 0.22);
          padding-top: 8px;
          font-size: 10px;
        }

        .portfolio-title-pill,
        .portfolio-section-kicker {
          display: inline-flex;
          border-radius: 999px;
          background: var(--portfolio-muted);
          padding: 8px 20px;
          color: var(--portfolio-primary);
          font-size: 12px;
          font-weight: 950;
        }

        .portfolio-main-title {
          margin-top: 18px;
          color: var(--portfolio-secondary);
          font-size: 42px;
          font-weight: 950;
          line-height: 1.35;
        }

        .portfolio-subtitle {
          margin-top: 8px;
          color: var(--portfolio-primary);
          font-size: 18px;
          font-weight: 950;
        }

        .portfolio-cover-card,
        .portfolio-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 24px;
        }

        .portfolio-stat-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .portfolio-info-card,
        .portfolio-stat {
          border: 1px solid rgba(15, 118, 110, 0.16);
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.82);
          padding: 14px 16px;
        }

        .portfolio-info-card span,
        .portfolio-stat span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
        }

        .portfolio-info-card strong,
        .portfolio-stat strong {
          display: block;
          margin-top: 5px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.7;
        }

        .portfolio-stat {
          text-align: center;
        }

        .portfolio-stat strong {
          color: var(--portfolio-primary);
          font-size: 28px;
        }

        .portfolio-section-title {
          color: var(--portfolio-secondary);
          font-size: 30px;
          font-weight: 950;
          line-height: 1.45;
        }

        .portfolio-section-text {
          margin-top: 18px;
          color: #334155;
          font-size: 16px;
          font-weight: 700;
          line-height: 2.25;
        }

        .portfolio-introduction-section {
          width: 210mm;
          margin: 0 auto;
        }

        .portfolio-introduction-text {
          margin: 4mm 0 0;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.95;
          white-space: pre-wrap;
        }

        .portfolio-education-identity {
          margin-top: 7mm;
          border-top: 1px solid #dbe3e8;
        }

        .portfolio-identity-block {
          padding: 4mm 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .portfolio-identity-block h3,
        .portfolio-identity-list h3 {
          margin: 0 0 1.5mm;
          color: var(--portfolio-secondary);
          font-size: 13px;
          font-weight: 950;
        }

        .portfolio-identity-block p {
          margin: 0;
          color: #334155;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1.9;
          white-space: pre-wrap;
        }

        .portfolio-identity-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5mm;
          padding: 5mm 0 1mm;
        }

        .portfolio-identity-feature-card {
          position: relative;
          min-height: 49mm;
          overflow: hidden;
          border: 1px solid rgba(47, 109, 75, 0.2);
          border-radius: 5mm;
          padding: 5mm 5.5mm 5.5mm;
          background:
            linear-gradient(
              145deg,
              rgba(240, 247, 242, 0.98) 0%,
              rgba(255, 255, 255, 0.98) 72%
            );
          break-inside: avoid;
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-identity-feature-card::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 2.2mm;
          background: linear-gradient(
            90deg,
            #2f6d4b 0%,
            #5f9173 52%,
            #b9d2c2 100%
          );
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-identity-mission {
          background:
            linear-gradient(
              145deg,
              rgba(233, 243, 237, 0.98) 0%,
              rgba(255, 255, 255, 0.98) 74%
            );
        }

        .portfolio-identity-feature-heading {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 3mm;
        }

        .portfolio-identity-feature-icon {
          display: grid;
          width: 11mm;
          height: 11mm;
          flex: 0 0 11mm;
          place-items: center;
          border-radius: 50%;
          background: #2f6d4b;
          color: #ffffff;
          box-shadow: 0 2mm 5mm rgba(47, 109, 75, 0.16);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-identity-feature-icon svg {
          width: 5.5mm;
          height: 5.5mm;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .portfolio-identity-feature-label {
          display: block;
          margin-bottom: 0.5mm;
          color: #6f9f81;
          font-size: 8.5px;
          font-weight: 900;
        }

        .portfolio-identity-feature-card h3 {
          margin: 0;
          color: #20372d;
          font-size: 16px;
          font-weight: 950;
          line-height: 1.4;
        }

        .portfolio-identity-feature-card p {
          position: relative;
          z-index: 2;
          margin: 4mm 0 0;
          color: #33463d;
          font-size: 10.5px;
          font-weight: 750;
          line-height: 1.95;
          text-align: justify;
          white-space: pre-wrap;
        }

        .portfolio-identity-quote {
          position: absolute;
          top: 0.5mm;
          left: 4mm;
          z-index: 1;
          color: rgba(47, 109, 75, 0.12);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 34mm;
          font-weight: 700;
          line-height: 1;
          transform: rotate(4deg);
          pointer-events: none;
          user-select: none;
        }

        .portfolio-introduction-page .portfolio-education-identity {
          margin-top: 6mm;
          border-top: 0;
        }
        .portfolio-identity-lists {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10mm;
          padding-top: 5mm;
        }

        .portfolio-identity-list ol,
        .portfolio-objectives-list {
          margin: 0;
          padding-inline-start: 6mm;
        }

        .portfolio-identity-list li {
          padding: 1.6mm 0;
          border-bottom: 1px solid #edf1f3;
          color: #475569;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.6;
        }

        .portfolio-objectives-heading {
          padding-bottom: 4mm;
          border-bottom: 2px solid var(--portfolio-primary);
        }

        .portfolio-objectives-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 12mm;
          margin-top: 8mm;
          list-style-position: outside;
        }

        .portfolio-objectives-list li {
          min-height: 16mm;
          padding: 3mm 1mm 3mm 0;
          border-bottom: 1px solid #dbe3e8;
          color: #334155;
          font-size: 10.5px;
          font-weight: 800;
          line-height: 1.75;
          break-inside: avoid;
        }

        .portfolio-index-table {
          margin-top: 26px;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          overflow: hidden;
        }

        .portfolio-index-row {
          display: grid;
          grid-template-columns: 64px 1fr 96px;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          min-height: 46px;
        }

        .portfolio-index-row:last-child {
          border-bottom: 0;
        }

        .portfolio-index-row span,
        .portfolio-index-row strong {
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 950;
        }

        .portfolio-index-row span {
          color: #64748b;
        }

        .portfolio-index-row strong {
          color: #0f172a;
        }

        .portfolio-divider-hero {
          display: grid;
          min-height: 190mm;
          place-items: center;
          text-align: center;
        }

        .portfolio-divider-hero h2 {
          color: var(--portfolio-secondary);
          font-size: 38px;
          font-weight: 950;
          line-height: 1.45;
        }

        .portfolio-divider-hero p {
          margin: 18px auto 0;
          max-width: 560px;
          color: #64748b;
          font-size: 15px;
          font-weight: 800;
          line-height: 2.1;
        }

        .portfolio-empty {
          margin-top: 16px;
          border-radius: 16px;
          background: #f8fafc;
          padding: 14px 16px;
          color: #475569;
          font-size: 13px;
          font-weight: 800;
          line-height: 2;
        }

        .portfolio-report-frame {
          position: absolute;
          inset: 7mm;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          background: white;
        }

        .portfolio-report-band {
          position: absolute;
          top: 0;
          left: -20mm;
          right: -20mm;
          height: 10mm;
          border-radius: 0 0 28px 28px;
          background: linear-gradient(90deg, var(--portfolio-secondary), var(--portfolio-primary));
        }

        .portfolio-report-fixed-header,
        .portfolio-report-fixed-footer {
          position: absolute;
          left: 12mm;
          right: 12mm;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 950;
        }

        .portfolio-report-fixed-header {
          top: 13mm;
        }

        .portfolio-report-fixed-footer {
          bottom: 8mm;
          border-top: 4px solid transparent;
          border-image: linear-gradient(90deg, #7ccf9c, var(--portfolio-primary), var(--portfolio-secondary)) 1;
          padding-top: 7px;
        }

        .portfolio-report-body {
          position: relative;
          height: 100%;
          box-sizing: border-box;
          padding: 23mm 14mm 22mm;
          overflow: hidden;
        }

        .portfolio-report-header h1 {
          margin: 8px 0 2px;
          color: var(--portfolio-secondary);
          font-size: 28px;
          font-weight: 950;
          line-height: 1.35;
        }

        .portfolio-report-header p {
          margin: 0;
          color: var(--portfolio-primary);
          font-size: 13px;
          font-weight: 950;
        }

        .portfolio-report-sections {
          display: grid;
          gap: 2.5mm;
          margin-top: 2mm;
        }

        .portfolio-report-section {
          margin-top: 1mm;
        }

        .portfolio-report-section h2 {
          display: inline-flex;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--portfolio-secondary), var(--portfolio-primary));
          color: white;
          padding: 7px 22px;
          font-size: 13px;
          font-weight: 950;
          margin: 0;
        }

        .portfolio-report-detail-grid {
          margin-top: 3mm;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .portfolio-report-detail-box {
          min-height: 17mm;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: rgba(248, 250, 252, 0.7);
          padding: 8px 11px;
        }

        .portfolio-report-detail-box-wide {
          grid-column: 1 / -1;
        }

        .portfolio-report-detail-box span {
          display: block;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 950;
          line-height: 1.5;
        }

        .portfolio-report-detail-box strong {
          display: block;
          margin-top: 3px;
          color: #0f172a;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.7;
        }

        .portfolio-report-list {
          margin: 0;
          padding-inline-start: 18px;
        }

        .portfolio-report-narrative,
        .portfolio-report-empty {
          margin-top: 3mm;
          border-radius: 18px;
          padding: 12px 14px;
          font-size: 11px;
          line-height: 1.9;
        }

        .portfolio-report-narrative {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #1e293b;
          font-weight: 850;
          white-space: pre-line;
        }

        .portfolio-report-empty {
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          color: #64748b;
          font-weight: 900;
        }

        .portfolio-report-evidence-grid {
          margin-top: 3mm;
          display: grid;
          gap: 12px;
        }

        .portfolio-report-evidence-card {
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          overflow: visible;
          background: transparent;
          box-shadow: none;
          break-inside: avoid;
        }

        .portfolio-report-evidence-card img {
          width: 100%;
          object-fit: contain;
          border: 0;
          border-radius: 18px;
          background: transparent;
          box-shadow: none;
          display: block;
        }

        .portfolio-report-file-card {
          display: grid;
          place-items: center;
          border-block: 1px solid #e2e8f0;
          background: transparent;
          color: #64748b;
          font-size: 12px;
          font-weight: 950;
          text-align: center;
          padding: 8px 0;
          text-decoration: none;
        }

        .portfolio-page .portfolio-page-footer {
          bottom: 5.5mm;
          z-index: 5;
          border-top: 0;
          padding-top: 0;
          color: #ffffff;
        }

        .portfolio-report-page .portfolio-report-fixed-footer {
          bottom: 5mm;
          z-index: 6;
          border-top: 0;
          color: #ffffff;
        }

        @media print {
          .portfolio-page-wave {
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media print {
          .portfolio-identity-feature-card,
          .portfolio-identity-feature-icon,
          .portfolio-identity-feature-card::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        /* PORTFOLIO IDENTITY LISTS REDESIGN */

        .portfolio-identity-lists {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5mm;
          margin-top: 5mm;
          align-items: stretch;
        }

        .portfolio-identity-list {
          position: relative;
          min-height: 49mm;
          overflow: hidden;
          border: 1px solid rgba(47, 109, 75, 0.18);
          border-radius: 4.5mm;
          padding: 5mm 5.5mm;
          background:
            linear-gradient(
              145deg,
              rgba(244, 249, 246, 0.98) 0%,
              rgba(255, 255, 255, 0.98) 78%
            );
          break-inside: avoid;
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-identity-list::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 1.6mm;
          background: linear-gradient(
            90deg,
            #2f6d4b 0%,
            #6f9f81 55%,
            #dce9e1 100%
          );
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-identity-list h3 {
          position: relative;
          display: flex;
          align-items: center;
          gap: 2.5mm;
          margin: 0 0 3.5mm;
          color: #20372d;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.4;
        }

        .portfolio-identity-list h3::before {
          display: grid;
          width: 8.5mm;
          height: 8.5mm;
          flex: 0 0 8.5mm;
          place-items: center;
          border-radius: 50%;
          background: #2f6d4b;
          color: #ffffff;
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
          box-shadow: 0 1.5mm 4mm rgba(47, 109, 75, 0.15);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-identity-list:first-child h3::before {
          content: "◎";
        }

        .portfolio-identity-list:last-child h3::before {
          content: "✦";
        }

        .portfolio-identity-list ul,
        .portfolio-identity-list ol {
          display: grid;
          gap: 1.6mm;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .portfolio-identity-list li {
          position: relative;
          min-height: 7.5mm;
          margin: 0;
          border-bottom: 1px solid rgba(111, 159, 129, 0.18);
          padding: 1.5mm 5.5mm 1.8mm 1mm;
          color: #33463d;
          font-size: 9.5px;
          font-weight: 800;
          line-height: 1.6;
        }

        .portfolio-identity-list li:last-child {
          border-bottom: 0;
        }

        .portfolio-identity-list li::before {
          content: "";
          position: absolute;
          top: 3.1mm;
          right: 0;
          width: 2.4mm;
          height: 2.4mm;
          border: 1px solid #5a9b63;
          border-radius: 50%;
          background: #dce9e1;
          box-shadow: inset 0 0 0 0.65mm #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-objectives-page .portfolio-page-body {
          padding-top: 8mm;
        }

        .portfolio-objectives-page .portfolio-section-heading {
          margin-bottom: 6mm;
        }

        .portfolio-objectives-list {
          counter-reset: portfolio-objective;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3.5mm 4.5mm;
          margin: 5mm 0 0;
          padding: 0;
          list-style: none;
        }

        .portfolio-objectives-list li {
          counter-increment: portfolio-objective;
          position: relative;
          display: flex;
          min-height: 17mm;
          align-items: center;
          margin: 0;
          overflow: hidden;
          border: 1px solid rgba(47, 109, 75, 0.16);
          border-radius: 3.5mm;
          padding: 3.5mm 12mm 3.5mm 4mm;
          background:
            linear-gradient(
              135deg,
              rgba(242, 248, 244, 0.98) 0%,
              rgba(255, 255, 255, 0.98) 82%
            );
          color: #2e4138;
          font-size: 9.5px;
          font-weight: 850;
          line-height: 1.7;
          break-inside: avoid;
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-objectives-list li::before {
          content: counter(portfolio-objective, decimal-leading-zero);
          position: absolute;
          top: 50%;
          right: 3.2mm;
          display: grid;
          width: 7.5mm;
          height: 7.5mm;
          place-items: center;
          transform: translateY(-50%);
          border-radius: 50%;
          background: #2f6d4b;
          color: #ffffff;
          font-size: 7.5px;
          font-weight: 950;
          line-height: 1;
          box-shadow: 0 1.5mm 4mm rgba(47, 109, 75, 0.15);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-objectives-list li::after {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 1.2mm;
          height: 100%;
          background: #6f9f81;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-objectives-list li:nth-child(even) {
          background:
            linear-gradient(
              135deg,
              rgba(235, 245, 239, 0.98) 0%,
              rgba(255, 255, 255, 0.98) 82%
            );
        }

        @media print {
          .portfolio-identity-list,
          .portfolio-identity-list::after,
          .portfolio-identity-list h3::before,
          .portfolio-identity-list li::before,
          .portfolio-objectives-list li,
          .portfolio-objectives-list li::before,
          .portfolio-objectives-list li::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        /* PORTFOLIO OBJECTIVES SPACING FIX */

        .portfolio-objectives-page .portfolio-page-body {
          padding-top: 15mm;
        }

        .portfolio-objectives-page .portfolio-section-heading {
          margin-top: 5mm;
          margin-bottom: 8mm;
        }

        .portfolio-objectives-page .portfolio-objectives-list {
          margin-top: 7mm;
        }
        /* PORTFOLIO OBJECTIVES ACTUAL POSITION FIX */

        .portfolio-objectives-page .portfolio-section-heading,
        .portfolio-objectives-page .portfolio-objectives-list {
          position: relative;
          transform: translateY(14mm);
        }

        .portfolio-objectives-page .portfolio-section-heading {
          margin-bottom: 6mm;
        }

        .portfolio-objectives-page .portfolio-objectives-list {
          margin-top: 0;
        }
        /* PORTFOLIO OBJECTIVES BADGE SPACING FIX */

        .portfolio-objectives-page .portfolio-section-heading {
          padding-top: 7mm;
        }

        .portfolio-objectives-page .portfolio-section-kicker {
          display: inline-flex;
          margin-top: 4mm;
          margin-bottom: 3mm;
        }

        .portfolio-objectives-page .portfolio-section-heading h2 {
          margin-top: 0;
        }
        /* PORTFOLIO INTRODUCTION SINGLE PAGE */

        .portfolio-introduction-page .portfolio-page-body {
          padding-top: 7mm;
          padding-bottom: 29mm;
        }

        .portfolio-introduction-page .portfolio-section-title {
          font-size: 24px;
          line-height: 1.3;
        }

        .portfolio-introduction-page .portfolio-introduction-text {
          margin-top: 2.5mm;
          font-size: 9.2px;
          line-height: 1.75;
        }

        .portfolio-introduction-page .portfolio-education-identity {
          margin-top: 4mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-grid {
          gap: 3.5mm;
          padding-top: 3mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-card {
          min-height: 38mm;
          border-radius: 3.5mm;
          padding: 3.5mm 4mm 4mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-icon {
          width: 8mm;
          height: 8mm;
          flex-basis: 8mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-icon svg {
          width: 4.2mm;
          height: 4.2mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-label {
          font-size: 7px;
        }

        .portfolio-introduction-page .portfolio-identity-feature-card h3 {
          font-size: 12px;
        }

        .portfolio-introduction-page .portfolio-identity-feature-card p {
          margin-top: 2.5mm;
          font-size: 8px;
          line-height: 1.65;
          text-align: right;
        }

        .portfolio-introduction-page .portfolio-identity-quote {
          top: -1mm;
          left: 3mm;
          font-size: 24mm;
        }

        .portfolio-introduction-page .portfolio-identity-lists {
          gap: 3.5mm;
          margin-top: 3.5mm;
          padding-top: 0;
        }

        .portfolio-introduction-page .portfolio-identity-list {
          min-height: 31mm;
          border-radius: 3.5mm;
          padding: 3mm 4mm 3.5mm;
        }

        .portfolio-introduction-page .portfolio-identity-list h3 {
          margin-bottom: 1.5mm;
          font-size: 11px;
        }

        .portfolio-introduction-page .portfolio-identity-list h3::before {
          width: 6mm;
          height: 6mm;
          flex-basis: 6mm;
          font-size: 8px;
        }

        .portfolio-introduction-page .portfolio-identity-list ul,
        .portfolio-introduction-page .portfolio-identity-list ol {
          gap: 0;
        }

        .portfolio-introduction-page .portfolio-identity-list li {
          min-height: 4.6mm;
          padding: 0.7mm 4mm 0.7mm 0;
          font-size: 7.3px;
          line-height: 1.4;
        }

        .portfolio-introduction-page .portfolio-identity-list li::before {
          top: 1.7mm;
          width: 1.7mm;
          height: 1.7mm;
        }

        .portfolio-objectives-inline {
          margin-top: 4mm;
          border-top: 1px solid rgba(47, 109, 75, 0.2);
          padding-top: 3mm;
        }

        .portfolio-objectives-inline-heading {
          display: flex;
          align-items: center;
          gap: 2.5mm;
          margin-bottom: 3mm;
        }

        .portfolio-objectives-inline-icon {
          display: grid;
          width: 8mm;
          height: 8mm;
          flex: 0 0 8mm;
          place-items: center;
          border-radius: 50%;
          background: #2f6d4b;
          color: #ffffff;
          font-size: 10px;
          font-weight: 950;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .portfolio-objectives-inline-heading span:not(.portfolio-objectives-inline-icon) {
          display: block;
          color: #6f9f81;
          font-size: 7px;
          font-weight: 900;
        }

        .portfolio-objectives-inline-heading h3 {
          margin: 0.4mm 0 0;
          color: #20372d;
          font-size: 13px;
          font-weight: 950;
        }

        .portfolio-objectives-inline .portfolio-objectives-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 2mm 3mm;
          margin: 0;
          padding: 0;
        }

        .portfolio-objectives-inline .portfolio-objectives-list li {
          min-height: 10mm;
          border-radius: 2.5mm;
          padding: 2mm 9mm 2mm 2.5mm;
          font-size: 7.2px;
          line-height: 1.4;
        }

        .portfolio-objectives-inline .portfolio-objectives-list li::before {
          right: 2mm;
          width: 5.5mm;
          height: 5.5mm;
          font-size: 6px;
        }

        .portfolio-objectives-inline .portfolio-objectives-list li::after {
          width: 0.8mm;
        }

        @media print {
          .portfolio-objectives-inline-icon,
          .portfolio-objectives-inline .portfolio-objectives-list li,
          .portfolio-objectives-inline .portfolio-objectives-list li::before,
          .portfolio-objectives-inline .portfolio-objectives-list li::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        /* PORTFOLIO INTRODUCTION LARGE TYPOGRAPHY FIX */

        .portfolio-introduction-page .portfolio-page-body {
          padding-top: 18mm;
          padding-bottom: 29mm;
        }

        .portfolio-introduction-page .portfolio-section-heading {
          margin-top: 5mm;
          margin-bottom: 5mm;
        }

        .portfolio-introduction-page .portfolio-section-kicker {
          margin-bottom: 2.5mm;
          padding: 1.8mm 4mm;
          font-size: 11px;
          line-height: 1.3;
        }

        .portfolio-introduction-page .portfolio-section-title {
          margin-top: 0;
          font-size: 32px;
          line-height: 1.25;
        }

        .portfolio-introduction-page .portfolio-introduction-text {
          margin-top: 3mm;
          font-size: 14px;
          font-weight: 750;
          line-height: 1.8;
        }

        .portfolio-introduction-page .portfolio-education-identity {
          margin-top: 4mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-grid {
          gap: 3.5mm;
          padding-top: 2mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-card {
          min-height: 39mm;
          padding: 3.5mm 4mm 4mm;
        }

        .portfolio-introduction-page .portfolio-identity-feature-label {
          font-size: 10px;
        }

        .portfolio-introduction-page .portfolio-identity-feature-card h3 {
          font-size: 17px;
          line-height: 1.35;
        }

        .portfolio-introduction-page .portfolio-identity-feature-card p {
          margin-top: 2.5mm;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.65;
          text-align: right;
        }

        .portfolio-introduction-page .portfolio-identity-list {
          min-height: 32mm;
          padding: 3mm 4mm 3.5mm;
        }

        .portfolio-introduction-page .portfolio-identity-list h3 {
          margin-bottom: 1.5mm;
          font-size: 16px;
          line-height: 1.35;
        }

        .portfolio-introduction-page .portfolio-identity-list li {
          min-height: 4.8mm;
          padding: 0.6mm 4mm 0.6mm 0;
          font-size: 10.5px;
          font-weight: 800;
          line-height: 1.35;
        }

        .portfolio-objectives-inline {
          margin-top: 3mm;
          padding-top: 2.5mm;
        }

        .portfolio-objectives-inline-heading {
          margin-bottom: 2.5mm;
        }

        .portfolio-objectives-inline-heading span:not(.portfolio-objectives-inline-icon) {
          font-size: 9px;
        }

        .portfolio-objectives-inline-heading h3 {
          font-size: 17px;
          line-height: 1.3;
        }

        .portfolio-objectives-inline .portfolio-objectives-list {
          gap: 1.8mm 3mm;
        }

        .portfolio-objectives-inline .portfolio-objectives-list li {
          min-height: 9.5mm;
          padding: 1.8mm 8.5mm 1.8mm 2.5mm;
          font-size: 10px;
          font-weight: 850;
          line-height: 1.35;
        }

        .portfolio-objectives-inline .portfolio-objectives-list li::before {
          width: 5.5mm;
          height: 5.5mm;
          font-size: 7px;
        }
        /* PORTFOLIO INTRODUCTION HEADING ALIGNMENT FIX */

        .portfolio-introduction-page .portfolio-page-body {
          padding-top: 18mm;
        }

        .portfolio-introduction-page .portfolio-section-heading {
          position: relative;
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: flex-start;
          margin: 0 0 5mm;
          padding: 0;
          transform: none;
          text-align: right;
        }

        .portfolio-introduction-page .portfolio-section-kicker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: 0 0 2.5mm;
          padding: 1.8mm 4mm;
          transform: none;
        }

        .portfolio-introduction-page .portfolio-section-title {
          width: 100%;
          margin: 0;
          padding: 0;
          transform: none;
          text-align: right;
        }

        .portfolio-introduction-page .portfolio-introduction-text {
          width: 100%;
          margin: 3mm 0 0;
          text-align: right;
        }

        .portfolio-introduction-page .portfolio-education-identity {
          margin-top: 5mm;
        }
        /* PORTFOLIO INTRODUCTION REAL VERTICAL POSITION FIX */

        .portfolio-introduction-page .portfolio-page-body {
          padding-top: 0 !important;
        }

        .portfolio-introduction-page .portfolio-page-body > .portfolio-section-heading {
          margin-top: 24mm !important;
          margin-bottom: 4mm !important;
          transform: none !important;
        }

        .portfolio-introduction-page .portfolio-section-kicker {
          margin: 0 0 3mm !important;
          transform: none !important;
        }

        .portfolio-introduction-page .portfolio-section-title {
          margin: 0 !important;
          transform: none !important;
        }

        .portfolio-introduction-page .portfolio-introduction-text {
          margin-top: 4mm !important;
        }

        .portfolio-introduction-page .portfolio-education-identity {
          margin-top: 6mm !important;
        }
        /* PORTFOLIO INTRODUCTION REAL VERTICAL POSITION FIX */

        .portfolio-introduction-page .portfolio-page-body {
          padding-top: 0 !important;
        }

        .portfolio-introduction-page .portfolio-page-body > .portfolio-section-heading {
          margin-top: 24mm !important;
          margin-bottom: 4mm !important;
          transform: none !important;
        }

        .portfolio-introduction-page .portfolio-section-kicker {
          margin: 0 0 3mm !important;
          transform: none !important;
        }

        .portfolio-introduction-page .portfolio-section-title {
          margin: 0 !important;
          transform: none !important;
        }

        .portfolio-introduction-page .portfolio-introduction-text {
          margin-top: 4mm !important;
        }

        .portfolio-introduction-page .portfolio-education-identity {
          margin-top: 6mm !important;
        }
        /* PORTFOLIO INTRODUCTION HEADER OVERLAP FINAL FIX */

        .portfolio-introduction-page .portfolio-page-body {
          padding-top: 31mm !important;
        }

        .portfolio-introduction-page .portfolio-page-body > .portfolio-section-heading {
          margin-top: 0 !important;
          margin-bottom: 5mm !important;
          transform: none !important;
        }

        .portfolio-introduction-page .portfolio-section-kicker {
          margin-top: 0 !important;
          margin-bottom: 3mm !important;
        }

        .portfolio-introduction-page .portfolio-section-title {
          margin: 0 !important;
        }

        .portfolio-introduction-page .portfolio-introduction-text {
          margin-top: 4mm !important;
        }
        /* iOS / Safari print fragmentation compatibility */
        @media print {
          .portfolio-print-root {
            display: block !important;
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            overflow: visible !important;
          }

          .portfolio-page,
          .portfolio-report-page {
            display: block !important;
            position: relative !important;
            box-sizing: border-box !important;

            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;

            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;

            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;

            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }

          .portfolio-page-body,
          .portfolio-report-frame,
          .portfolio-report-body {
            box-sizing: border-box !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <section className="portfolio-page portfolio-cover-page" style={{ order: -10000 }}>
        <div className="portfolio-page-body">
          <div style={{ minHeight: "220mm", display: "grid", alignContent: "center" }}>
            <PortfolioCoverOfficialLogos
              ministryLogoSrc="/uploads/school-logos/MOE.png"
              visionLogoSrc="/uploads/school-logos/VISION2030.png"
              tone="light"
            />
            <div className="portfolio-title-pill">Teachix | الاسهل والاشمل</div>
            <h1 className="portfolio-main-title">{data.portfolio.title}</h1>
            <p className="portfolio-subtitle">
              {data.owner.jobTitle} · {data.portfolio.term}
            </p>

            <div className="portfolio-cover-card">
              <MiniInfo label="صاحب الملف" value={data.owner.name} />
              {data.portfolio.preferences.showSchoolName ? (
                <MiniInfo label="المدرسة" value={data.school.name} />
              ) : null}
              <MiniInfo label="العام" value={data.portfolio.academicYear} />
              <MiniInfo label="الفصل الدراسي" value={data.portfolio.term} />
            </div>

            {data.portfolio.preferences.showCoverStatistics ? (
            <div className="portfolio-stat-grid">
              <div className="portfolio-stat">
                <strong>{enabledSections.length}</strong>
                <span>أقسام الأداء</span>
              </div>
              <div className="portfolio-stat">
                <strong>{data.totals.reports}</strong>
                <span>تقرير</span>
              </div>
              <div className="portfolio-stat">
                <strong>{data.totals.evidences}</strong>
                <span>شاهد</span>
              </div>
            </div>
            ) : null}
          </div>
        </div>

        <PortfolioPageWave />

        <div className="portfolio-page-footer">
          <span>{data.portfolio.preferences.showSchoolName ? data.school.name : ""}</span>
          <span>ملف الإنجاز</span>
        </div>
      </section>

      {data.portfolio.preferences.showTableOfContents ? (
      <PageShell pageLabel="الفهرس" className="portfolio-index-page" style={{ order: -9999 }}>
        <span className="portfolio-section-kicker">المحتويات</span>
        <h2 className="portfolio-section-title">فهرس الملف</h2>

        <div className="portfolio-index-table" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {data.sections
            .filter((section) => section.isEnabled)
            .sort((first, second) => first.sortOrder - second.sortOrder)
            .map((section, index) => (
            <div key={section.id} className="portfolio-index-row">
              <span>{index + 1}</span>
              <strong>{section.title}</strong>
              <span>قسم</span>
            </div>
          ))}
        </div>
      </PageShell>
      ) : null}

      <style>{`
        .portfolio-introduction-page .portfolio-section-title { font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif; font-size: 32px !important; font-weight: 900; line-height: 1.3; }
        .portfolio-introduction-page .portfolio-introduction-text { font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif; font-size: 16px !important; font-weight: 600; line-height: 2; max-width: 165mm; text-align: justify; text-justify: inter-word; }
        .portfolio-identity-physical-page .portfolio-identity-page-heading h1 { font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif; font-size: 30px !important; font-weight: 900; line-height: 1.3; }
        .portfolio-identity-physical-page .portfolio-educational-identity-content h2 { font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif; font-size: 17px !important; font-weight: 900; line-height: 1.4; }
        .portfolio-identity-physical-page .portfolio-educational-identity-content p { font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif; font-size: 12px !important; line-height: 1.8; }
        .portfolio-identity-physical-page .portfolio-educational-identity-content li { font-family: var(--font-cairo), "Cairo", Tahoma, Arial, sans-serif; font-size: 11px !important; line-height: 1.7; }
      `}</style>
      {sectionEnabled("introduction") ? (
        <div className="portfolio-introduction-section">
          <PageShell pageLabel="المقدمة" className="portfolio-introduction-page">
            <span className="portfolio-section-kicker">مدخل الملف</span>
            <h2 className="portfolio-section-title">المقدمة</h2>
            <p className="portfolio-introduction-text">
              {data.portfolio.introText || "يعرض هذا الملف أبرز الأعمال والتقارير والشواهد المهنية خلال الفصل الدراسي."}
            </p>
          </PageShell>
        </div>
      ) : null}

      {sectionEnabled("educational-identity") ? (
        <PageShell pageLabel="الهوية التعليمية" className="portfolio-identity-physical-page">
          <PortfolioEducationalIdentityContent data={data} variant="ministry" />
        </PageShell>
      ) : null}

      {sectionEnabled("profile") ? (
      <PageShell pageLabel="السيرة المهنية" className="portfolio-biography-page" style={{ order: sectionOrder("profile") }}>
        <span className="portfolio-section-kicker">صاحب الملف</span>
        <h2 className="portfolio-section-title">السيرة المهنية</h2>
        <div className="portfolio-cover-card">
          <MiniInfo label="الاسم" value={data.owner.name} />
          <MiniInfo label="المسمى" value={data.owner.jobTitle} />
          {data.portfolio.preferences.showSchoolName ? <MiniInfo label="المدرسة" value={data.school.name} /> : null}
          {data.portfolio.preferences.showPrincipalName ? <MiniInfo label="مدير المدرسة" value={data.school.principalName || "غير محدد"} /> : null}
        </div>
        {data.biography.professionalSummary ? <p className="portfolio-section-text">{data.biography.professionalSummary}</p> : null}
        <div className="portfolio-cover-card">
          <MiniInfo label="التخصص" value={data.biography.specialization} />
          <MiniInfo label="المؤهل العلمي" value={data.biography.academicQualification} />
          <MiniInfo label="سنوات الخبرة" value={data.biography.yearsOfExperience} />
          <MiniInfo label="المهارات" value={data.biography.skills} />
          <MiniInfo label="الاهتمامات المهنية" value={data.biography.professionalInterests} />
        </div>
      </PageShell>
      ) : null}

      {sectionEnabled("qualifications") ? (
        <div className="portfolio-qualification-section" style={{ order: sectionOrder("qualifications") }}>
          {visibleQualificationItems.length ? visibleQualificationItems
            .slice()
            .sort((first, second) => first.sortOrder - second.sortOrder)
            .map((item) => <PortfolioQualificationDocumentPage key={item.id} data={data} item={item} />) : (
            <PageShell pageLabel="المؤهلات والدورات" className="portfolio-qualifications-page">
              <span className="portfolio-section-kicker">تطوير مهني</span>
              <h2 className="portfolio-section-title">المؤهلات والدورات</h2>
              <div className="portfolio-empty">لا توجد مؤهلات أو دورات مضافة حتى الآن.</div>
            </PageShell>
          )}
        </div>
      ) : null}

      {enabledSections.map((section) => (
        <div key={section.key} style={{ order: section.sortOrder }}>
          {data.portfolio.preferences.showPerformanceDividers ? (
          <PageShell pageLabel={section.title} className="portfolio-divider-page">
            <div className="portfolio-divider-hero">
              <div>
                <h2>{section.title}</h2>
                <p>{section.intro}</p>

                <div className="portfolio-stat-grid">
                  {data.showWeights !== false ? <div className="portfolio-stat">
                    <strong>{section.weight}%</strong>
                    <span>الوزن النسبي</span>
                  </div> : null}
                  <div className="portfolio-stat">
                    <strong>{section.reports.length}</strong>
                    <span>تقرير</span>
                  </div>
                  <div className="portfolio-stat">
                    <strong>
                      {section.reports.reduce(
                        (total, report) => total + report.evidenceCount,
                        0,
                      )}
                    </strong>
                    <span>شاهد</span>
                  </div>
                </div>
              </div>
            </div>
          </PageShell>
          ) : null}

          {section.linkedOutputs.flatMap((output) => output.content.kind === "curriculum-distribution"
            ? MinistryCurriculumPages({ output, sectionTitle: section.title, physicalDocument })
            : MinistryActivityOutputPages({ output, sectionTitle: section.title, physicalDocument }))}

          {section.reports.length ? (
            section.reports.map((report) =>
              report.content ? (
                <PortfolioDesignedReportPage key={report.id} report={report.content} physicalDocument={physicalDocument} reportId={report.id} />
              ) : (
                <PageShell key={report.id} pageLabel={section.title}>
                  <span className="portfolio-section-kicker">تقرير</span>
                  <h2 className="portfolio-section-title">{report.title}</h2>
                  <div className="portfolio-empty">
                    هذا التقرير من مصدر قديم وسيتم تحويله لاحقًا إلى الشكل الموحد.
                  </div>
                </PageShell>
              ),
            )
          ) : (
            <PageShell pageLabel={section.title}>
              <span className="portfolio-section-kicker">التقارير والشواهد</span>
              <h2 className="portfolio-section-title">{section.title}</h2>
              <div className="portfolio-empty">لا توجد تقارير لهذا العنصر حتى الآن.</div>
            </PageShell>
          )}

          {data.customEvidence
            .filter((item) => item.sectionId === section.id && item.isVisible && item.fileUrl)
            .sort((first, second) => first.sortOrder - second.sortOrder)
            .map((item) => (
              <PageShell key={item.id} pageLabel={section.title}>
                <span className="portfolio-section-kicker">شاهد مستقل</span>
                <h2 className="portfolio-section-title">{item.title}</h2>
                {item.description ? <p className="portfolio-section-text">{item.description}</p> : null}
                {/\.(png|jpe?g|webp|gif)$/i.test(item.fileUrl) || item.mimeType.startsWith("image/") ? (
                  <img src={item.fileUrl} alt={item.title} style={{ display: "block", width: "100%", maxHeight: "175mm", objectFit: "contain", marginTop: "8mm" }} />
                ) : (
                  <div className="portfolio-empty">ملف مرفق: {item.fileUrl}</div>
                )}
              </PageShell>
            ))}
        </div>
      ))}

      {sectionEnabled("reports-evidence") ? data.customEvidence
        .filter((item) => !item.sectionId && item.isVisible && item.fileUrl)
        .sort((first, second) => first.sortOrder - second.sortOrder)
        .map((item) => (
          <PageShell key={item.id} pageLabel="شاهد مستقل" style={{ order: sectionOrder("reports-evidence") }}>
            <span className="portfolio-section-kicker">شاهد مستقل</span>
            <h2 className="portfolio-section-title">{item.title}</h2>
            {item.description ? <p className="portfolio-section-text">{item.description}</p> : null}
            {/\.(png|jpe?g|webp|gif)$/i.test(item.fileUrl) || item.mimeType.startsWith("image/") ? (
              <img src={item.fileUrl} alt={item.title} style={{ display: "block", width: "100%", maxHeight: "175mm", objectFit: "contain", marginTop: "8mm" }} />
            ) : <div className="portfolio-empty">ملف مرفق: {item.fileUrl}</div>}
          </PageShell>
        )) : null}

      {sectionEnabled("closing") ? (
      <PageShell pageLabel="الخاتمة" className="portfolio-conclusion-page" style={{ order: sectionOrder("closing") }}>
        <span className="portfolio-section-kicker">ختام الملف</span>
        <h2 className="portfolio-section-title">الخاتمة</h2>
        <p className="portfolio-section-text">
          {data.portfolio.conclusionText ||
            "ختامًا، يمثل هذا الملف توثيقًا مختصرًا لأبرز الإنجازات وفرص التطوير القادمة."}
        </p>
      </PageShell>
      ) : null}
    </div>
  );
}
