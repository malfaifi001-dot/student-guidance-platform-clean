import type { CSSProperties, ReactNode } from "react";

import {
  buildPortfolioReportPages,
  getPortfolioEvidenceImageHeightMm,
  getPortfolioEvidencePerPage,
} from "@/components/portfolio/print/portfolio-print-pagination";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";
import { PortfolioCoverOfficialLogos } from "@/components/portfolio/print/portfolio-cover-official-logos";
import type { PortfolioReportContent } from "@/lib/portfolio/portfolio-report-content";

const ATLAS = {
  ink: "#10243A",
  teal: "#0F9D94",
  blue: "#2F7EBB",
  coral: "#E07A5F",
  sand: "#E8D9B7",
  paper: "#FBFAF7",
  muted: "#6B7785",
  line: "#DCE2E6",
  softBlue: "#EEF5F8",
  softTeal: "#EDF8F6",
  softCoral: "#FAF1ED",
} as const;

function PageNumber() {
  return <span className="atlas-page-number" aria-label="رقم الصفحة" />;
}

function AtlasPage({
  children,
  sectionLabel,
  className = "",
  style,
  indexLabel = "•",
}: {
  children: ReactNode;
  sectionLabel: string;
  className?: string;
  style?: CSSProperties;
  indexLabel?: string;
}) {
  return (
    <section
      className={`atlas-page ${className}`}
      style={style}
      data-page-label={sectionLabel}
    >
      <aside className="atlas-rail" aria-hidden="true">
        <span>{indexLabel}</span>
        <i />
      </aside>

      <header className="atlas-header">
        <strong>ملف الإنجاز</strong>
        <span>{sectionLabel}</span>
      </header>

      <main className="atlas-body">{children}</main>

      <footer className="atlas-footer">
        <span>منصة التوجيه الطلابي</span>
        <span>{sectionLabel}</span>
        <PageNumber />
      </footer>
    </section>
  );
}

function Heading({
  kicker,
  title,
  description,
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="atlas-heading">
      {kicker ? <span>{kicker}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

function renderValue(value: string | string[]) {
  if (Array.isArray(value)) {
    return (
      <ul className="atlas-value-list">
        {value.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    );
  }

  return value || "غير محدد";
}

function IntroCard({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "blue" | "teal";
}) {
  return (
    <section className={`atlas-intro-card atlas-intro-card-${tone}`}>
      <span className="atlas-quote" aria-hidden="true">“</span>
      <small>{tone === "blue" ? "نطمح إلى" : "نعمل من أجل"}</small>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function AtlasReportPages({ report }: { report: PortfolioReportContent }) {
  const pages = buildPortfolioReportPages(report);
  const evidenceHeightMm = getPortfolioEvidenceImageHeightMm(report);
  const evidenceColumns =
    getPortfolioEvidencePerPage(report) <= 1
      ? "minmax(0, 1fr)"
      : "repeat(2, minmax(0, 1fr))";

  return (
    <>
      {pages.map((page, pageIndex) => (
        <AtlasPage
          key={page.key}
          sectionLabel={report.serviceName || "التقرير"}
          indexLabel={String(pageIndex + 1).padStart(2, "0")}
        >
          <header className="atlas-report-title">
            <span>{report.serviceName || report.subtitle || "تقرير"}</span>
            <div><i aria-hidden="true" /><h1>{report.title}</h1></div>
            <small>صفحة {pageIndex + 1} من {pages.length}</small>
          </header>

          <div className="atlas-report-sections">
            {page.sections.map((section, sectionIndex) => {
              if (section.kind === "details") {
                if (!section.fields.length) return null;

                return (
                  <section
                    key={`details-${page.key}-${sectionIndex}`}
                    className="atlas-report-section"
                  >
                    <h2>التفاصيل</h2>
                    <div className="atlas-detail-grid">
                      {section.fields.map((field, fieldIndex) => {
                        const serialized = Array.isArray(field.value)
                          ? field.value.join(" ")
                          : String(field.value);
                        const wide =
                          serialized.length > 150 ||
                          (!Array.isArray(field.value) && serialized.includes("\n"));
                        const tone = fieldIndex % 3 === 0 ? "coral" : fieldIndex % 2 === 0 ? "teal" : "blue";

                        return (
                          <article
                            key={`${field.key}-${field.label}`}
                            className={[
                              "atlas-detail-card",
                              `atlas-detail-card-${tone}`,
                              wide ? "atlas-detail-card-wide" : "",
                            ].filter(Boolean).join(" ")}
                          >
                            <span className="atlas-detail-index">
                              {String(fieldIndex + 1).padStart(2, "0")}
                            </span>
                            <div>
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
                    className="atlas-report-section"
                  >
                    <h2>وصف التنفيذ</h2>
                    <p className="atlas-narrative">{section.body}</p>
                  </section>
                );
              }

              if (!section.items.length) return null;

              return (
                <section
                  key={`evidence-${page.key}-${sectionIndex}`}
                  className="atlas-report-section"
                >
                  <h2>الشواهد والمرفقات</h2>
                  <div
                    className="atlas-evidence-grid"
                    style={{ gridTemplateColumns: evidenceColumns }}
                  >
                    {section.items.map((item) => {
                      const isImage =
                        item.type === "IMAGE" ||
                        Boolean(item.url && /\.(png|jpe?g|webp|gif|svg)$/i.test(item.url));

                      if (!item.url) return null;

                      return isImage ? (
                        <figure key={item.id} className="atlas-evidence">
                          <img
                            src={item.url}
                            alt={item.title?.trim() || "صورة مرفقة"}
                            style={{
                              height: `${evidenceHeightMm}mm`,
                              objectFit: report.evidenceSettings.fit,
                            }}
                          />
                        </figure>
                      ) : (
                        <a
                          key={item.id}
                          className="atlas-file"
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          فتح الملف المرفق
                        </a>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </AtlasPage>
      ))}
    </>
  );
}

export function EditorialAtlasPortfolioPrint({
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
      className="atlas-root"
      dir="rtl"
      style={
        {
          "--atlas-ink": ATLAS.ink,
          "--atlas-teal": ATLAS.teal,
          "--atlas-blue": ATLAS.blue,
          "--atlas-coral": ATLAS.coral,
          "--atlas-sand": ATLAS.sand,
          "--atlas-paper": ATLAS.paper,
          "--atlas-muted": ATLAS.muted,
          "--atlas-line": ATLAS.line,
          "--atlas-soft-blue": ATLAS.softBlue,
          "--atlas-soft-teal": ATLAS.softTeal,
          "--atlas-soft-coral": ATLAS.softCoral,
        } as CSSProperties
      }
    >
      <style>{`
        @page { size: A4 portrait; margin: 0; }

        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .atlas-root {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            background: #fff !important;
          }

          .atlas-page {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }

          .atlas-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }

        .atlas-root {
          counter-reset: atlas-page;
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          gap: 24px;
          padding: 24px 0;
          background: #e9eef1;
          color: var(--atlas-ink);
          font-family: "Cairo", "Tahoma", "Arial", sans-serif;
        }

        .atlas-page {
          counter-increment: atlas-page;
          position: relative;
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          overflow: hidden;
          background: var(--atlas-paper);
          box-shadow: 0 24px 72px rgba(16, 36, 58, 0.16);
        }

        .atlas-rail {
          position: absolute;
          inset: 0 0 0 auto;
          width: 14mm;
          background: var(--atlas-ink);
          color: #fff;
        }

        .atlas-rail span {
          position: absolute;
          top: 18mm;
          right: 50%;
          transform: translateX(50%) rotate(90deg);
          color: rgba(255,255,255,.78);
          font-size: 10px;
          font-weight: 900;
        }

        .atlas-rail i {
          position: absolute;
          right: 50%;
          bottom: 14mm;
          width: 1px;
          height: 54mm;
          background: linear-gradient(var(--atlas-coral), var(--atlas-teal));
        }

        .atlas-header {
          position: absolute;
          top: 12mm;
          right: 24mm;
          left: 16mm;
          display: flex;
          justify-content: space-between;
          color: var(--atlas-muted);
          font-size: 9px;
          font-weight: 700;
        }

        .atlas-header strong { color: var(--atlas-ink); }

        .atlas-body {
          height: 100%;
          padding: 31mm 18mm 24mm 20mm;
          overflow: hidden;
        }

        .atlas-footer {
          position: absolute;
          right: 24mm;
          bottom: 8mm;
          left: 16mm;
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 7mm;
          align-items: center;
          border-top: 1px solid var(--atlas-line);
          padding-top: 2.4mm;
          color: var(--atlas-muted);
          font-size: 8px;
          font-weight: 700;
        }

        .atlas-page-number::before {
          content: counter(atlas-page, decimal-leading-zero);
          color: var(--atlas-ink);
          font-weight: 900;
        }

        .atlas-heading { margin-bottom: 7mm; }
        .atlas-heading > span {
          color: var(--atlas-coral);
          font-size: 9px;
          font-weight: 900;
        }
        .atlas-heading h2 {
          margin: 1.5mm 0 0;
          color: var(--atlas-ink);
          font-size: 29px;
          font-weight: 900;
          line-height: 1.25;
        }
        .atlas-heading p {
          max-width: 150mm;
          margin: 3mm 0 0;
          color: var(--atlas-muted);
          font-size: 10.5px;
          line-height: 1.85;
        }

        .atlas-cover {
          background: linear-gradient(135deg, var(--atlas-ink), #193c59 58%, var(--atlas-blue));
          color: #fff;
        }

        .atlas-cover .atlas-rail,
        .atlas-cover .atlas-header { display: none; }

        .atlas-cover .atlas-body {
          display: grid;
          align-content: center;
          padding: 28mm 24mm;
        }

        .atlas-cover::before {
          content: "";
          position: absolute;
          top: 32mm;
          left: 24mm;
          width: 58mm;
          height: 58mm;
          border: 1px solid rgba(255,255,255,.24);
          border-radius: 50%;
          box-shadow:
            inset 0 0 0 10mm rgba(224,122,95,.16),
            inset 0 0 0 20mm rgba(15,157,148,.14);
        }

        .atlas-cover-content { position: relative; z-index: 2; max-width: 150mm; }
        .atlas-cover-content > span {
          color: var(--atlas-sand);
          font-size: 13px;
          font-weight: 800;
        }
        .atlas-cover h1 {
          margin: 4mm 0 0;
          color: #fff;
          font-size: 43px;
          font-weight: 900;
          line-height: 1.35;
        }
        .atlas-cover-content > p {
          margin: 4mm 0 0;
          color: rgba(255,255,255,.78);
          font-size: 17px;
          font-weight: 700;
        }
        .atlas-cover-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5mm 12mm;
          margin-top: 17mm;
          border-top: 1px solid rgba(255,255,255,.25);
          padding-top: 7mm;
        }
        .atlas-cover-meta span {
          display: block;
          color: rgba(255,255,255,.62);
          font-size: 8px;
        }
        .atlas-cover-meta strong {
          display: block;
          margin-top: 1mm;
          color: #fff;
          font-size: 13px;
        }
        .atlas-cover .atlas-footer {
          border-top-color: rgba(255,255,255,.22);
          color: rgba(255,255,255,.7);
        }
        .atlas-cover .atlas-page-number::before { color: #fff; }

        .atlas-index-grid,
        .atlas-profile-grid,
        .atlas-vision-grid,
        .atlas-dual-list,
        .atlas-objectives ol,
        .atlas-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .atlas-index-grid { gap: 4mm; }
        .atlas-index-item {
          display: grid;
          grid-template-columns: 14mm 1fr;
          min-height: 18mm;
          align-items: center;
          border-radius: 3mm;
          padding: 3mm;
          background: var(--atlas-soft-blue);
        }
        .atlas-index-item span { color: var(--atlas-blue); font-weight: 900; }
        .atlas-index-item strong { font-size: 10px; }

        .atlas-vision-grid { gap: 5mm; }
        .atlas-intro-card {
          position: relative;
          min-height: 39mm;
          overflow: hidden;
          border-radius: 4mm;
          padding: 5mm;
          background: var(--atlas-soft-blue);
        }
        .atlas-intro-card-teal { background: var(--atlas-soft-teal); }
        .atlas-intro-card small { color: var(--atlas-muted); font-size: 8px; }
        .atlas-intro-card h3 { margin: .5mm 0 0; font-size: 16px; }
        .atlas-intro-card p {
          position: relative;
          z-index: 2;
          margin: 2.5mm 0 0;
          font-size: 9px;
          line-height: 1.75;
          text-align: justify;
        }
        .atlas-quote {
          position: absolute;
          top: -4mm;
          left: 2mm;
          color: rgba(16,36,58,.08);
          font-family: Georgia, serif;
          font-size: 31mm;
        }

        .atlas-dual-list { gap: 7mm; margin-top: 5mm; }
        .atlas-dual-list section {
          border-top: 1px solid var(--atlas-line);
          padding-top: 4mm;
        }
        .atlas-dual-list h3 { margin: 0; font-size: 14px; }
        .atlas-dual-list p { margin: .5mm 0 2mm; color: var(--atlas-muted); font-size: 7.5px; }
        .atlas-dual-list ol,
        .atlas-objectives ol {
          margin: 0;
          padding: 0;
          list-style: none;
          counter-reset: atlas-list;
        }
        .atlas-dual-list li,
        .atlas-objectives li {
          counter-increment: atlas-list;
          position: relative;
          min-height: 6.5mm;
          border-bottom: 1px solid var(--atlas-line);
          padding: 1mm 8mm 1mm 0;
          font-size: 8px;
        }
        .atlas-dual-list li::before,
        .atlas-objectives li::before {
          content: counter(atlas-list, decimal-leading-zero);
          position: absolute;
          right: 0;
          color: var(--atlas-coral);
          font-size: 6.5px;
          font-weight: 900;
        }

        .atlas-objectives {
          margin-top: 5mm;
          border-radius: 4mm;
          padding: 4mm;
          background: #fff;
          box-shadow: inset 0 0 0 1px var(--atlas-line);
        }
        .atlas-objectives h3 { margin: 0 0 3mm; font-size: 14px; }
        .atlas-objectives ol { gap: 0 6mm; }

        .atlas-profile-grid { gap: 4mm; }
        .atlas-profile-item {
          min-height: 21mm;
          border-radius: 3mm;
          padding: 4mm;
          background: var(--atlas-soft-blue);
        }
        .atlas-profile-item:nth-child(3n) { background: var(--atlas-soft-coral); }
        .atlas-profile-item span { display: block; color: var(--atlas-muted); font-size: 8px; }
        .atlas-profile-item strong { display: block; margin-top: 1.5mm; font-size: 11px; }

        .atlas-profile-summary {
          margin: 0 0 7mm;
          border-inline-start: 2mm solid var(--atlas-coral);
          padding-inline-start: 5mm;
          font-size: 10.5px;
          line-height: 1.9;
        }

        .atlas-qualification-meta {
          display: flex;
          gap: 3mm;
          margin-bottom: 5mm;
          flex-wrap: wrap;
        }
        .atlas-qualification-meta span {
          border-radius: 999px;
          padding: 1.2mm 3mm;
          background: var(--atlas-soft-blue);
          color: var(--atlas-muted);
          font-size: 8px;
        }
        .atlas-qualification-stage {
          display: grid;
          width: 164mm;
          height: 182mm;
          place-items: center;
          margin: 0 auto;
        }
        .atlas-qualification-stage img { width: 100%; height: 100%; object-fit: contain; }
        .atlas-qualification-description {
          margin-top: 5mm;
          border-top: 1px solid var(--atlas-line);
          padding-top: 3mm;
          font-size: 9px;
          line-height: 1.8;
        }

        .atlas-divider .atlas-body {
          display: grid;
          align-content: center;
        }
        .atlas-divider-number {
          color: rgba(15,157,148,.16);
          font-size: 48px;
          font-weight: 900;
        }
        .atlas-divider h2 {
          max-width: 140mm;
          margin: -2mm 0 0;
          font-size: 40px;
          line-height: 1.3;
        }
        .atlas-divider p { margin-top: 5mm; color: var(--atlas-muted); line-height: 1.9; }
        .atlas-divider-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4mm;
          margin-top: 11mm;
        }
        .atlas-divider-stats div { border-top: 2px solid var(--atlas-teal); padding-top: 3mm; }
        .atlas-divider-stats div:nth-child(2) { border-top-color: var(--atlas-blue); }
        .atlas-divider-stats div:nth-child(3) { border-top-color: var(--atlas-coral); }
        .atlas-divider-stats strong { display: block; font-size: 20px; }
        .atlas-divider-stats span { color: var(--atlas-muted); font-size: 8px; }

        .atlas-report-title { position: relative; margin-bottom: 6mm; }
        .atlas-report-title > span { color: var(--atlas-coral); font-size: 8.5px; font-weight: 900; }
        .atlas-report-title > div { display: flex; align-items: center; gap: 3mm; margin-top: 2mm; }
        .atlas-report-title i {
          width: 1.2mm;
          height: 11mm;
          border-radius: 999px;
          background: var(--atlas-teal);
        }
        .atlas-report-title h1 { margin: 0; font-size: 27px; line-height: 1.3; }
        .atlas-report-title small {
          position: absolute;
          top: 1mm;
          left: 0;
          color: var(--atlas-muted);
          font-size: 7.5px;
        }

        .atlas-report-sections { display: grid; gap: 4mm; }
        .atlas-report-section h2 { margin: 0 0 2mm; font-size: 14px; }

        .atlas-detail-grid {
          grid-auto-flow: row dense;
          gap: 2.5mm;
          border-radius: 4mm;
          padding: 4mm;
          background: #fff;
          box-shadow: inset 0 0 0 1px var(--atlas-line);
        }

        .atlas-detail-card {
          display: grid;
          grid-template-columns: 9mm 1fr;
          min-height: 18mm;
          align-items: center;
          gap: 2.5mm;
          border-radius: 3mm;
          padding: 2.5mm 3mm;
          background: var(--atlas-soft-teal);
        }
        .atlas-detail-card-blue { background: var(--atlas-soft-blue); }
        .atlas-detail-card-coral { background: var(--atlas-soft-coral); }
        .atlas-detail-card-wide { grid-column: 1 / -1; }
        .atlas-detail-index {
          display: grid;
          width: 7mm;
          height: 7mm;
          place-items: center;
          border-radius: 50%;
          background: #fff;
          color: var(--atlas-teal);
          font-size: 6.5px;
          font-weight: 900;
        }
        .atlas-detail-card small { display: block; color: var(--atlas-muted); font-size: 7.4px; }
        .atlas-detail-card strong { display: block; margin-top: .8mm; font-size: 9.5px; line-height: 1.5; }

        .atlas-value-list { margin: 0; padding: 0; list-style: none; }
        .atlas-value-list li { position: relative; padding: .3mm 3.4mm .3mm 0; }
        .atlas-value-list li::before {
          content: "";
          position: absolute;
          top: 2.4mm;
          right: 0;
          width: 1.3mm;
          height: 1.3mm;
          border-radius: 50%;
          background: var(--atlas-teal);
        }

        .atlas-narrative {
          margin: 0;
          border-radius: 3mm;
          padding: 4mm;
          background: var(--atlas-soft-blue);
          font-size: 9.7px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .atlas-evidence-grid { display: grid; gap: 5mm; }
        .atlas-evidence { margin: 0; overflow: hidden; border-radius: 4mm; }
        .atlas-evidence img { display: block; width: 100%; border-radius: 4mm; }
        .atlas-file {
          display: grid;
          min-height: 23mm;
          place-items: center;
          border-radius: 3mm;
          background: var(--atlas-soft-blue);
          color: var(--atlas-ink);
          text-decoration: none;
          font-weight: 800;
        }

        .atlas-closing {
          background: var(--atlas-soft-coral);
        }

        @media screen and (max-width: 900px) {
          .atlas-page { width: 100%; }
        }
      `}</style>

      <AtlasPage sectionLabel="الغلاف" className="atlas-cover" indexLabel="01">
        <div className="atlas-cover-content">
          <PortfolioCoverOfficialLogos
            ministryLogoSrc="/uploads/school-logos/MOE.png"
            visionLogoSrc="/uploads/school-logos/VISION2030.png"
            tone="dark"
          />
          <span>ملف مهني موثّق</span>
          <h1>{data.portfolio.title}</h1>
          <p>{data.owner.jobTitle}</p>

          <div className="atlas-cover-meta">
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
      </AtlasPage>

      {data.portfolio.preferences.showTableOfContents ? (
        <AtlasPage sectionLabel="الفهرس" indexLabel="02">
          <Heading
            kicker="خارطة الملف"
            title="فهرس المحتويات"
            description="تنظيم بصري يوضح تسلسل أقسام ملف الإنجاز."
          />

          <div className="atlas-index-grid">
            {data.sections
              .filter((section) => section.isEnabled)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((section, index) => (
                <article key={section.id} className="atlas-index-item">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{section.title}</strong>
                </article>
              ))}
          </div>
        </AtlasPage>
      ) : null}

      {sectionEnabled("introduction") ? (
        <div style={{ order: sectionOrder("introduction") }}>
          <AtlasPage sectionLabel="المقدمة" indexLabel="03">
            <Heading
              kicker="مدخل الملف"
              title="المقدمة"
              description={
                data.portfolio.introText ||
                "يعرض هذا الملف أبرز الأعمال والتقارير والشواهد المهنية خلال الفصل الدراسي."
              }
            />

            {data.educationIdentity.vision || data.educationIdentity.mission ? (
              <div className="atlas-vision-grid">
                {data.educationIdentity.vision ? (
                  <IntroCard
                    title="الرؤية"
                    text={data.educationIdentity.vision}
                    tone="blue"
                  />
                ) : null}

                {data.educationIdentity.mission ? (
                  <IntroCard
                    title="الرسالة"
                    text={data.educationIdentity.mission}
                    tone="teal"
                  />
                ) : null}
              </div>
            ) : null}

            {data.educationIdentity.pillars.length ||
            data.educationIdentity.values.length ? (
              <div className="atlas-dual-list">
                {data.educationIdentity.pillars.length ? (
                  <section>
                    <h3>المحاور</h3>
                    <p>مرتكزات العمل التعليمي</p>
                    <ol>
                      {data.educationIdentity.pillars.map((item, index) => (
                        <li key={`pillar-${index}`}>{item}</li>
                      ))}
                    </ol>
                  </section>
                ) : null}

                {data.educationIdentity.values.length ? (
                  <section>
                    <h3>القيم</h3>
                    <p>قيم تقود الممارسة المهنية</p>
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
              <section className="atlas-objectives">
                <h3>الأهداف الاستراتيجية</h3>
                <ol>
                  {data.educationIdentity.strategicObjectives.map((item, index) => (
                    <li key={`objective-${index}`}>{item}</li>
                  ))}
                </ol>
              </section>
            ) : null}
          </AtlasPage>
        </div>
      ) : null}

      {sectionEnabled("profile") ? (
        <div style={{ order: sectionOrder("profile") }}>
          <AtlasPage sectionLabel="السيرة المهنية" indexLabel="04">
            <Heading kicker="صاحب الملف" title="السيرة المهنية" />

            {data.biography.professionalSummary ? (
              <p className="atlas-profile-summary">
                {data.biography.professionalSummary}
              </p>
            ) : null}

            <div className="atlas-profile-grid">
              {[
                ["الاسم", data.owner.name],
                ["المسمى الوظيفي", data.owner.jobTitle],
                [
                  "المدرسة",
                  data.portfolio.preferences.showSchoolName ? data.school.name : "",
                ],
                ["التخصص", data.biography.specialization],
                ["المؤهل العلمي", data.biography.academicQualification],
                ["سنوات الخبرة", data.biography.yearsOfExperience],
                ["المهارات", data.biography.skills],
                ["الاهتمامات المهنية", data.biography.professionalInterests],
              ]
                .filter(([, value]) => Boolean(value))
                .map(([label, value], index) => (
                  <article key={`${label}-${index}`} className="atlas-profile-item">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
            </div>
          </AtlasPage>
        </div>
      ) : null}

      {sectionEnabled("qualifications") ? (
        <div style={{ order: sectionOrder("qualifications") }}>
          {qualifications.map((item) => {
            const hasImage =
              Boolean(item.attachmentUrl) &&
              (item.attachmentKind === "IMAGE" ||
                item.attachmentMimeType.startsWith("image/") ||
                /\.(?:jpe?g|png|webp|gif|svg)(?:\?.*)?$/i.test(item.attachmentUrl));

            return (
              <AtlasPage
                key={item.id}
                sectionLabel="المؤهلات والدورات"
                indexLabel="05"
              >
                <Heading
                  kicker={
                    item.type === "QUALIFICATION"
                      ? "مؤهل"
                      : item.type === "COURSE"
                        ? "دورة"
                        : "شهادة"
                  }
                  title={item.title}
                />

                <div className="atlas-qualification-meta">
                  {item.issuer ? <span>{item.issuer}</span> : null}
                  {item.date ? <span>{item.date}</span> : null}
                  {item.hours ? <span>{item.hours} ساعة</span> : null}
                </div>

                <div className="atlas-qualification-stage">
                  {hasImage ? (
                    <img src={item.attachmentUrl} alt={item.title} />
                  ) : (
                    <span>لا توجد صورة مرفقة</span>
                  )}
                </div>

                {item.description ? (
                  <p className="atlas-qualification-description">
                    {item.description}
                  </p>
                ) : null}
              </AtlasPage>
            );
          })}
        </div>
      ) : null}

      {enabledSections.map((section, index) => (
        <div key={section.key} style={{ order: section.sortOrder }}>
          {data.portfolio.preferences.showPerformanceDividers ? (
            <AtlasPage
              sectionLabel={section.title}
              className="atlas-divider"
              indexLabel={String(index + 1).padStart(2, "0")}
            >
              <span className="atlas-divider-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2>{section.title}</h2>
              {section.intro ? <p>{section.intro}</p> : null}

              <div className="atlas-divider-stats">
                <div>
                  <strong>{section.weight}%</strong>
                  <span>الوزن</span>
                </div>
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
            </AtlasPage>
          ) : null}

          {section.reports.map((report) =>
            report.content ? (
              <AtlasReportPages key={report.id} report={report.content} />
            ) : null,
          )}
        </div>
      ))}

      {sectionEnabled("closing") ? (
        <AtlasPage
          sectionLabel="الخاتمة"
          className="atlas-divider atlas-closing"
          style={{ order: sectionOrder("closing") }}
          indexLabel="∞"
        >
          <span className="atlas-divider-number">∞</span>
          <h2>الخاتمة</h2>
          <p>
            {data.portfolio.conclusionText ||
              "ختامًا، يمثل هذا الملف توثيقًا مهنيًا لأبرز الإنجازات وفرص التطوير القادمة."}
          </p>
        </AtlasPage>
      ) : null}
    </div>
  );
}
