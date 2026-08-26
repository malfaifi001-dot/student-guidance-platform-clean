import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";

export function PortfolioEducationalIdentityContent({ data, variant = "shared" }: { data: PortfolioPrintData; variant?: "shared" | "atlas" | "horizon" | "ministry" | "moe" }) {
  const identity = data.educationIdentity;
  return (
    <div className={`portfolio-educational-identity-content portfolio-educational-identity-${variant}`} data-portfolio-safe-content>
      <header className="portfolio-identity-page-heading">
        <span>الهوية التعليمية</span>
        <h1>الهوية التعليمية</h1>
      </header>
      {identity.vision || identity.mission ? <div className="portfolio-identity-vision-mission">
        {identity.vision ? <section><h2>الرؤية</h2><p>{identity.vision}</p></section> : null}
        {identity.mission ? <section><h2>الرسالة</h2><p>{identity.mission}</p></section> : null}
      </div> : null}
      {identity.pillars.length || identity.values.length ? <div className="portfolio-identity-lists">
        {identity.pillars.length ? <section><h2>المحاور</h2><ol>{identity.pillars.map((item, index) => <li key={`pillar-${index}`}>{item}</li>)}</ol></section> : null}
        {identity.values.length ? <section><h2>القيم</h2><ol>{identity.values.map((item, index) => <li key={`value-${index}`}>{item}</li>)}</ol></section> : null}
      </div> : null}
      {identity.strategicObjectives.length ? <section className="portfolio-identity-objectives"><h2>الأهداف الاستراتيجية</h2><ol>{identity.strategicObjectives.map((item, index) => <li key={`objective-${index}`}>{item}</li>)}</ol></section> : null}
      <style>{`
        .portfolio-educational-identity-content{font-family:var(--portfolio-font-stack);display:grid;gap:7mm;max-width:100%;color:#263238}
        .portfolio-identity-page-heading{border-inline-start:1.5mm solid #b99463;padding-inline-start:4mm}
        .portfolio-identity-page-heading span{font-size:10px;font-weight:800;color:#96744d}
        .portfolio-identity-page-heading h1{margin:1mm 0 0;font-size:22px;line-height:1.25;font-weight:900}
        .portfolio-identity-vision-mission,.portfolio-identity-lists{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5mm}
        .portfolio-identity-vision-mission section,.portfolio-identity-lists section,.portfolio-identity-objectives{border:1px solid #dfd2c1;border-radius:3mm;padding:4mm;background:#fffdf9;break-inside:avoid}
        .portfolio-identity-vision-mission h2,.portfolio-identity-lists h2,.portfolio-identity-objectives h2{margin:0 0 2mm;font-size:14px;line-height:1.4;font-weight:800;color:#725537}
        .portfolio-identity-vision-mission p,.portfolio-identity-lists li,.portfolio-identity-objectives li{font-size:11px;line-height:1.8}
        .portfolio-identity-vision-mission p{margin:0}
        .portfolio-identity-lists ol,.portfolio-identity-objectives ol{margin:0;padding-inline-start:5mm}
        .portfolio-identity-lists li,.portfolio-identity-objectives li{margin-bottom:1.5mm}
        @media print{.portfolio-educational-identity-content{break-inside:avoid;page-break-inside:avoid}}
      `}</style>
    </div>
  );
}
