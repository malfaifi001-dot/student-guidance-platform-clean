"use client";

import { EvidenceQrCode } from "@/components/report-engine/design-renderers/shared/evidence-qr-code";
import type { PortfolioPrintData } from "@/components/portfolio/print/portfolio-print-types";

export function PortfolioQualificationEvidence({ item, className = "" }: { item: PortfolioPrintData["qualificationItems"][number]; className?: string }) {
  const hasImage = Boolean(item.attachmentUrl) && (item.attachmentKind === "IMAGE" || item.attachmentMimeType.startsWith("image/") || /\.(?:jpe?g|png|webp|gif|svg)(?:\?.*)?$/i.test(item.attachmentUrl));
  const url = item.externalUrl || (!hasImage && /^https?:\/\//i.test(item.attachmentUrl) ? item.attachmentUrl : "");
  if (!hasImage && !url) return null;

  return <div className={`portfolio-qualification-evidence grid gap-4 ${hasImage && url ? "portfolio-qualification-evidence-combined grid-cols-[minmax(0,1fr)_48mm] items-center" : "place-items-center"} ${className}`} dir="rtl">
    {hasImage ? <div className="portfolio-qualification-certificate grid min-h-[100mm] min-w-0 place-items-center"><img src={item.attachmentUrl} alt={item.title} className="max-h-[165mm] max-w-full object-contain" /></div> : null}
    {url ? <div className="portfolio-qualification-qr grid min-h-[100mm] min-w-[48mm] place-items-center content-center gap-2 bg-white p-3 text-center"><a href={url} target="_blank" rel="noreferrer" className="portfolio-qualification-qr-link"><EvidenceQrCode url={url} title={item.title} /></a><span className="text-xs font-bold leading-5">امسح الرمز لعرض الدورة أو الشهادة</span><a href={url} target="_blank" rel="noreferrer" className="portfolio-qualification-open-link text-xs font-black underline">فتح الرابط</a></div> : null}
  </div>;
}
