import type { CSSProperties, ReactNode } from "react";

import {
  buildPortfolioReportPages,
  getPortfolioEvidenceImageHeightMm,
  getPortfolioEvidencePerPage,
} from "@/components/portfolio/print/portfolio-print-pagination";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { PortfolioCoverOfficialLogos } from "@/components/portfolio/print/portfolio-cover-official-logos";
import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";
import { chunkPortfolioItems } from "@/components/portfolio/print/portfolio-print-pagination";
import type { PortfolioServiceOutput } from "@/lib/portfolio/service-outputs/service-output-types";
import type { PortfolioPhysicalDocument } from "@/lib/portfolio/layout/portfolio-physical-types";
import { getPlannedServiceOutputWeeks } from "@/lib/portfolio/layout/portfolio-physical-planner";
import { getBalancedPortfolioFieldRows } from "@/lib/portfolio/layout/portfolio-field-layout";

const MOE_2024 = {
  navy: "#15445A",
  green: "#07A869",
  blue: "#3D7EB9",
  teal: "#0DA9A6",
  gold: "#C1B48A",
  gray: "#C2C1C1",
  paper: "#FFFFFF",
  soft: "#F5F7F6",
  ink: "#18313D",
  muted: "#63737B",
  line: "#D9E0E2",
} as const;

function renderFieldValue(value: string | string[]) {
  if (Array.isArray(value)) {
    return (
      <ul className="moe24-report-list">
        {value.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  return value || "غير محدد";
}

function BrandRule() {
  return <div className="moe24-brand-rule" aria-hidden="true" />;
}

function PageNumber() {
  return <span className="moe24-page-number" aria-label="رقم الصفحة" />;
}

function MoePage({
  children,
  sectionLabel,
  className = "",
  style,
}: {
  children: ReactNode;
  sectionLabel: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      className={`moe24-page ${className}`}
      style={style}
      data-page-label={sectionLabel}
    >
      <BrandRule />

      <header className="moe24-page-header">
        <div className="moe24-header-brand">
          <span className="moe24-header-dot" aria-hidden="true" />
          <span>ملف الإنجاز</span>
        </div>
        <span>{sectionLabel}</span>
      </header>

      <main className="moe24-page-body">{children}</main>

      <footer className="moe24-page-footer">
        <span>Teachix | الاسهل والاشمل</span>
        <span>{sectionLabel}</span>
        <PageNumber />
      </footer>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="moe24-section-heading">
      {eyebrow ? <span className="moe24-eyebrow">{eyebrow}</span> : null}
      <h2>{title}</h2>
      <span className="moe24-heading-rule" aria-hidden="true" />
      {description ? <p>{description}</p> : null}
    </header>
  );
}

function MoeCurriculumPages({ output, sectionTitle, physicalDocument }: { output: PortfolioServiceOutput; sectionTitle: string; physicalDocument?: PortfolioPhysicalDocument }) {
  const content = output.content;
  const plannedWeeks = getPlannedServiceOutputWeeks(physicalDocument, output.id);
  const pageWeeks = plannedWeeks.length ? plannedWeeks : chunkPortfolioItems(content.weeks, Math.ceil(content.weeks.length / 2));
  return pageWeeks.map((weeks, index) => (
    <MoePage key={`${output.id}-${index}`} sectionLabel={sectionTitle} className="moe24-curriculum-page">
      <style>{`.moe24-curriculum-page .moe24-curriculum-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0 12px}.moe24-curriculum-page .moe24-curriculum-meta>div{padding:7px;border:1px solid #d9e0e2;background:#f5f7f6;border-radius:5px}.moe24-curriculum-page .moe24-curriculum-meta span,.moe24-curriculum-page .moe24-curriculum-meta strong{display:block}.moe24-curriculum-page .moe24-curriculum-meta span{font-size:8px;color:#63737b;font-weight:800}.moe24-curriculum-page .moe24-curriculum-meta strong{font-size:10px;color:#15445a;margin-top:2px}.moe24-curriculum-page .moe24-curriculum-list{display:grid;gap:7px}.moe24-curriculum-page .moe24-curriculum-row{display:grid;grid-template-columns:26% 1fr;gap:10px;padding:9px;border:1px solid #d9e0e2;border-top:3px solid #07a869;background:#fff;break-inside:avoid}.moe24-curriculum-page .moe24-curriculum-row header strong,.moe24-curriculum-page .moe24-curriculum-row header span,.moe24-curriculum-page .moe24-curriculum-row header small{display:block}.moe24-curriculum-page .moe24-curriculum-row header strong{font-size:11px;color:#15445a}.moe24-curriculum-page .moe24-curriculum-row header span{font-size:9px;color:#07a869;font-weight:800;margin-top:2px}.moe24-curriculum-page .moe24-curriculum-row header small{font-size:7px;color:#63737b;margin-top:6px}.moe24-curriculum-page .moe24-curriculum-row section{margin-bottom:4px}.moe24-curriculum-page .moe24-curriculum-row section>b{font-size:9px;color:#15445a}.moe24-curriculum-page .moe24-curriculum-row ul{margin:2px 0 0;padding-inline-start:15px;font-size:8px;line-height:1.55}.moe24-curriculum-page .moe24-curriculum-badge{display:inline-block;padding:3px 6px;margin:0 0 4px 4px;background:#e7f7ef;color:#15445a;border-radius:3px;font-size:8px;font-weight:800}`}</style>
      <style>{`.moe24-curriculum-page .moe24-curriculum-meta{gap:4px;margin:5px 0 7px}.moe24-curriculum-page .moe24-curriculum-meta>div{padding:4px 6px}.moe24-curriculum-page .moe24-curriculum-list{gap:3px}.moe24-curriculum-page .moe24-curriculum-row{grid-template-columns:23% 1fr;gap:6px;padding:5px 6px;border-top-width:2px}.moe24-curriculum-page .moe24-curriculum-row header strong{font-size:10px}.moe24-curriculum-page .moe24-curriculum-row header span{font-size:8px;margin-top:1px}.moe24-curriculum-page .moe24-curriculum-row header small{font-size:7px;margin-top:3px}.moe24-curriculum-page .moe24-curriculum-row section{margin-bottom:2px}.moe24-curriculum-page .moe24-curriculum-row section>b{font-size:8px}.moe24-curriculum-page .moe24-curriculum-row ul{margin:0;padding-inline-start:12px;font-size:7.5px;line-height:1.25}.moe24-curriculum-page .moe24-curriculum-badge{padding:2px 5px;margin:0 0 2px 3px;font-size:7px}`}</style>
      <style>{`.moe24-curriculum-page .moe24-curriculum-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.moe24-curriculum-page .moe24-curriculum-row{display:block;padding:5px}.moe24-curriculum-page .moe24-curriculum-row header{margin-bottom:3px;padding-bottom:3px;border-bottom:1px solid #d9e0e2}.moe24-curriculum-page .moe24-curriculum-row header small{white-space:nowrap}.moe24-curriculum-page .moe24-curriculum-row ul{padding-inline-start:11px}`}</style>
      <style>{`.moe24-curriculum-page .moe24-curriculum-row header strong,.moe24-curriculum-page .moe24-curriculum-row section>b{font-weight:900}.moe24-curriculum-page .moe24-curriculum-row section>b{display:block;margin-bottom:1px}`}</style>
      <SectionHeading eyebrow={index ? "مخرجات مرتبطة" : sectionTitle} title={output.displayTitle} />
      {!index ? <div className="moe24-curriculum-meta">{[["المادة", content.subject], ["المرحلة", content.stage], ["الصف / السنة", content.grade], ["الفصل الدراسي", content.semester]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> : null}
      <div className="moe24-curriculum-list">{weeks.map((week) => <article className="moe24-curriculum-row" key={week.id}><header><strong>{week.kind === "BREAK" ? week.title : `الأسبوع ${week.sequence}`}</strong>{week.kind === "CALENDAR_WEEK" ? <span>{week.title}</span> : null}<small>{week.gregorianRange}</small></header><div>{week.kind !== "CURRICULUM_WEEK" ? <b className="moe24-curriculum-badge">{week.title}</b> : null}{week.units.map((unit) => <section key={unit.name}><b>{unit.name}</b><ul>{unit.lessons.map((lesson, lessonIndex) => <li key={`${unit.name}-${lessonIndex}`}>{lesson}</li>)}</ul></section>)}{week.standalone.map((lesson, lessonIndex) => <b className="moe24-curriculum-badge" key={`${lesson}-${lessonIndex}`}>{lesson}</b>)}</div></article>)}</div>
    </MoePage>
  ));
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="moe24-info-row">
      <span>{label}</span>
      <strong>{value || "غير محدد"}</strong>
    </div>
  );
}

function IntroFeature({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "blue" | "green";
}) {
  return (
    <section className={`moe24-intro-feature moe24-intro-feature-${tone}`}>
      <span className="moe24-quote" aria-hidden="true">
        “
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function QualificationPage({
  data,
  item,
}: {
  data: PortfolioPrintData;
  item: PortfolioPrintData["qualificationItems"][number];
}) {
  const typeLabel =
    item.type === "QUALIFICATION"
      ? "مؤهل"
      : item.type === "COURSE"
        ? "دورة"
        : "شهادة";

  const hasImage =
    Boolean(item.attachmentUrl) &&
    (item.attachmentKind === "IMAGE" ||
      item.attachmentMimeType.startsWith("image/") ||
      /\.(?:jpe?g|png|webp|gif|svg)(?:\?.*)?$/i.test(item.attachmentUrl));

  const metadata = [
    item.issuer,
    item.date,
    item.hours ? `${item.hours} ساعة` : "",
  ].filter(Boolean);

  return (
    <MoePage
      sectionLabel="المؤهلات والدورات"
      className="moe24-qualification-page"
    >
      <SectionHeading eyebrow={typeLabel} title={item.title} />

      {metadata.length ? (
        <div className="moe24-qualification-meta">
          {metadata.map((value, index) => (
            <span key={`${value}-${index}`}>{value}</span>
          ))}
        </div>
      ) : null}

      <div className="moe24-qualification-media">
        {hasImage ? (
          <img src={item.attachmentUrl} alt={item.title} />
        ) : (
          <div className="moe24-media-placeholder">
            <span>لا توجد صورة مرفقة</span>
          </div>
        )}
      </div>

      {item.description ? (
        <p className="moe24-qualification-description">{item.description}</p>
      ) : null}

      <span className="moe24-owner-note">
        {data.owner.name}
        {data.portfolio.preferences.showSchoolName ? ` · ${data.school.name}` : ""}
      </span>
    </MoePage>
  );
}

function EvidenceFigure({
  item,
  title,
  heightMm,
  fit,
}: {
  item: PortfolioReportContent["evidenceItems"][number];
  title: string;
  heightMm: number;
  fit: "contain" | "cover";
}) {
  const isImage =
    item.type === "IMAGE" ||
    Boolean(item.url && /\.(png|jpe?g|webp|gif|svg)$/i.test(item.url));

  if (!item.url) return null;

  if (!isImage) {
    return (
      <a
        className="moe24-file-attachment"
        href={item.url}
        target="_blank"
        rel="noreferrer"
      >
        ملف مرفق
      </a>
    );
  }

  return (
    <figure className="moe24-evidence-figure">
      <img
        src={item.url}
        alt={title}
        style={{ height: `${heightMm}mm`, objectFit: fit }}
      />
    </figure>
  );
}

/* MOE24 MODERN REPORT DETAILS ICON LAYOUT */

type Moe24ReportFieldVisual = {
  icon:
    | "document"
    | "book"
    | "tasks"
    | "clipboard"
    | "chart"
    | "target"
    | "calendar"
    | "clock"
    | "person"
    | "note";
  tone: "teal" | "green";
};

function getMoe24ReportFieldVisual(
  label: string,
  index: number,
): Moe24ReportFieldVisual {
  const normalizedLabel = label.trim();

  if (
    normalizedLabel.includes("السجل") ||
    normalizedLabel.includes("البرنامج") ||
    normalizedLabel.includes("التقرير")
  ) {
    return { icon: "document", tone: "green" };
  }

  if (
    normalizedLabel.includes("المجال") ||
    normalizedLabel.includes("المادة") ||
    normalizedLabel.includes("التدريس")
  ) {
    return { icon: "book", tone: "teal" };
  }

  if (
    normalizedLabel.includes("المهام") ||
    normalizedLabel.includes("الأعمال") ||
    normalizedLabel.includes("الطلاب") ||
    normalizedLabel.includes("الطالبات")
  ) {
    return { icon: "tasks", tone: "teal" };
  }

  if (
    normalizedLabel.includes("الوصف") ||
    normalizedLabel.includes("الخطة") ||
    normalizedLabel.includes("التنفيذ")
  ) {
    return { icon: "clipboard", tone: "green" };
  }

  if (
    normalizedLabel.includes("الإنجاز") ||
    normalizedLabel.includes("المستوى") ||
    normalizedLabel.includes("النسبة")
  ) {
    return { icon: "chart", tone: "teal" };
  }

  if (
    normalizedLabel.includes("النتيجة") ||
    normalizedLabel.includes("الهدف")
  ) {
    return { icon: "target", tone: "green" };
  }

  if (
    normalizedLabel.includes("التاريخ") ||
    normalizedLabel.includes("اليوم")
  ) {
    return { icon: "calendar", tone: "green" };
  }

  if (
    normalizedLabel.includes("المدة") ||
    normalizedLabel.includes("الوقت")
  ) {
    return { icon: "clock", tone: "teal" };
  }

  if (
    normalizedLabel.includes("المنفذ") ||
    normalizedLabel.includes("المعلم") ||
    normalizedLabel.includes("المسؤول")
  ) {
    return { icon: "person", tone: "green" };
  }

  return {
    icon: "note",
    tone: index % 2 === 0 ? "teal" : "green",
  };
}

function Moe24ReportFieldIcon({
  icon,
}: {
  icon: Moe24ReportFieldVisual["icon"];
}) {
  if (icon === "document") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 12h5M10 16h5" />
      </svg>
    );
  }

  if (icon === "book") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M4 5.5c2.8-.8 5.4-.2 8 1.7v12c-2.6-1.9-5.2-2.5-8-1.7z" />
        <path d="M20 5.5c-2.8-.8-5.4-.2-8 1.7v12c2.6-1.9 5.2-2.5 8-1.7z" />
      </svg>
    );
  }

  if (icon === "tasks") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="9" cy="9" r="3" />
        <circle cx="16.5" cy="10" r="2.5" />
        <path d="M4.5 19c.8-3.1 2.9-4.7 6.2-4.7S16 15.9 16.8 19" />
        <path d="M15 15.2c2.5.1 4 1.4 4.5 3.8" />
      </svg>
    );
  }

  if (icon === "clipboard") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M8 5h8v3H8z" />
        <path d="M6 7h12v14H6z" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    );
  }

  if (icon === "chart") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M5 20v-5h3v5zM11 20v-9h3v9zM17 20V5h3v15z" />
      </svg>
    );
  }

  if (icon === "target") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" />
        <path d="m15.5 8.5 4-4M16.8 4.5h2.7v2.7" />
      </svg>
    );
  }

  if (icon === "calendar") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M5 6h14v14H5z" />
        <path d="M8 3v5M16 3v5M5 10h14" />
        <path d="M8 14h2M12 14h2M16 14h1M8 17h2M12 17h2" />
      </svg>
    );
  }

  if (icon === "clock") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (icon === "person") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20c.7-4 2.7-6 6-6s5.3 2 6 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M5 19h4l10-10-4-4L5 15z" />
      <path d="m13 7 4 4M5 19l3-1-2-2z" />
    </svg>
  );
}
function MoeReportPages({ report }: { report: PortfolioReportContent }) {
  const pages = buildPortfolioReportPages(report);
  const evidenceHeightMm = getPortfolioEvidenceImageHeightMm(report);
  const evidenceColumns =
    getPortfolioEvidencePerPage(report) <= 1
      ? "minmax(0, 1fr)"
      : "repeat(2, minmax(0, 1fr))";

  return (
    <>
      {pages.map((page, pageIndex) => (
        <MoePage
          key={page.key}
          sectionLabel={report.serviceName || "التقرير"}
          className="moe24-report-page"
        >
          <header className="moe24-report-title">
            <span>{report.serviceName || report.subtitle || "تقرير"}</span>
            <div className="moe24-report-title-row">
              <span
                className="moe24-report-title-accent"
                aria-hidden="true"
              />
              <h1>{report.title}</h1>
            </div>
            <small>
              صفحة {pageIndex + 1} من {pages.length}
            </small>
          </header>

          <div className="moe24-report-sections">
            {page.sections.map((section, sectionIndex) => {
              if (section.kind === "details") {
                if (!section.fields.length) return null;

                return (
                  <section
                    key={`details-${page.key}-${sectionIndex}`}
                    className="moe24-report-section moe24-report-details-section"
                  >
                    <h2>التفاصيل</h2>

                    <div className="moe24-report-details-panel">
                      <div className="moe24-report-detail-grid">
                        {getBalancedPortfolioFieldRows(section.fields).flatMap((row) =>
                          row.map(({ field, span, index }) => {
                          const fieldItems = Array.isArray(field.value)
                            ? field.value
                                .map((item) => item.trim())
                                .filter(Boolean)
                            : [];

                          const serializedValue = Array.isArray(field.value)
                            ? fieldItems.join(" ")
                            : String(field.value).trim();

                          const isCompactArray =
                            Array.isArray(field.value) &&
                            fieldItems.length > 0 &&
                            fieldItems.length <= 4 &&
                            serializedValue.length <= 150 &&
                            fieldItems.every((item) => item.length <= 70);

                          const wide = span === 4;

                          const visual = getMoe24ReportFieldVisual(
                            field.label,
                            index,
                          );

                          return (
                            <article
                              key={`${field.key}-${field.label}`}
                              className={[
                                "moe24-report-field",
                                `moe24-report-field-${visual.tone}`,
                                wide ? "moe24-report-field-wide" : "",
                                isCompactArray
                                  ? "moe24-report-field-compact-list"
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              style={{ gridColumn: `span ${span}` }}
                            >
                              <span
                                className="moe24-report-field-icon"
                                aria-hidden="true"
                              >
                                <Moe24ReportFieldIcon icon={visual.icon} />
                              </span>

                              <div className="moe24-report-field-content">
                                <div className="moe24-report-field-label">
                                  <span
                                    className="moe24-report-field-dot"
                                    aria-hidden="true"
                                  />
                                  <span>{field.label}</span>
                                </div>

                                <strong>
                                  {renderFieldValue(field.value)}
                                </strong>
                              </div>
                            </article>
                          );
                        }),
                        )}
                      </div>
                    </div>
                  </section>
                );
              }

              if (section.kind === "narrative") {
                if (!section.body.trim()) return null;

                return (
                  <section
                    key={`narrative-${page.key}-${sectionIndex}`}
                    className="moe24-report-section"
                  >
                    <h2>وصف التنفيذ</h2>
                    <p className="moe24-report-narrative">{section.body}</p>
                  </section>
                );
              }

              if (!section.items.length) {
                return null;
              }

              return (
                <section
                  key={`evidence-${page.key}-${sectionIndex}`}
                  className="moe24-report-section"
                >
                  <h2>الشواهد والمرفقات</h2>
                  <div
                    className="moe24-evidence-grid"
                    style={{ gridTemplateColumns: evidenceColumns }}
                  >
                    {section.items.map((item) => (
                      <EvidenceFigure
                        key={item.id}
                        item={item}
                        title={item.title?.trim() || "صورة مرفقة"}
                        heightMm={evidenceHeightMm}
                        fit={report.evidenceSettings.fit}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </MoePage>
      ))}
    </>
  );
}

function CustomEvidencePage({
  item,
  label,
  style,
}: {
  item: PortfolioPrintData["customEvidence"][number];
  label: string;
  style?: CSSProperties;
}) {
  const isImage =
    item.mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(item.fileUrl);

  return (
    <MoePage sectionLabel={label} className="moe24-custom-evidence-page" style={style}>
      <SectionHeading title={item.title} />

      {item.description ? (
        <p className="moe24-section-copy">{item.description}</p>
      ) : null}

      {isImage ? (
        <img
          className="moe24-custom-evidence-image"
          src={item.fileUrl}
          alt={item.title}
        />
      ) : (
        <a
          className="moe24-file-attachment moe24-file-attachment-large"
          href={item.fileUrl}
          target="_blank"
          rel="noreferrer"
        >
          فتح الملف المرفق
        </a>
      )}
    </MoePage>
  );
}

export function MoeOfficial2024PortfolioPrint({
  data,
  physicalDocument,
}: {
  data: PortfolioPrintData;
  physicalDocument?: PortfolioPhysicalDocument;
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

  const visibleQualifications = data.qualificationItems
    .filter((item) => item.isVisible)
    .sort((first, second) => first.sortOrder - second.sortOrder);

  const educationIdentity = data.educationIdentity;

  const hasIntroIdentity = Boolean(
    educationIdentity.vision ||
      educationIdentity.mission ||
      educationIdentity.pillars.length ||
      educationIdentity.values.length ||
      educationIdentity.strategicObjectives.length,
  );

  return (
    <div
      className="moe24-root"
      dir="rtl"
      style={
        {
          "--moe24-navy": MOE_2024.navy,
          "--moe24-green": MOE_2024.green,
          "--moe24-blue": MOE_2024.blue,
          "--moe24-teal": MOE_2024.teal,
          "--moe24-gold": MOE_2024.gold,
          "--moe24-gray": MOE_2024.gray,
          "--moe24-paper": MOE_2024.paper,
          "--moe24-soft": MOE_2024.soft,
          "--moe24-ink": MOE_2024.ink,
          "--moe24-muted": MOE_2024.muted,
          "--moe24-line": MOE_2024.line,
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

          .moe24-root {
            width: 210mm !important;
            min-width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .moe24-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }

          .moe24-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }

        .moe24-root {
          counter-reset: moe24-page;
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          gap: 24px;
          padding: 24px 0;
          background: #edf2f4;
          color: var(--moe24-ink);
          font-family: "Sakkal Majalla", "Cairo", "Tahoma", "Arial", sans-serif;
        }

        .moe24-page {
          counter-increment: moe24-page;
          position: relative;
          width: 210mm;
          min-width: 210mm;
          max-width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          overflow: hidden;
          background: var(--moe24-paper);
          box-shadow: 0 22px 64px rgba(21, 68, 90, 0.14);
          break-after: page;
          page-break-after: always;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-brand-rule {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 4mm;
          background: linear-gradient(
            90deg,
            var(--moe24-blue) 0%,
            var(--moe24-teal) 48%,
            var(--moe24-green) 100%
          );
        }

        .moe24-page-header {
          position: absolute;
          top: 12mm;
          right: 15mm;
          left: 15mm;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--moe24-muted);
          font-size: 10px;
          font-weight: 700;
        }

        .moe24-header-brand {
          display: inline-flex;
          align-items: center;
          gap: 2mm;
          color: var(--moe24-navy);
          font-weight: 800;
        }

        .moe24-header-dot {
          width: 2.8mm;
          height: 2.8mm;
          border-radius: 50%;
          background: var(--moe24-green);
        }

        .moe24-page-body {
          position: relative;
          height: 100%;
          padding: 31mm 18mm 25mm;
          overflow: hidden;
        }

        .moe24-page-footer {
          position: absolute;
          right: 15mm;
          bottom: 8mm;
          left: 15mm;
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 7mm;
          border-top: 1px solid var(--moe24-line);
          padding-top: 2.6mm;
          color: var(--moe24-muted);
          font-size: 8.5px;
          font-weight: 700;
        }

        .moe24-page-footer::before {
          content: "";
          position: absolute;
          top: -1px;
          right: 0;
          width: 38mm;
          height: 1px;
          background: linear-gradient(
            90deg,
            var(--moe24-blue),
            var(--moe24-green)
          );
        }

        .moe24-page-number::before {
          content: counter(moe24-page, decimal-leading-zero);
          color: var(--moe24-navy);
          font-weight: 800;
        }

        .moe24-section-heading {
          position: relative;
          max-width: 172mm;
          margin-bottom: 7mm;
        }

        .moe24-eyebrow {
          display: block;
          margin-bottom: 1.8mm;
          color: var(--moe24-gold);
          font-size: 10px;
          font-weight: 800;
        }

        .moe24-section-heading h2 {
          margin: 0;
          color: var(--moe24-navy);
          font-size: 28px;
          font-weight: 800;
          line-height: 1.25;
        }

        .moe24-heading-rule {
          display: block;
          width: 46mm;
          height: 1.2mm;
          margin-top: 3mm;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            var(--moe24-blue),
            var(--moe24-green)
          );
        }

        .moe24-section-heading p {
          max-width: 150mm;
          margin: 3mm 0 0;
          color: var(--moe24-muted);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.9;
        }

        .moe24-cover {
          background:
            linear-gradient(
              135deg,
              rgba(61, 126, 185, 0.96),
              rgba(13, 169, 166, 0.96) 52%,
              rgba(7, 168, 105, 0.96)
            );
          color: #ffffff;
        }

        .moe24-cover .moe24-brand-rule,
        .moe24-cover .moe24-page-header {
          display: none;
        }

        .moe24-cover .moe24-page-body {
          display: grid;
          align-content: center;
          padding: 28mm 24mm 26mm;
        }

        .moe24-cover::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 18mm;
          background: var(--moe24-navy);
        }

        .moe24-cover::after {
          content: "";
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 14mm;
          background: var(--moe24-navy);
        }

        .moe24-cover-mark {
          width: 42mm;
          height: 1.5mm;
          margin-bottom: 15mm;
          background: rgba(255, 255, 255, 0.92);
        }

        .moe24-cover-kicker {
          margin: 0 0 4mm;
          color: rgba(255, 255, 255, 0.82);
          font-size: 15px;
          font-weight: 700;
        }

        .moe24-cover h1 {
          max-width: 155mm;
          margin: 0;
          color: #ffffff;
          font-size: 42px;
          font-weight: 800;
          line-height: 1.35;
        }

        .moe24-cover-subtitle {
          margin: 5mm 0 0;
          color: #ffffff;
          font-size: 18px;
          font-weight: 700;
        }

        .moe24-cover-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4mm 12mm;
          margin-top: 18mm;
          border-top: 1px solid rgba(255, 255, 255, 0.42);
          padding-top: 7mm;
        }

        .moe24-cover-details div {
          min-width: 0;
        }

        .moe24-cover-details span {
          display: block;
          color: rgba(255, 255, 255, 0.72);
          font-size: 9px;
          font-weight: 700;
        }

        .moe24-cover-details strong {
          display: block;
          margin-top: 1.5mm;
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.6;
        }

        .moe24-cover .moe24-page-footer {
          z-index: 3;
          border-top-color: rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.82);
        }

        .moe24-cover .moe24-page-footer::before {
          background: rgba(255, 255, 255, 0.76);
        }

        .moe24-cover .moe24-page-number::before {
          color: #ffffff;
        }

        .moe24-index {
          margin-top: 4mm;
          border-top: 1px solid var(--moe24-line);
        }

        .moe24-index-row {
          display: grid;
          grid-template-columns: 14mm 1fr auto;
          align-items: center;
          min-height: 12mm;
          border-bottom: 1px solid var(--moe24-line);
        }

        .moe24-index-row span,
        .moe24-index-row strong {
          padding: 2.5mm 2mm;
          font-size: 10.5px;
        }

        .moe24-index-row span {
          color: var(--moe24-muted);
          font-weight: 700;
        }

        .moe24-index-row strong {
          color: var(--moe24-navy);
          font-weight: 800;
        }

        .moe24-intro-copy,
        .moe24-section-copy {
          margin: 0;
          color: var(--moe24-ink);
          font-size: 12px;
          font-weight: 600;
          line-height: 2;
          white-space: pre-wrap;
        }

        .moe24-introduction-page .moe24-page-body {
          padding-top: 28mm;
          padding-bottom: 22mm;
        }

        .moe24-introduction-page .moe24-section-heading {
          margin-bottom: 3mm;
        }

        .moe24-introduction-page .moe24-section-heading h2 {
          font-size: 24px;
        }

        .moe24-introduction-page .moe24-section-heading p {
          margin-top: 2mm;
          font-size: 9.3px;
          line-height: 1.7;
        }

        .moe24-intro-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4mm;
          margin-top: 4mm;
        }

        .moe24-intro-feature {
          position: relative;
          min-height: 36mm;
          overflow: hidden;
          border-top: 1.2mm solid var(--moe24-blue);
          border-bottom: 1px solid var(--moe24-line);
          padding: 5mm 4.5mm 4mm;
          background: #ffffff;
        }

        .moe24-intro-feature-green {
          border-top-color: var(--moe24-green);
        }

        .moe24-intro-feature h3 {
          position: relative;
          z-index: 2;
          margin: 0;
          color: var(--moe24-navy);
          font-size: 18px;
          font-weight: 800;
        }

        .moe24-intro-feature p {
          position: relative;
          z-index: 2;
          margin: 2mm 0 0;
          color: var(--moe24-ink);
          font-size: 9.3px;
          font-weight: 600;
          line-height: 1.7;
          text-align: justify;
          white-space: pre-wrap;
        }

        .moe24-quote {
          position: absolute;
          top: -2mm;
          left: 4mm;
          color: rgba(13, 169, 166, 0.12);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 34mm;
          font-weight: 700;
          line-height: 1;
        }

        .moe24-identity-columns {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6mm;
          margin-top: 4mm;
          border-top: 1px solid var(--moe24-line);
          border-bottom: 1px solid var(--moe24-line);
          padding: 4mm 5mm;
          background: #f8fafa;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-identity-list {
          --moe24-identity-accent: var(--moe24-teal);
          --moe24-identity-accent-secondary: var(--moe24-blue);
          --moe24-identity-marker-bg: rgba(13, 169, 166, 0.1);
          position: relative;
          min-width: 0;
          padding-top: 3mm;
        }

        .moe24-identity-list::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          width: 32mm;
          height: 0.7mm;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--moe24-identity-accent-secondary), var(--moe24-identity-accent));
        }

        .moe24-identity-list-values {
          --moe24-identity-accent: var(--moe24-green);
          --moe24-identity-accent-secondary: var(--moe24-gold);
          --moe24-identity-marker-bg: rgba(7, 168, 105, 0.1);
        }

        .moe24-identity-list:only-child {
          grid-column: 1 / -1;
        }

        .moe24-identity-list-header {
          display: flex;
          align-items: flex-start;
          gap: 2.5mm;
          margin-bottom: 2.5mm;
        }

        .moe24-identity-list-mark {
          width: 3.2mm;
          height: 3.2mm;
          flex: 0 0 3.2mm;
          margin-top: 1.2mm;
          border: 0.8mm solid var(--moe24-identity-marker-bg);
          border-radius: 50%;
          background: var(--moe24-identity-accent);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-identity-list-header h3 {
          margin: 0;
          color: var(--moe24-navy);
          font-size: 14px;
          font-weight: 800;
          line-height: 1.3;
        }

        .moe24-identity-list-subtitle {
          margin: 0.6mm 0 0;
          color: var(--moe24-muted);
          font-size: 7.8px;
          font-weight: 650;
          line-height: 1.5;
        }

        .moe24-identity-list ol {
          margin: 0;
          padding: 0;
          list-style: none;
          counter-reset: moe24-list;
        }

        .moe24-identity-list li {
          counter-increment: moe24-list;
          position: relative;
          display: flex;
          min-height: 6.5mm;
          align-items: center;
          border-bottom: 1px solid rgba(21, 68, 90, 0.12);
          padding: 1mm 8mm 1mm 1mm;
          color: var(--moe24-navy);
          font-size: 8.5px;
          font-weight: 700;
          line-height: 1.5;
        }

        .moe24-identity-list li::before {
          content: counter(moe24-list, decimal-leading-zero);
          position: absolute;
          top: 50%;
          right: 0;
          display: grid;
          width: 5.5mm;
          height: 5.5mm;
          place-items: center;
          transform: translateY(-50%);
          border-radius: 50%;
          background: var(--moe24-identity-marker-bg);
          color: var(--moe24-identity-accent);
          font-size: 6.8px;
          font-weight: 800;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-intro-objectives {
          margin-top: 4mm;
          border-top: 1px solid var(--moe24-line);
          padding-top: 3mm;
        }

        .moe24-intro-objectives-header {
          display: flex;
          align-items: center;
          gap: 2.5mm;
          margin-bottom: 2.5mm;
        }

        .moe24-intro-objectives-mark {
          width: 3.2mm;
          height: 3.2mm;
          flex: 0 0 3.2mm;
          border: 0.8mm solid rgba(7, 168, 105, 0.1);
          border-radius: 50%;
          background: var(--moe24-green);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-intro-objectives-header span:not(.moe24-intro-objectives-mark) {
          display: block;
          color: var(--moe24-muted);
          font-size: 7.5px;
          font-weight: 700;
        }

        .moe24-intro-objectives-header h3 {
          margin: 0.5mm 0 0;
          color: var(--moe24-navy);
          font-size: 14px;
          font-weight: 800;
          line-height: 1.3;
        }

        .moe24-intro-objectives-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 6mm;
          margin: 0;
          padding: 0;
          list-style: none;
          counter-reset: moe24-intro-objective;
        }

        .moe24-intro-objectives-list li {
          counter-increment: moe24-intro-objective;
          position: relative;
          display: flex;
          min-height: 8mm;
          align-items: center;
          border-bottom: 1px solid rgba(21, 68, 90, 0.1);
          padding: 1.2mm 8mm 1.2mm 1mm;
          color: var(--moe24-navy);
          font-size: 8.2px;
          font-weight: 650;
          line-height: 1.4;
        }

        .moe24-intro-objectives-list li::before {
          content: counter(moe24-intro-objective, decimal-leading-zero);
          position: absolute;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          color: var(--moe24-green);
          font-size: 7px;
          font-weight: 800;
        }

        .moe24-profile-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 10mm;
          border-top: 1px solid var(--moe24-line);
        }

        .moe24-info-row {
          display: grid;
          grid-template-columns: 34mm minmax(0, 1fr);
          min-height: 13mm;
          align-items: center;
          border-bottom: 1px solid var(--moe24-line);
        }

        .moe24-info-row span {
          color: var(--moe24-muted);
          font-size: 9.5px;
          font-weight: 700;
        }

        .moe24-info-row strong {
          color: var(--moe24-navy);
          font-size: 11.5px;
          font-weight: 800;
          line-height: 1.6;
        }

        .moe24-profile-summary {
          margin: 8mm 0;
          border-inline-start: 1.5mm solid var(--moe24-gold);
          padding: 1mm 5mm 1mm 0;
          color: var(--moe24-ink);
          font-size: 11px;
          font-weight: 600;
          line-height: 2;
          white-space: pre-wrap;
        }

        .moe24-qualification-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 2mm 5mm;
          margin-top: -3mm;
          color: var(--moe24-muted);
          font-size: 9px;
          font-weight: 700;
        }

        .moe24-qualification-meta span + span::before {
          content: "•";
          margin-inline-end: 5mm;
          color: var(--moe24-gold);
        }

        .moe24-qualification-media {
          display: grid;
          width: 172mm;
          height: 178mm;
          place-items: center;
          margin: 8mm auto 0;
          overflow: hidden;
          background: transparent;
        }

        .moe24-qualification-media img {
          display: block;
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          object-fit: contain;
        }

        .moe24-media-placeholder {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          border: 1px solid var(--moe24-line);
          color: var(--moe24-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .moe24-qualification-description {
          max-height: 26mm;
          margin: 5mm 0 0;
          overflow: hidden;
          border-top: 1px solid var(--moe24-line);
          padding-top: 3mm;
          color: var(--moe24-ink);
          font-size: 9.5px;
          font-weight: 600;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .moe24-owner-note {
          position: absolute;
          right: 18mm;
          bottom: 19mm;
          color: var(--moe24-muted);
          font-size: 8px;
          font-weight: 700;
        }

        .moe24-divider .moe24-page-body {
          display: grid;
          align-content: center;
        }

        .moe24-divider-content {
          position: relative;
          max-width: 154mm;
          border-top: 1.5mm solid var(--moe24-green);
          padding-top: 10mm;
        }

        .moe24-divider-index {
          display: block;
          margin-bottom: 4mm;
          color: var(--moe24-gold);
          font-size: 14px;
          font-weight: 800;
        }

        .moe24-divider h2 {
          margin: 0;
          color: var(--moe24-navy);
          font-size: 38px;
          font-weight: 800;
          line-height: 1.35;
        }

        .moe24-divider p {
          max-width: 135mm;
          margin: 5mm 0 0;
          color: var(--moe24-muted);
          font-size: 12px;
          font-weight: 600;
          line-height: 2;
        }

        .moe24-divider-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8mm;
          margin-top: 13mm;
          border-top: 1px solid var(--moe24-line);
          padding-top: 6mm;
        }

        .moe24-divider-stat strong {
          display: block;
          color: var(--moe24-navy);
          font-size: 24px;
          font-weight: 800;
        }

        .moe24-divider-stat span {
          display: block;
          margin-top: 1mm;
          color: var(--moe24-muted);
          font-size: 9px;
          font-weight: 700;
        }

        .moe24-report-title {
          position: relative;
          margin-bottom: 6mm;
          padding: 0 0 4.5mm;
        }

        .moe24-report-title > span {
          color: var(--moe24-gold);
          font-size: 9px;
          font-weight: 800;
        }

        .moe24-report-title-row {
          display: flex;
          align-items: center;
          gap: 3mm;
          margin-top: 2mm;
        }

        .moe24-report-title-accent {
          display: block;
          width: 1mm;
          height: 10mm;
          flex: 0 0 1mm;
          border-radius: 999px;
          background: var(--moe24-teal);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-report-title-row h1 {
          max-width: 150mm;
          margin: 0;
          color: var(--moe24-navy);
          font-size: 26px;
          font-weight: 800;
          line-height: 1.3;
        }

        .moe24-report-title small {
          position: absolute;
          top: 0.5mm;
          left: 0;
          color: var(--moe24-muted);
          font-size: 8px;
          font-weight: 700;
        }

        .moe24-report-sections {
          display: grid;
          gap: 4mm;
        }

        .moe24-report-section {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .moe24-report-section h2 {
          margin: 0 0 2mm;
          color: var(--moe24-navy);
          font-size: 14px;
          font-weight: 800;
        }

        .moe24-report-details-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(21, 68, 90, 0.14);
          border-radius: 4mm;
          padding: 5mm 4mm 4mm;
          background:
            linear-gradient(
              180deg,
              rgba(248, 251, 251, 0.98) 0%,
              rgba(255, 255, 255, 0.98) 100%
            );
          box-shadow: none;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-report-details-panel::before {
          content: "";
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 1.2mm;
          background:
            linear-gradient(
              90deg,
              var(--moe24-blue) 0%,
              var(--moe24-teal) 50%,
              var(--moe24-green) 100%
            );
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-report-detail-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-auto-flow: row;
          gap: 2mm 4mm;
        }

        .moe24-report-field {
          --moe24-report-field-accent: var(--moe24-teal);
          --moe24-report-field-soft: rgba(13, 169, 166, 0.08);

          position: relative;
          display: grid;
          grid-template-columns: 9mm minmax(0, 1fr);
          min-width: 0;
          min-height: 17mm;
          align-items: center;
          gap: 2.5mm;
          border: 0;
          border-radius: 2.5mm;
          padding: 2.5mm 3mm;
          background: rgba(255, 255, 255, 0.76);
          box-shadow:
            inset 0 0 0 1px rgba(21, 68, 90, 0.08);
          break-inside: avoid;
          page-break-inside: avoid;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-report-field-green {
          --moe24-report-field-accent: var(--moe24-green);
          --moe24-report-field-soft: rgba(7, 168, 105, 0.08);
        }

        .moe24-report-field-wide {
          grid-column: 1 / -1;
          grid-template-columns: 9mm minmax(0, 1fr);
        }

        .moe24-report-field-compact-list {
          align-items: start;
          min-height: 22mm;
        }

        .moe24-report-field-compact-list .moe24-report-field-icon {
          margin-top: 1mm;
        }

        .moe24-report-field-compact-list .moe24-report-list {
          grid-template-columns: 1fr;
          gap: 0.4mm;
        }

        .moe24-report-field-compact-list .moe24-report-list li {
          padding-top: 0.25mm;
          padding-bottom: 0.25mm;
          font-size: 9px;
          line-height: 1.35;
        }

        .moe24-report-field-compact-list .moe24-report-list li::before {
          top: 2.3mm;
          width: 1.4mm;
          height: 1.4mm;
        }

        .moe24-report-field-icon {
          display: grid;
          width: 8mm;
          height: 8mm;
          place-items: center;
          border: 1px solid rgba(21, 68, 90, 0.12);
          border-radius: 2mm;
          background: var(--moe24-report-field-soft);
          color: var(--moe24-report-field-accent);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-report-field-icon svg {
          width: 4.5mm;
          height: 4.5mm;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.65;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .moe24-report-field-content {
          min-width: 0;
        }

        .moe24-report-field-label {
          display: flex;
          align-items: center;
          gap: 1.5mm;
        }

        .moe24-report-field-dot {
          width: 1.7mm;
          height: 1.7mm;
          flex: 0 0 1.7mm;
          border-radius: 50%;
          background: var(--moe24-report-field-accent);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-report-field-label > span:last-child {
          color: var(--moe24-muted);
          font-size: 7.8px;
          font-weight: 750;
          line-height: 1.3;
        }

        .moe24-report-field strong {
          display: block;
          margin-top: 1mm;
          color: var(--moe24-navy);
          font-size: 10px;
          font-weight: 800;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .moe24-report-field-wide strong {
          font-size: 9.8px;
          line-height: 1.55;
        }

        .moe24-report-list {
          display: grid;
          gap: 0.7mm;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .moe24-report-list li {
          position: relative;
          border: 0;
          padding: 0.4mm 3.5mm 0.4mm 0;
          color: var(--moe24-navy);
        }

        .moe24-report-list li::before {
          content: "";
          position: absolute;
          top: 3mm;
          right: 0;
          width: 1.7mm;
          height: 1.7mm;
          border-radius: 50%;
          background: var(--moe24-report-field-accent);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .moe24-report-narrative {
          margin: 0;
          border-inline-start: 1.2mm solid var(--moe24-teal);
          padding: 1mm 5mm 1mm 0;
          color: var(--moe24-ink);
          font-size: 10.5px;
          font-weight: 600;
          line-height: 1.9;
          white-space: pre-wrap;
        }

        .moe24-evidence-grid {
          display: grid;
          gap: 5mm;
        }

        .moe24-evidence-figure {
          margin: 0;
          overflow: hidden;
          border-radius: 4mm;
          background: transparent;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .moe24-evidence-figure img {
          display: block;
          width: 100%;
          border: 0;
          border-radius: 4mm;
          background: transparent;
        }

        .moe24-file-attachment {
          display: grid;
          min-height: 24mm;
          place-items: center;
          border: 1px solid var(--moe24-line);
          color: var(--moe24-navy);
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
        }

        .moe24-file-attachment-large {
          min-height: 80mm;
          margin-top: 10mm;
        }

        .moe24-custom-evidence-image {
          display: block;
          width: 100%;
          max-height: 205mm;
          margin-top: 8mm;
          border-radius: 4mm;
          object-fit: contain;
        }

        .moe24-conclusion {
          background: var(--moe24-navy);
          color: #ffffff;
        }

        .moe24-conclusion .moe24-brand-rule,
        .moe24-conclusion .moe24-page-header {
          display: none;
        }

        .moe24-conclusion .moe24-page-body {
          display: grid;
          align-content: center;
          padding: 28mm 28mm;
        }

        .moe24-conclusion-label {
          color: var(--moe24-gold);
          font-size: 12px;
          font-weight: 800;
        }

        .moe24-conclusion h2 {
          max-width: 150mm;
          margin: 4mm 0 0;
          color: #ffffff;
          font-size: 38px;
          font-weight: 800;
          line-height: 1.35;
        }

        .moe24-conclusion p {
          max-width: 145mm;
          margin: 9mm 0 0;
          color: rgba(255, 255, 255, 0.88);
          font-size: 14px;
          font-weight: 600;
          line-height: 2.1;
          white-space: pre-wrap;
        }

        .moe24-conclusion .moe24-page-footer {
          border-top-color: rgba(255, 255, 255, 0.24);
          color: rgba(255, 255, 255, 0.72);
        }

        .moe24-conclusion .moe24-page-footer::before {
          background: linear-gradient(
            90deg,
            var(--moe24-blue),
            var(--moe24-green)
          );
        }

        .moe24-conclusion .moe24-page-number::before {
          color: #ffffff;
        }

      `}</style>

      <MoePage sectionLabel="الغلاف" className="moe24-cover" style={{ order: -10000 }}>
        <PortfolioCoverOfficialLogos
          ministryLogoSrc="/uploads/school-logos/MOE.png"
          visionLogoSrc="/uploads/school-logos/VISION2030.png"
          tone="dark"
        />
        <div className="moe24-cover-mark" aria-hidden="true" />
        <p className="moe24-cover-kicker">وزارة التعليم · ملف مهني موثق</p>
        <h1>{data.portfolio.title}</h1>
        <p className="moe24-cover-subtitle">
          {data.owner.jobTitle} · {data.portfolio.term}
        </p>

        <div className="moe24-cover-details">
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
      </MoePage>

      {data.portfolio.preferences.showTableOfContents ? (
        <MoePage sectionLabel="الفهرس" style={{ order: -9999 }}>
          <SectionHeading eyebrow="المحتويات" title="فهرس الملف" />

          <div className="moe24-index">
            {data.sections
              .filter((section) => section.isEnabled)
              .sort((first, second) => first.sortOrder - second.sortOrder)
              .map((section, index) => (
                <div key={section.id} className="moe24-index-row">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{section.title}</strong>
                  <span>قسم</span>
                </div>
              ))}
          </div>
        </MoePage>
      ) : null}

      {sectionEnabled("introduction") ? (
        <div style={{ order: sectionOrder("introduction") }}>
          <MoePage sectionLabel="المقدمة" className="moe24-introduction-page">
            <SectionHeading
              eyebrow="مدخل الملف"
              title="المقدمة"
              description={
                data.portfolio.introText ||
                "يعرض هذا الملف أبرز الأعمال والتقارير والشواهد المهنية خلال الفصل الدراسي."
              }
            />

            {hasIntroIdentity ? (
              <>
                {educationIdentity.vision || educationIdentity.mission ? (
                  <div className="moe24-intro-grid">
                    {educationIdentity.vision ? (
                      <IntroFeature
                        title="الرؤية"
                        text={educationIdentity.vision}
                        tone="blue"
                      />
                    ) : null}

                    {educationIdentity.mission ? (
                      <IntroFeature
                        title="الرسالة"
                        text={educationIdentity.mission}
                        tone="green"
                      />
                    ) : null}
                  </div>
                ) : null}

                {educationIdentity.pillars.length ||
                educationIdentity.values.length ? (
                  <div className="moe24-identity-columns">
                    {educationIdentity.pillars.length ? (
                      <section className="moe24-identity-list moe24-identity-list-pillars">
                        <div className="moe24-identity-list-header">
                          <span className="moe24-identity-list-mark" aria-hidden="true" />
                          <div>
                            <h3>المحاور</h3>
                            <p className="moe24-identity-list-subtitle">مرتكزات العمل التعليمي</p>
                          </div>
                        </div>
                        <ol>
                          {educationIdentity.pillars.map((item, index) => (
                            <li key={`pillar-${index}`}>{item}</li>
                          ))}
                        </ol>
                      </section>
                    ) : null}

                    {educationIdentity.values.length ? (
                      <section className="moe24-identity-list moe24-identity-list-values">
                        <div className="moe24-identity-list-header">
                          <span className="moe24-identity-list-mark" aria-hidden="true" />
                          <div>
                            <h3>القيم</h3>
                            <p className="moe24-identity-list-subtitle">قيم تقود الممارسة المهنية</p>
                          </div>
                        </div>
                        <ol>
                          {educationIdentity.values.map((item, index) => (
                            <li key={`value-${index}`}>{item}</li>
                          ))}
                        </ol>
                      </section>
                    ) : null}
                  </div>
                ) : null}

                {educationIdentity.strategicObjectives.length ? (
                  <section className="moe24-intro-objectives">
                    <header className="moe24-intro-objectives-header">
                      <span className="moe24-intro-objectives-mark" aria-hidden="true" />
                      <div>
                        <span>الهوية التعليمية</span>
                        <h3>الأهداف الاستراتيجية</h3>
                      </div>
                    </header>

                    <ol className="moe24-intro-objectives-list">
                      {educationIdentity.strategicObjectives.map((objective, index) => (
                        <li key={`objective-${index}`}>{objective}</li>
                      ))}
                    </ol>
                  </section>
                ) : null}
              </>
            ) : null}
          </MoePage>
        </div>
      ) : null}

      {sectionEnabled("profile") ? (
        <MoePage
          sectionLabel="السيرة المهنية"
          style={{ order: sectionOrder("profile") }}
        >
          <SectionHeading eyebrow="صاحب الملف" title="السيرة المهنية" />

          <div className="moe24-profile-grid">
            <InfoRow label="الاسم" value={data.owner.name} />
            <InfoRow label="المسمى الوظيفي" value={data.owner.jobTitle} />

            {data.portfolio.preferences.showSchoolName ? (
              <InfoRow label="المدرسة" value={data.school.name} />
            ) : null}

            {data.portfolio.preferences.showPrincipalName ? (
              <InfoRow
                label="مدير المدرسة"
                value={data.school.principalName || "غير محدد"}
              />
            ) : null}
          </div>

          {data.biography.professionalSummary ? (
            <p className="moe24-profile-summary">
              {data.biography.professionalSummary}
            </p>
          ) : null}

          <div className="moe24-profile-grid">
            <InfoRow
              label="التخصص"
              value={data.biography.specialization}
            />
            <InfoRow
              label="المؤهل العلمي"
              value={data.biography.academicQualification}
            />
            <InfoRow
              label="سنوات الخبرة"
              value={data.biography.yearsOfExperience}
            />
            <InfoRow label="المهارات" value={data.biography.skills} />
            <InfoRow
              label="الاهتمامات المهنية"
              value={data.biography.professionalInterests}
            />
          </div>
        </MoePage>
      ) : null}

      {sectionEnabled("qualifications") ? (
        <div style={{ order: sectionOrder("qualifications") }}>
          {visibleQualifications.map((item) => (
            <QualificationPage key={item.id} data={data} item={item} />
          ))}
        </div>
      ) : null}

      {enabledSections.map((section, index) => (
        <div key={section.key} style={{ order: section.sortOrder }}>
          {data.portfolio.preferences.showPerformanceDividers ? (
            <MoePage
              sectionLabel={section.title}
              className="moe24-divider"
            >
              <div className="moe24-divider-content">
                <span className="moe24-divider-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2>{section.title}</h2>
                {section.intro ? <p>{section.intro}</p> : null}

                <div className="moe24-divider-stats">
                  {data.showWeights !== false ? <div className="moe24-divider-stat">
                    <strong>{section.weight}%</strong>
                    <span>الوزن النسبي</span>
                  </div> : null}
                  <div className="moe24-divider-stat">
                    <strong>{section.reports.length}</strong>
                    <span>التقارير</span>
                  </div>
                  <div className="moe24-divider-stat">
                    <strong>
                      {section.reports.reduce(
                        (total, report) => total + report.evidenceCount,
                        0,
                      )}
                    </strong>
                    <span>الشواهد</span>
                  </div>
                </div>
              </div>
            </MoePage>
          ) : null}

          {section.linkedOutputs.flatMap((output) => MoeCurriculumPages({ output, sectionTitle: section.title, physicalDocument }))}

          {section.reports.map((report) =>
            report.content ? (
              <MoeReportPages key={report.id} report={report.content} />
            ) : null,
          )}

          {data.customEvidence
            .filter(
              (item) =>
                item.sectionId === section.id &&
                item.isVisible &&
                item.fileUrl,
            )
            .sort((first, second) => first.sortOrder - second.sortOrder)
            .map((item) => (
              <CustomEvidencePage
                key={item.id}
                item={item}
                label={section.title}
              />
            ))}
        </div>
      ))}

      {sectionEnabled("reports-evidence") ? data.customEvidence
        .filter((item) => !item.sectionId && item.isVisible && item.fileUrl)
        .sort((first, second) => first.sortOrder - second.sortOrder)
        .map((item) => (
          <CustomEvidencePage
            key={item.id}
            item={item}
            label="شاهد مستقل"
            style={{ order: sectionOrder("reports-evidence") }}
          />
        )) : null}

      {sectionEnabled("closing") ? (
        <MoePage
          sectionLabel="الخاتمة"
          className="moe24-conclusion"
          style={{ order: sectionOrder("closing") }}
        >
          <span className="moe24-conclusion-label">ختام الملف</span>
          <h2>الخاتمة</h2>
          <p>
            {data.portfolio.conclusionText ||
              "ختامًا، يمثل هذا الملف توثيقًا مهنيًا لأبرز الإنجازات وفرص التطوير القادمة."}
          </p>
        </MoePage>
      ) : null}
    </div>
  );
}
