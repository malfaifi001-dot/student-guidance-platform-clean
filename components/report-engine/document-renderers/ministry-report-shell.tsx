import type { ReportDocumentPage } from "@/lib/report-engine/document-draft/report-document-types";
import type { SmartReportPayload } from "@/lib/report-engine/smart-report-types";

type MinistryReportHeaderProps = {
  payload: SmartReportPayload;
  page: ReportDocumentPage;
};

type MinistryReportFooterProps = {
  payload: SmartReportPayload;
};

function getServiceDisplayName(payload: SmartReportPayload) {
  return payload.service.name || payload.caseInfo.title || "الخدمة";
}

function getSchoolName(payload: SmartReportPayload) {
  return payload.identity.schoolName || "اسم المدرسة";
}

function getEducationDepartment(payload: SmartReportPayload) {
  return payload.identity.educationDepartment || "وزارة التعليم";
}

function getEducationOffice(payload: SmartReportPayload) {
  return payload.identity.educationOffice || "الإدارة العامة للتعليم";
}

function getAcademicYear(payload: SmartReportPayload) {
  return payload.identity.academicYear || "1447/01/01 هـ";
}

function getLogoUrl(payload: SmartReportPayload) {
  return payload.identity.schoolLogoUrl || "/uploads/school-logos/MOE.png";
}

export function MinistryReportHeader({ payload }: MinistryReportHeaderProps) {
  const schoolName = getSchoolName(payload);
  const serviceDisplayName = getServiceDisplayName(payload);
  const educationDepartment = getEducationDepartment(payload);
  const educationOffice = getEducationOffice(payload);
  const academicYear = getAcademicYear(payload);
  const logoUrl = getLogoUrl(payload);

  return (
    <header className="relative h-[178px] shrink-0 bg-white pt-3">
      <div className="relative mx-auto h-[150px] w-[92%] overflow-hidden rounded-b-[3.2rem] bg-[#143840] text-white shadow-[0_18px_40px_rgba(20,56,64,0.14)]">
        <div className="absolute inset-x-0 top-0 h-[4px] bg-white/95" />
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-white/[0.045]" />
        <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-white/[0.045]" />

        <div
          dir="rtl"
          className="relative grid h-full grid-cols-[1fr_1.25fr_1fr] items-center px-14"
        >
          <div className="flex justify-center text-center">
            <div className="space-y-1 text-[13px] font-bold leading-6 text-white">
              <div>وزارة التعليم</div>
              <div>{educationDepartment || educationOffice}</div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <img
              src={logoUrl}
              alt="شعار وزارة التعليم"
              className="h-[68px] w-[170px] object-contain brightness-0 invert"
            />

            <div className="mt-3 line-clamp-1 text-[13px] font-bold leading-8 text-white">
              {schoolName}
            </div>
          </div>

          <div className="flex justify-center text-center">
            <div className="space-y-1 text-[13px] font-bold leading-6 text-white">
              <div>{academicYear}</div>
              <div>{serviceDisplayName}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function MinistryReportFooter({ payload }: MinistryReportFooterProps) {
  const schoolName = getSchoolName(payload);
  const serviceDisplayName = getServiceDisplayName(payload);
  const logoUrl = getLogoUrl(payload);

  return (
    <footer className="h-[58px] shrink-0 px-10 pb-5">
      <div className="overflow-hidden border-b-[6px] border-[#143840]">
        <div
          dir="rtl"
          className="grid h-[28px] grid-cols-[86px_minmax(0,1fr)_190px] items-center bg-[#dfeee1]"
        >
          <div className="flex h-full items-center justify-center bg-white">
            <img
              src={logoUrl}
              alt="شعار وزارة التعليم"
              className="h-[20px] w-[62px] object-contain"
            />
          </div>

          <div className="flex h-full min-w-0 items-center justify-center overflow-hidden bg-[#6f9f73] px-5 text-[11px] font-bold leading-none text-white">
            <span className="max-w-full truncate">
              {serviceDisplayName} - {schoolName}
            </span>
          </div>

          <div className="h-full bg-[linear-gradient(135deg,rgba(34,115,75,0.26),rgba(255,255,255,0.12))]" />
        </div>
      </div>
    </footer>
  );
}