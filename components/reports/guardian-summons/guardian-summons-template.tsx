export type GuardianSummonsReasonItem = {
  id: string;
  label: string;
  selected: boolean;
  otherText?: string | null;
};

export type GuardianSummonsTemplateData = {
  schoolName: string;
  educationDepartment?: string | null;
  educationOffice?: string | null;
  hijriYear?: string | null;
  guardianName: string;
  guardianPhone?: string | null;
  studentGrade?: string | null;
  studentClassroom?: string | null;
  appointmentDay?: string | null;
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  period?: string | null;
  reasons: GuardianSummonsReasonItem[];
  notes?: string | null;
  counselorName?: string | null;
  counselorJobTitle?: string | null;
  counselorSignatureUrl?: string | null;
  principalName?: string | null;
  principalJobTitle?: string | null;
  principalSignatureUrl?: string | null;
};

const MINISTRY_LOGO_SRC = "/uploads/school-logos/MOE.png";

function display(value: string | null | undefined) {
  return value?.trim() || "";
}

function normalizeArabicText(value: string) {
  return value
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ");
}

function stripLeadingPhrases(value: string, phrases: string[]) {
  let text = normalizeArabicText(value);

  for (const phrase of phrases) {
    const normalizedPhrase = normalizeArabicText(phrase);

    if (text === normalizedPhrase) {
      return "";
    }

    if (text.startsWith(`${normalizedPhrase} `)) {
      text = text.slice(normalizedPhrase.length).trim();
    }
  }

  return text;
}

function normalizeSchoolNameForOfficialHeader(value?: string | null) {
  return stripLeadingPhrases(display(value), ["مدرسة"]);
}

function normalizeEducationDepartment(value?: string | null) {
  return stripLeadingPhrases(display(value), [
    "الإدارة العامة للتعليم بمنطقة",
    "الادارة العامة للتعليم بمنطقة",
    "الإدارة العامة للتعليم",
    "الادارة العامة للتعليم",
    "تعليم منطقة",
    "منطقة",
  ]);
}

function isOtherReason(value: string) {
  const normalized = normalizeArabicText(value).replace(/[\s:_-]+/g, "");

  return (
    normalized === "اخرى" ||
    normalized === "other" ||
    normalized === "__other__" ||
    normalized.includes("اخرى")
  );
}

function prepareReasonRows(
  reasons: GuardianSummonsReasonItem[],
  notes?: string | null,
) {
  const seen = new Set<string>();

  return reasons
    .filter((reason) => reason.selected)
    .map((reason) => {
      const other = isOtherReason(reason.id) || isOtherReason(reason.label);

      if (other) {
        return {
          ...reason,
          label: "أخرى",
          selected: true,
          otherText: display(reason.otherText) || display(notes) || "",
        };
      }

      return {
        ...reason,
        label: display(reason.label),
        selected: true,
      };
    })
    .filter((reason) => {
      const key =
        isOtherReason(reason.id) || isOtherReason(reason.label)
          ? "other"
          : normalizeArabicText(reason.label).replace(/\s+/g, "");

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function CircleMark({ selected }: { selected: boolean }) {
  return (
    <span className="reason-marker" aria-hidden="true">
      {selected ? <span /> : null}
    </span>
  );
}

function SignatureLine() {
  return (
    <p className="signature-line">
      التوقيع: <span className="signature-space" />
    </p>
  );
}

function SignatureBlock({
  title,
  name,
  signatureUrl,
}: {
  title: string;
  name?: string | null;
  signatureUrl?: string | null;
}) {
  return (
    <div className="signature-block">
      <p className="signature-title">{title}</p>
      <p className="signature-name">{display(name)}</p>
      <div className="signature-image-slot">
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatureUrl}
            alt={`توقيع ${title}`}
            className="signature-image"
          />
        ) : (
          <SignatureLine />
        )}
      </div>
    </div>
  );
}

function buildClassroomText(data: GuardianSummonsTemplateData) {
  return [data.studentGrade, data.studentClassroom]
    .map(display)
    .filter(Boolean)
    .join(" / ");
}

function getReasonsHeading(reasonCount: number) {
  if (reasonCount === 1) {
    return "لمناقشة وحل المشكلة التالية:";
  }

  if (reasonCount > 1) {
    return "لمناقشة وحل المشكلات التالية:";
  }

  return "لمناقشة الموضوع التالي:";
}

function AppointmentSentence({ data }: { data: GuardianSummonsTemplateData }) {
  const day = display(data.appointmentDay);
  const date = display(data.appointmentDate);
  const time = display(data.appointmentTime);
  const period = display(data.period);

  return (
    <>
      <span>لذا نأمل منكم الحضور</span>
      {day ? (
        <>
          {" "}
          <span>يوم</span>{" "}
          <strong className="appointment-emphasis">{day}</strong>
        </>
      ) : null}
      {date ? (
        <>
          {" "}
          <span>الموافق</span>{" "}
          <strong className="appointment-emphasis">{date}</strong>
        </>
      ) : null}
      {time ? (
        <>
          {" "}
          <span>الساعة {time}</span>
        </>
      ) : null}
      {period ? <> {period}</> : null}
    </>
  );
}

export function GuardianSummonsTemplate({
  data,
}: {
  data: GuardianSummonsTemplateData;
}) {
  const schoolName = normalizeSchoolNameForOfficialHeader(data.schoolName);
  const educationDepartment = normalizeEducationDepartment(
    data.educationDepartment,
  );
  const hijriYear = display(data.hijriYear);
  const classroom = buildClassroomText(data);
  const reasonRows = prepareReasonRows(data.reasons, data.notes);

  return (
    <section dir="rtl" className="guardian-summons-document">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        .guardian-summons-document {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          height: 297mm;
          overflow: hidden;
          box-sizing: border-box;
          margin: 0 auto;
          padding: 11mm 16mm 13mm;
          background: #ffffff;
          color: #111111;
          font-family: "Times New Roman", "Amiri", "Noto Naskh Arabic", serif;
          font-size: 16px;
          line-height: 2;
          box-shadow: 0 6px 22px rgba(15, 23, 42, 0.12);
        }

        .guardian-summons-document * {
          box-sizing: border-box;
        }

        .official-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 58mm minmax(0, 1fr);
          grid-template-areas: "school center ministry";
          column-gap: 8mm;
          align-items: start;
          min-height: 36mm;
          direction: ltr;
        }

        .header-column {
          position: static;
          width: 100%;
          min-width: 0;
          font-size: 14px;
          line-height: 1.85;
          text-align: center;
          direction: rtl;
        }

        .header-column div {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .header-right {
          grid-area: ministry;
          text-align: center;
        }

        .header-left {
          grid-area: school;
          text-align: center;
        }

        .header-center {
          grid-area: center;
          width: auto;
          margin: 0;
          text-align: center;
          direction: rtl;
        }

        .ministry-logo {
          display: block;
          width: 45mm;
          height: 20mm;
          margin: 0 auto;
          object-fit: contain;
        }

        .document-title {
          margin: 3mm 0 0;
          text-align: center;
          font-size: 26px;
          font-weight: 800;
          line-height: 1.18;
        }

        .official-body {
          margin-top: 10mm;
        }

        .recipient-line,
        .appointment-line {
          margin: 0;
          font-size: 16.5px;
          line-height: 2.05;
          word-spacing: normal;
        }

        .greeting {
          margin: 8mm 0 0;
          text-align: center;
          font-size: 16.5px;
        }

        .body-copy {
          margin: 5mm 0 0;
          text-align: justify;
          font-size: 16.5px;
          line-height: 2.05;
        }

        .appointment-line {
          margin-top: 7mm;
        }

        .appointment-emphasis {
          font-weight: 800;
        }

        .reasons-heading {
          margin: 8mm 0 0;
          text-align: center;
          font-size: 17px;
          font-weight: 700;
        }

        .reasons-list {
          width: 141mm;
          margin: 4mm auto 0;
          padding: 0;
          list-style: none;
          font-size: 16px;
          line-height: 1.75;
        }

        .reason-row {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          min-height: 7mm;
          break-inside: avoid;
        }

        .reason-text {
          font-weight: 800;
        }

        .reason-marker {
          position: relative;
          display: inline-flex;
          width: 10px;
          height: 10px;
          flex: 0 0 10px;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
          border: 1px solid #111111;
          border-radius: 999px;
        }

        .reason-marker span {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: #111111;
        }

        .signature-footer {
          position: absolute;
          right: 16mm;
          bottom: 17mm;
          left: 16mm;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32mm;
          align-items: end;
        }

        .signature-block {
          text-align: center;
          font-size: 15px;
          line-height: 1.8;
        }

        .signature-title,
        .signature-name,
        .signature-line {
          margin: 0;
        }

        .signature-title {
          font-weight: 700;
          font-size: 15.5px;
        }

        .signature-name {
          font-size: 15px;
          min-height: 8mm;
        }

        .signature-image-slot {
          display: flex;
          height: 18mm;
          align-items: center;
          justify-content: center;
          margin: 1mm auto 0;
        }

        .signature-image {
          display: block;
          max-width: 50mm;
          max-height: 17mm;
          object-fit: contain;
        }

        .signature-space {
          display: inline-block;
          width: 34mm;
          border-bottom: 1px solid #111111;
          vertical-align: baseline;
        }

        @media screen and (max-width: 900px) {
          .guardian-summons-document {
            transform: scale(calc((100vw - 24px) / 794));
            transform-origin: top center;
            margin-bottom: calc(-297mm + ((100vw - 24px) / 794 * 297mm));
          }
        }

        @media print {
          html,
          body {
            width: 210mm !important;
            min-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .guardian-summons-document {
            width: 210mm !important;
            min-width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 11mm 16mm 13mm !important;
            overflow: hidden !important;
            box-shadow: none !important;
            transform: none !important;
            break-after: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>

      <header className="official-header">
        <div className="header-column header-right">
          <div>المملكة العربية السعودية</div>
          <div>وزارة التعليم</div>
          <div>
            {educationDepartment
              ? `الإدارة العامة للتعليم بمنطقة ${educationDepartment}`
              : "الإدارة العامة للتعليم"}
          </div>
        </div>

        <div className="header-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MINISTRY_LOGO_SRC}
            alt="وزارة التعليم"
            className="ministry-logo"
          />
          <h1 className="document-title">استدعاء ولي أمر طالب</h1>
        </div>

        <div className="header-column header-left">
          <div>{schoolName ? `مدرسة ${schoolName}` : "مدرسة"}</div>
          {hijriYear ? <div>{`العام الدراسي ${hijriYear} هـ`}</div> : null}
          <div>الإرشاد الطلابي</div>
        </div>
      </header>

      <main className="official-body">
        <p className="recipient-line">
          {`المكرم ولي أمر الطالب / ${display(data.guardianName)}${
            classroom ? ` بالصف ${classroom}` : ""
          } سلّمه الله`}
        </p>

        <p className="greeting">السلام عليكم ورحمة الله وبركاته ،،،</p>

        <p className="body-copy">
          نظرًا لأهمية التعاون المستمر والتنسيق بين المدرسة وولي أمر الطالب فيما
          يخدم مصلحته ويحقق له النجاح بإذن الله.
        </p>

        <p className="appointment-line">
          <AppointmentSentence data={data} />
        </p>

        <p className="reasons-heading">{getReasonsHeading(reasonRows.length)}</p>

        <ul className="reasons-list">
          {reasonRows.map((reason) => {
            const isOther = isOtherReason(reason.label);
            const otherText = display(reason.otherText);

            return (
              <li key={reason.id} className="reason-row">
                <CircleMark selected={reason.selected} />
                <strong className="reason-text">
                  {isOther
                    ? `أخرى${otherText ? `: ${otherText}` : ""}`
                    : reason.label}
                </strong>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="signature-footer">
        <SignatureBlock
          title={display(data.counselorJobTitle) || "الموجه/ـة الطلابي/ـة"}
          name={data.counselorName}
          signatureUrl={data.counselorSignatureUrl}
        />
        <SignatureBlock
          title={display(data.principalJobTitle) || "مدير/ة المدرسة"}
          name={data.principalName}
          signatureUrl={data.principalSignatureUrl}
        />
      </footer>
    </section>
  );
}
