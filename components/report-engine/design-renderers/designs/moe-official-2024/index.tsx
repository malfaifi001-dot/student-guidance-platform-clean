import type { CSSProperties, ReactNode } from "react";

import { MOE_OFFICIAL_2024_EXACT_CSS } from "./original-portfolio-styles";
import { MOE_OFFICIAL_2024_ADMIN_PRESENTATION_CSS } from "./admin-presentation-styles";
import type { ReportDesignPageComponentProps } from "../report-design-component-types";
import { ReportDesignSmartContent } from "../../smart-layout/report-design-smart-content";

export const MOE_2024 = {
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

export function BrandRule() {
  return (
    <div
      className="moe24-brand-rule"
      aria-hidden="true"
    />
  );
}

export function MoeReportPage({
  children,
  sectionLabel,
  schoolName,
  educationDepartment,
  ministryLogoSrc,
}: {
  children: ReactNode;
  sectionLabel: string;
  schoolName: string;
  educationDepartment: string;
  ministryLogoSrc: string;
}) {
  return (
    <section
      className="moe24-page moe24-report-page pdf-report-page"
      data-page-label={sectionLabel}
      data-report-design="moe-official-2024"
    >
      <BrandRule />

      <header className="moe24-page-header">
        <div className="moe24-header-brand">
          <img
            src={ministryLogoSrc}
            alt="شعار الوزارة الرسمي"
            className="h-[12mm] w-[37.5mm] object-contain"
          />
        </div>

        <div
          dir="rtl"
          className="flex min-w-0 max-w-[82mm] flex-col items-start text-left leading-[1.45]"
        >
          {educationDepartment ? <span>{educationDepartment}</span> : null}
          {schoolName ? <span>{schoolName}</span> : null}
        </div>
      </header>

      <div className="moe24-page-body">
        {children}
      </div>

      <footer data-report-page-footer className="moe24-page-footer">
        <span />
        <span />
        <span className="moe24-page-number" />
      </footer>
      <div
        dir="rtl"
        className="pointer-events-auto absolute bottom-[3mm] right-[15mm] z-10 whitespace-nowrap text-[8px] font-medium text-[var(--moe24-muted)]"
      >
        بواسطة{" "}
        <a
          href="https://teachix.sa"
          target="_blank"
          rel="noopener noreferrer"
          className="text-inherit no-underline hover:underline"
        >
          Teachix.sa
        </a>
      </div>
    </section>
  );
}

export function MoeOfficial2024ReportDesign({
  page,
  context,
  previewCase,
  pageLabel,
  PageBlocks,
  getDesignLogoSrc,
}: ReportDesignPageComponentProps) {
  const designId = "moe-official-2024" as const;

  const title =
    String(context["case.title"] || "").trim() ||
    pageLabel ||
    "التقرير";

  const serviceName =
    String(context["service.name"] || "").trim() ||
    "التقرير";

  const schoolName =
    String(context["identity.schoolName"] || "").trim();

  const educationDepartment =
    String(context["identity.educationDepartment"] || "").trim();

  const ministryLogoSrc = getDesignLogoSrc(context);

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
      <style>{MOE_OFFICIAL_2024_EXACT_CSS}</style>
      <style>{MOE_OFFICIAL_2024_ADMIN_PRESENTATION_CSS}</style>

      <MoeReportPage
        sectionLabel={serviceName}
        schoolName={schoolName}
        educationDepartment={educationDepartment}
        ministryLogoSrc={ministryLogoSrc}
      >
        <ReportDesignSmartContent
          availableHeightMm={241}
          contentClassName="flex min-h-full flex-col"
          priorityMode="signature"
        >
          <header
            className="moe24-report-title shrink-0"
            style={{
              marginBottom: "calc(6mm * var(--report-field-spacing-scale, 1))",
              paddingBottom: "calc(4.5mm * var(--report-field-spacing-scale, 1))",
            }}
          >
            <div
              className="moe24-report-title-row"
              style={{
                gap: "calc(3mm * var(--report-field-spacing-scale, 1))",
                marginTop: 0,
              }}
            >
              <span
                className="moe24-report-title-accent"
                aria-hidden="true"
              />

              <h1
                style={{
                  fontSize: "calc(26px * var(--report-heading-scale, 1))",
                }}
              >
                {title}
              </h1>
            </div>
          </header>

          <div
            className="moe24-report-sections min-h-0 flex-1"
          >
            <PageBlocks
              page={page}
              context={context}
              previewCase={previewCase}
              designId={designId}
              className="min-h-full"
            />
          </div>
        </ReportDesignSmartContent>
      </MoeReportPage>
    </div>
  );
}
