"use client";

import {
  activeCertificateTemplateRegistry,
  certificateTemplateRegistry,
  getCertificateTemplateByKey,
} from "@/lib/certificates/certificate-template-registry";
import { getCertificateTemplateLayout } from "@/lib/certificates/certificate-template-layouts";
import { useEffect, useRef, useState } from "react";
import { SignatureImage } from "@/components/signatures/signature-image";

const LOGICAL_WIDTH = 842.25;
const LOGICAL_HEIGHT = 595.5;
const CSS_PX_PER_POINT = 4 / 3;
const PHYSICAL_WIDTH = LOGICAL_WIDTH * CSS_PX_PER_POINT;
const PHYSICAL_HEIGHT = LOGICAL_HEIGHT * CSS_PX_PER_POINT;

type PreviewDimensions = {
  scale: number;
  width: number;
  height: number;
};

export type CertificateTemplatePreviewData = {
  templateKey?: string;
  certificateType: string;
  recipientName: string;
  body: string;
  reason?: string;
  issueDate: string;
  certificateNumber?: string;
  issuerName?: string;
  issuerTitle?: string;
  principalName?: string;
  issuerSignatureUrl?: string;
  principalSignatureUrl?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return date.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function CertificateTemplateSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {activeCertificateTemplateRegistry.map((template) => {
        const selected = template.key === value;
        return (
          <button
            key={template.key}
            type="button"
            onClick={() => onChange(template.key)}
            aria-pressed={selected}
            className={`group rounded-[1.75rem] border p-3 text-right transition ${
              selected
                ? "border-sky-500 bg-sky-50 shadow-md ring-2 ring-sky-200"
                : "border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50"
            }`}
          >
            <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              <img
                src={template.previewImagePath}
                alt={template.name}
                className="aspect-[297/210] w-full object-cover"
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm font-black text-slate-900">{template.name}</span>
              {selected ? (
                <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[11px] font-black text-white">
                  محدد
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
              {template.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function CertificateTemplatePreview({ data }: { data: CertificateTemplatePreviewData }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [previewDimensions, setPreviewDimensions] = useState<PreviewDimensions>({
    scale: 0.75,
    width: PHYSICAL_WIDTH * 0.75,
    height: PHYSICAL_HEIGHT * 0.75,
  });
  const template =
    getCertificateTemplateByKey(data.templateKey || "") || certificateTemplateRegistry[0];
  const layout = getCertificateTemplateLayout(template.key);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let frameId = 0;
    const updateScale = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const screenWidth =
          window.visualViewport?.width ||
          document.documentElement.clientWidth ||
          window.innerWidth;
        const viewportWidth = Math.min(viewport.clientWidth, screenWidth);
        const safeHorizontalGap = viewportWidth < 640 ? 24 : 40;
        const availableWidth = Math.max(0, viewportWidth - safeHorizontalGap);
        if (!availableWidth) return;

        const scale = Math.min(1, availableWidth / PHYSICAL_WIDTH);
        const next = {
          scale,
          width: PHYSICAL_WIDTH * scale,
          height: PHYSICAL_HEIGHT * scale,
        };

        setPreviewDimensions((current) =>
          Math.abs(current.scale - next.scale) < 0.001 ? current : next,
        );
      });
    };

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(viewport);
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    updateScale();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={viewportRef} dir="ltr" className="relative mx-auto w-full overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
      <div
        className="relative mx-auto"
        style={{ width: previewDimensions.width, height: previewDimensions.height }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: PHYSICAL_WIDTH,
            height: PHYSICAL_HEIGHT,
            transform: `scale(${previewDimensions.scale})`,
            transformOrigin: "top left",
          }}
        >
            <div
            dir="rtl"
            className="relative overflow-hidden bg-white"
            style={{
              width: "100%",
              height: "100%",
              fontFamily: 'var(--font-cairo, "Cairo"), Tahoma, Arial, sans-serif',
            }}
          >
            <img
              src={template.templatePath}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-fill"
            />
            {layout.logoMode === "none" ? null : layout.logoMode === "combined" ? (
              <img
                src="/templates/certificates/moe-vision-combined.svg"
                alt="وزارة التعليم ورؤية 2030"
                className="absolute object-contain"
                style={{
                  top: layout.combinedLogoTop,
                  left: layout.combinedLogoLeft,
                  width: layout.combinedLogoWidth,
                  maxHeight: layout.combinedLogoMaxHeight,
                  height: "auto",
                  filter: layout.combinedLogoVariant === "white" ? "brightness(0) invert(1)" : "none",
                  opacity: layout.combinedLogoOpacity,
                  mixBlendMode: layout.combinedLogoBlendMode,
                }}
              />
            ) : (
              <>
                <img
                  src="/templates/certificates/moe-logo.svg"
                  alt="وزارة التعليم"
                  className="absolute object-contain"
                  style={{
                    top: layout.ministryLogoTop,
                    ...(layout.ministryLogoLeft !== "auto"
                      ? { left: layout.ministryLogoLeft }
                      : { right: layout.ministryLogoRight }),
                    width: layout.ministryLogoWidth,
                    maxHeight: layout.ministryLogoMaxHeight,
                    height: "auto",
                    filter: layout.ministryLogoVariant === "white" ? "brightness(0) invert(1)" : "none",
                    opacity: layout.ministryLogoOpacity,
                    mixBlendMode: layout.ministryLogoBlendMode,
                  }}
                />
                <img
                  src="/uploads/school-logos/VISION2030.png"
                  alt="رؤية 2030"
                  className="absolute object-contain"
                  style={{
                    top: layout.visionLogoTop,
                    left: layout.visionLogoLeft,
                    width: layout.visionLogoWidth,
                    maxHeight: layout.visionLogoMaxHeight,
                    height: "auto",
                    filter: layout.visionLogoVariant === "white" ? "brightness(0) invert(1)" : "none",
                    opacity: layout.visionLogoOpacity,
                    mixBlendMode: layout.visionLogoBlendMode,
                  }}
                />
              </>
            )}
            <div className="absolute inset-0 text-center" dir="rtl">
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: layout.contentTop,
            width: layout.contentWidth,
            maxWidth: "78%",
          }}
        >
          <p className="font-bold" style={{ color: layout.introColor, fontSize: layout.introSize, marginTop: layout.introMarginTop }}>
            تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى
          </p>
          <p
            className="font-black leading-tight"
            style={{ color: layout.nameColor, fontSize: layout.nameSize, marginTop: layout.nameMarginTop }}
          >
            {data.recipientName || "اسم المستفيد"}
          </p>
          <p className="mx-auto max-w-[90%] font-bold" style={{ color: layout.bodyColor, fontSize: layout.bodySize, lineHeight: layout.bodyLineHeight, marginTop: layout.bodyMarginTop }}>
            {data.body}
          </p>
        </div>

        <div className="absolute font-black" style={{ bottom: layout.signatureBottom, ...(layout.swapSignatureSides ? { right: layout.signatureLeft } : { left: layout.signatureLeft }), width: layout.signatureWidth, color: layout.signatureTitleColor, fontSize: layout.signatureTitleSize }}>
          <p style={{ fontSize: layout.signatureTitleSize }}>{data.issuerTitle || "الموجه الطلابي"}</p>
          {data.issuerSignatureUrl ? <SignatureImage src={data.issuerSignatureUrl} alt="" strokeBoost={1} maxWidth={layout.signatureImageMaxWidth} maxHeight={layout.signatureImageMaxHeight} style={{ height: layout.signatureFrameHeight, marginInline: "auto", marginBottom: layout.signatureImageMarginBottom }} /> : <div style={{ height: layout.signatureFrameHeight }} />}
          <p className="font-bold" style={{ color: layout.signatureNameColor, fontSize: layout.signatureNameSize }}>{data.issuerName || "حسب الحساب"}</p>
        </div>
        <div className="absolute font-black" style={{ bottom: layout.signatureBottom, ...(layout.swapSignatureSides ? { left: layout.signatureRight } : { right: layout.signatureRight }), width: layout.signatureWidth, color: layout.signatureTitleColor, fontSize: layout.signatureTitleSize }}>
          <p style={{ fontSize: layout.signatureTitleSize }}>مدير المدرسة</p>
          {data.principalSignatureUrl ? <SignatureImage src={data.principalSignatureUrl} alt="" strokeBoost={1} maxWidth={layout.signatureImageMaxWidth} maxHeight={layout.signatureImageMaxHeight} style={{ height: layout.signatureFrameHeight, marginInline: "auto", marginBottom: layout.signatureImageMarginBottom }} /> : <div style={{ height: layout.signatureFrameHeight }} />}
          <p className="font-bold" style={{ color: layout.signatureNameColor, fontSize: layout.signatureNameSize }}>{data.principalName || "مدير المدرسة"}</p>
        </div>
        <div className="absolute -translate-x-1/2 font-bold leading-5" style={{ bottom: layout.metaBottom, left: layout.metaLeft, fontSize: layout.metaSize, color: layout.metaColor }}>
          <p>تاريخ الإصدار: {formatDate(data.issueDate)}</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
