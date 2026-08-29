"use client";

import {
  certificateTemplateRegistry,
  getCertificateTemplateByKey,
} from "@/lib/certificates/certificate-template-registry";
import { getCertificateTemplateLayout } from "@/lib/certificates/certificate-template-layouts";
import { getCertificateTypeLabel } from "@/lib/certificates/certificate-types";

export type CertificateTemplatePreviewData = {
  templateKey?: string;
  certificateType: string;
  recipientName: string;
  body: string;
  reason?: string;
  issueDate: string;
  certificateNumber?: string;
  issuerName?: string;
  principalName?: string;
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
      {certificateTemplateRegistry.map((template) => {
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
  const template =
    getCertificateTemplateByKey(data.templateKey || "") || certificateTemplateRegistry[0];
  const layout = getCertificateTemplateLayout(template.key);

  return (
    <div className="relative mx-auto aspect-[297/210] w-full min-w-[760px] overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200">
      <img
        src={template.templatePath}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-fill"
      />
      <img
        src="/templates/certificates/moe-logo.svg"
        alt="وزارة التعليم"
        className="absolute object-contain"
        style={{
          top: layout.ministryLogoTop,
          left: layout.ministryLogoLeft,
          width: layout.ministryLogoWidth,
          maxHeight: layout.ministryLogoMaxHeight,
          height: "auto",
        }}
      />
      <div className="absolute inset-0 text-center" dir="rtl">
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: layout.contentTop,
            width: layout.contentWidth,
            maxWidth: "78%",
          }}
        >
          {layout.showDynamicTitle ? (
            <>
              <h3
                className="font-black leading-tight"
                style={{ color: layout.titleColor, fontSize: layout.titleSize }}
              >
                {data.certificateType ? getCertificateTypeLabel(data.certificateType) : "شهادة"}
              </h3>
              <div
                className="mx-auto mt-3 h-1 rounded-full"
                style={{ width: "28%", backgroundColor: layout.accentColor }}
              />
            </>
          ) : null}
          <p className="font-bold" style={{ color: layout.bodyColor, fontSize: layout.introSize, marginTop: layout.introMarginTop }}>
            تتقدم إدارة المدرسة بخالص الشكر والتقدير إلى
          </p>
          <p
            className="font-black leading-tight"
            style={{ color: layout.titleColor, fontSize: layout.nameSize, marginTop: layout.nameMarginTop }}
          >
            {data.recipientName || "اسم المستفيد"}
          </p>
          <p className="mx-auto max-w-[90%] font-bold leading-7" style={{ color: layout.bodyColor, fontSize: layout.bodySize, marginTop: layout.bodyMarginTop }}>
            {data.body}
          </p>
          {data.reason ? (
            <p className="font-bold" style={{ color: "#627d98", fontSize: layout.reasonSize, marginTop: layout.reasonMarginTop }}>
              {data.reason}
            </p>
          ) : null}
        </div>

        <div className="absolute text-[clamp(8px,1vw,12px)] font-black" style={{ bottom: layout.signatureBottom, ...(layout.swapSignatureSides ? { right: layout.signatureLeft } : { left: layout.signatureLeft }), width: layout.signatureWidth, color: layout.signatureColor }}>
          <p>الموجه / رائد النشاط</p>
          <div className="my-2 h-px" style={{ backgroundColor: layout.accentColor }} />
          <p className="text-[clamp(7px,.9vw,11px)] font-bold text-slate-500">{data.issuerName || "حسب الحساب"}</p>
        </div>
        <div className="absolute text-[clamp(8px,1vw,12px)] font-black" style={{ bottom: layout.signatureBottom, ...(layout.swapSignatureSides ? { left: layout.signatureRight } : { right: layout.signatureRight }), width: layout.signatureWidth, color: layout.signatureColor }}>
          <p>مدير المدرسة</p>
          <div className="my-2 h-px" style={{ backgroundColor: layout.accentColor }} />
          <p className="text-[clamp(7px,.9vw,11px)] font-bold text-slate-500">{data.principalName || "مدير المدرسة"}</p>
        </div>
        <div className="absolute -translate-x-1/2 text-[clamp(7px,.9vw,11px)] font-bold leading-5 text-slate-500" style={{ bottom: layout.metaBottom, left: layout.metaLeft }}>
          <p>تاريخ الإصدار: {formatDate(data.issueDate)}</p>
          {data.certificateNumber ? <p>رقم الشهادة: {data.certificateNumber}</p> : null}
        </div>
      </div>
    </div>
  );
}
