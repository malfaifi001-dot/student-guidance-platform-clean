import { getDesignLogoSrc } from "@/components/report-engine/design-renderers/shared/report-logo";
import { SignatureImage } from "@/components/signatures/signature-image";

type DocumentHeaderProps = {
  title: string;
  subtitle?: string;
  schoolName: string;
  educationDepartment?: string | null;
  logoUrl?: string | null;
  academicYear?: string | null;
};

type DocumentFooterProps = {
  primaryRoleLabel: string;
  primaryName?: string | null;
  primarySignatureUrl?: string | null;
  primarySignatureAlt: string;
  principalName?: string | null;
  principalSignatureUrl?: string | null;
};

export const curriculumDocumentIdentityStyles = `
.curriculum-print-top-line { height: .9mm; background: linear-gradient(to left, #35bc70, #25ada4, #188dc4); }
.curriculum-print-header { display: flex; align-items: center; justify-content: space-between; gap: 6mm; min-height: 22mm; padding: 2mm 7mm 2.5mm; color: #fff; background: #073f4c; border-radius: 0 0 5mm 5mm; }
.curriculum-print-identity { display: flex; align-items: center; gap: 3.5mm; min-width: 0; font-size: 8pt; font-weight: 800; line-height: 1.35; }
.curriculum-print-identity img { width: 17mm; height: 15mm; object-fit: contain; filter: brightness(0) invert(1); }
.curriculum-print-identity-divider { width: .55mm; height: 14mm; flex: 0 0 auto; background: #16ad78; }
.curriculum-print-identity p { margin: 0; white-space: nowrap; }
.curriculum-print-title-block { flex: 0 0 auto; text-align: left; }
.curriculum-print-title-block h1 { margin: 0; font-size: 18pt; line-height: 1.1; }
.curriculum-print-title-block span { display: block; margin-top: 1mm; color: #8fe0c0; font-size: 7pt; font-weight: 800; }
.curriculum-print-footer { position: absolute; inset-inline: 0; bottom: 0; padding-top: 1.5mm; break-inside: avoid; page-break-inside: avoid; }
.curriculum-print-signature-row { display: grid; width: 150mm; max-width: 100%; margin-inline: auto; grid-template-columns: 1fr 1fr; align-items: end; gap: 12mm; padding: 0 1mm 3.5mm; }
.curriculum-print-signature { display: grid; gap: .3mm; color: #174b5a; font-size: 7pt; }
.curriculum-print-signature strong { color: #0b718f; font-size: 7.5pt; }
.curriculum-print-signature span { min-height: 3.5mm; font-weight: 800; }
.curriculum-print-signature-image { display: block; width: auto; max-width: 64mm; height: 16mm; max-height: 16mm; object-fit: contain; object-position: center; }
.curriculum-print-signature small { color: #526168; font-size: 6.3pt; }
.curriculum-print-signature-line { display: block; width: 100%; min-width: 100%; white-space: nowrap; text-align: center; }
.curriculum-print-footer-line { height: 1.7mm; width: 100%; background: linear-gradient(to left, #35bc70, #25ada4, #188dc4); }
@media print { .curriculum-print-header { min-height: 22mm; padding-top: 2mm; padding-bottom: 2.5mm; } .curriculum-print-footer { padding-top: 1.5mm; } .curriculum-print-signature-row { width: 150mm; max-width: 100%; margin-inline: auto; grid-template-columns: 1fr 1fr; gap: 12mm; padding-bottom: 3.5mm; } }
`;

export function CurriculumDocumentHeader({ title, subtitle, schoolName, educationDepartment, logoUrl, academicYear }: DocumentHeaderProps) {
  const logoSrc = getDesignLogoSrc({ "report.logoUrl": logoUrl || "" });

  return (
    <>
      <div className="curriculum-print-top-line" />
      <header className="curriculum-print-header">
        <div className="curriculum-print-identity">
          <img src={logoSrc} alt="شعار وزارة التعليم" />
          <span className="curriculum-print-identity-divider" />
          <div>
            <p>المملكة العربية السعودية</p>
            <p>وزارة التعليم</p>
            {educationDepartment ? <p>{educationDepartment}</p> : null}
            <p>{schoolName || ""}</p>
          </div>
        </div>
        <div className="curriculum-print-title-block">
          <h1>{title}</h1>
          {subtitle ? <span>{subtitle}</span> : academicYear ? <span>العام الدراسي {academicYear}</span> : null}
        </div>
      </header>
    </>
  );
}

export function CurriculumDocumentFooter({
  primaryRoleLabel,
  primaryName,
  primarySignatureUrl,
  primarySignatureAlt,
  principalName,
  principalSignatureUrl,
}: DocumentFooterProps) {
  return (
    <footer className="curriculum-print-footer">
      <div className="curriculum-print-signature-row">
        <div className="curriculum-print-signature">
          <strong>{primaryRoleLabel}</strong>
          <span>{primaryName || ""}</span>
          {primarySignatureUrl ? <SignatureImage className="curriculum-print-signature-image" src={primarySignatureUrl} alt={primarySignatureAlt} maxHeight="16mm" /> : <small className="curriculum-print-signature-line">التوقيع: __________________________</small>}
        </div>
        <div className="curriculum-print-signature">
          <strong>مدير المدرسة</strong>
          <span>{principalName || ""}</span>
          {principalSignatureUrl ? <SignatureImage className="curriculum-print-signature-image" src={principalSignatureUrl} alt="توقيع مدير المدرسة" maxHeight="16mm" /> : <small className="curriculum-print-signature-line">التوقيع: __________________________</small>}
        </div>
      </div>
      <div className="curriculum-print-footer-line" aria-hidden="true" />
    </footer>
  );
}
