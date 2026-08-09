"use client";

import { useState } from "react";
import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";

type GuardianSummonsLetterPreviewProps = {
  template?: unknown;
  previewCaseData?: RuntimePreviewCaseData | null;
  snippets?: unknown;
  pdfMode?: boolean;
  forceOfficialHeader?: boolean;
  showDynamicFields?: boolean;
};

type PreviewValue = {
  fieldKey?: string;
  fieldLabel?: string;
  value?: unknown;
};

type TemplateInfo = {
  name: string;
  description: string;
  sourceLabel: string;
};

type RolePreviewMode = "identity" | "male" | "female";

type DynamicFieldInfo = {
  key: string;
  label: string;
  description: string;
};

const MOE_LOGO_SRC = "/uploads/school-logos/MOE.png";

export const guardianSummonsDynamicFields: DynamicFieldInfo[] = [
  { key: "schoolName", label: "اسم المدرسة", description: "من هوية المدرسة." },
  { key: "educationDepartment", label: "الإدارة العامة", description: "من هوية المدرسة، وتُنسّق تلقائيًا لو كانت المنطقة فقط." },
  { key: "educationOffice", label: "مكتب التعليم", description: "من هوية المدرسة، ويُنسّق تلقائيًا لو كان اسم المكتب فقط." },
  { key: "academicYear", label: "العام الدراسي", description: "من هوية المدرسة." },
  { key: "counselorName", label: "اسم الموجه/الموجهة", description: "من هوية المستخدم أو هوية المدرسة." },
  { key: "counselorGender", label: "جنس الموجه", description: "يحدد: الموجه الطلابي أو الموجهة الطلابية." },
  { key: "schoolLeaderName", label: "اسم القائد/القائدة", description: "من هوية المدرسة." },
  { key: "schoolLeaderGender", label: "جنس القائد", description: "يحدد: قائد المدرسة أو قائدة المدرسة." },
  { key: "studentName", label: "اسم الطالب", description: "من الطالب المختار." },
  { key: "studentClass", label: "الصف / الفصل", description: "من بيانات الطالب." },
  { key: "guardianName", label: "اسم ولي الأمر", description: "من بيانات ولي الأمر." },
  { key: "summonDay", label: "يوم الحضور", description: "من Workflow الإشعار." },
  { key: "summonDate", label: "تاريخ الحضور", description: "من Workflow الإشعار." },
  { key: "summonTime", label: "وقت الحضور", description: "من Workflow الإشعار." },
  { key: "summonPeriod", label: "الفترة", description: "صباحًا أو مساءً." },
  { key: "summonReason", label: "سبب الإشعار", description: "سبب أو أسباب الإشعار." },
  { key: "notes", label: "ملاحظات", description: "ملاحظات اختيارية." },
];

export const guardianSummonsTemplatePreset = {
  id: "tpl-guardian-summons-letter",
  name: "خطاب إشعار ولي الأمر",
  title: "إشعار ولي الأمر طالب",
  description:
    "تصميم رسمي ثابت لخطاب إشعار ولي الأمر، مع ربط ديناميكي بهوية المدرسة وبيانات الطالب.",
  scope: "SUB_WORKFLOW",
  status: "PUBLISHED",
  updatedAt: "2026-06-02",
  documentType: "letter",
  designPreset: "guardian-summons-letter-v1",
  previewCaseId: "guardian-summons-preview",
  pages: [
    {
      id: "guardian-summons-page",
      kind: "letter",
      title: "خطاب إشعار ولي الأمر",
      description:
        "التصميم ثابت، والبيانات تسحب من هوية المدرسة والطالب وWorkflow الإشعار.",
      blocks: [
        {
          id: "guardian-hardcoded-letter",
          kind: "custom-paragraph",
          title: "خطاب إشعار ولي الأمر",
          description: "التصميم الرسمي الثابت لخطاب إشعار ولي الأمر.",
          required: true,
          source: {
            source: "caseValues",
            label: "بيانات الإشعار",
            description: "بيانات الطالب وولي الأمر وموعد الحضور والسبب.",
            fieldKey: "studentName",
          },
        },
      ],
    },
  ],
} as any;

export const guardianSummonsPreviewCaseData: RuntimePreviewCaseData = {
  found: true,
  caseId: "guardian-summons-preview",
  serviceSlug: "family-school-communication",
  serviceName: "التواصل بين الأسرة والمدرسة وزيارات أولياء الأمور",
  title: "إشعار ولي الأمر طالب",
  status: "ISSUED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  student: {
    id: "preview-student",
    name: "اسم الطالب",
    nationalId: "0000000000",
    grade: "الثاني الابتدائي",
    classroom: "أ",
    stage: "الابتدائية",
    guardianName: "ولي أمر الطالب",
    guardianPhone: "05xxxxxxxx",
  },
  values: [
    { fieldKey: "schoolName", fieldLabel: "اسم المدرسة", value: "مدرسة اليرموك" },
    { fieldKey: "educationDepartment", fieldLabel: "الإدارة العامة", value: "عسير" },
    { fieldKey: "educationOffice", fieldLabel: "مكتب التعليم", value: "عسير" },
    { fieldKey: "academicYear", fieldLabel: "العام الدراسي", value: "1447" },
    { fieldKey: "counselorName", fieldLabel: "اسم الموجه", value: "سلمان المسدي" },
    { fieldKey: "counselorGender", fieldLabel: "جنس الموجه", value: "MALE" },
    { fieldKey: "schoolLeaderName", fieldLabel: "اسم القائد", value: "علي القحطاني" },
    { fieldKey: "schoolLeaderGender", fieldLabel: "جنس القائد", value: "MALE" },

    { fieldKey: "studentName", fieldLabel: "اسم الطالب", value: "اسم الطالب" },
    { fieldKey: "studentClass", fieldLabel: "الصف / الفصل", value: "الثاني الابتدائي / أ" },
    { fieldKey: "guardianName", fieldLabel: "ولي الأمر", value: "ولي أمر الطالب" },
    { fieldKey: "summonDay", fieldLabel: "يوم الحضور", value: "الأحد" },
    { fieldKey: "summonDate", fieldLabel: "تاريخ الحضور", value: "1440 هـ" },
    { fieldKey: "summonTime", fieldLabel: "وقت الحضور", value: "09:00" },
    { fieldKey: "summonPeriod", fieldLabel: "الفترة", value: "صباحًا" },
    {
      fieldKey: "summonReason",
      fieldLabel: "سبب الإشعار",
      value:
        "غيابه المتكرر لأكثر من خمسة أيام بدون عذر، تأخره المتكرر لأكثر من خمسة أيام بدون عذر",
    },
    { fieldKey: "notes", fieldLabel: "ملاحظات", value: "" },
  ],
  evidences: [],
};

export function GuardianSummonsLetterPreview({
  template,
  previewCaseData,
  pdfMode = false,
  showDynamicFields = false,
}: GuardianSummonsLetterPreviewProps) {
  const [rolePreviewMode, setRolePreviewMode] =
    useState<RolePreviewMode>("identity");

  const data = previewCaseData || guardianSummonsPreviewCaseData;
  const templateInfo = normalizeTemplateInfo(template);

  const values = applyRolePreviewMode(
    buildLetterValues(data),
    pdfMode ? "identity" : rolePreviewMode
  );

  return (
    <div
      dir="rtl"
      className={
        pdfMode
          ? "bg-white"
          : "rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
      }
    >
      {!pdfMode ? (
        <section className="mb-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-emerald-700">
                {templateInfo.sourceLabel}
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                {templateInfo.name}
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                {templateInfo.description}
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              هوية المدرسة + تصميم ثابت
            </span>
          </div>

          <RolePreviewSelector
            value={rolePreviewMode}
            onChange={setRolePreviewMode}
            values={values}
          />

          <IdentityPreviewPanel values={values} />

          {showDynamicFields ? <DynamicFieldsPanel /> : null}
        </section>
      ) : null}

      <article
        className={[
          "pdf-report-page mx-auto bg-white text-black",
          pdfMode
            ? "min-h-[297mm] w-[210mm] px-[18mm] py-[10mm]"
            : "min-h-[297mm] w-full max-w-[210mm] rounded-[1.5rem] border border-slate-100 px-[18mm] py-[10mm]",
        ].join(" ")}
        style={{
          fontFamily: 'Arial, Tahoma, "Segoe UI", sans-serif',
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.65,
        }}
      >
        <OfficialHeader values={values} />

        <h1 className="mt-7 text-center text-[27px] font-black tracking-tight">
          إشعار ولي الأمر طالب
        </h1>

        <StudentGuardianLine values={values} />

        <section className="mt-7 text-center text-[14px] font-bold leading-8">
          السلام عليكم ورحمة الله وبركاته ،،،
        </section>

        <section className="mx-auto mt-5 max-w-[172mm] text-center text-[14px] font-semibold leading-[2.05]">
          نظرًا لأهمية التعاون المستمر والتنسيق بين المدرسة وولي أمر الطالب فيما
          يخدم مصلحته ويحقق له النجاح بإذن الله.
        </section>

        <AppointmentLine values={values} />

        <section className="mt-8 text-center text-[17px] font-black">
          لمناقشة وبحث مشكلة ابنكم وهي:
        </section>

        <ReasonsBlock reason={values.summonReason} />

        {values.notes ? (
          <section className="mx-auto mt-6 w-[150mm] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-bold leading-7 text-slate-700">
            <span className="font-black text-slate-900">ملاحظات: </span>
            {values.notes}
          </section>
        ) : null}

        <SignatureBlock values={values} />
      </article>
    </div>
  );
}

function OfficialHeader({ values }: { values: LetterValues }) {
  return (
    <>
      <div className="text-center text-[12.5px] font-black">
        بسم الله الرحمن الرحيم
      </div>

      <table className="mt-3 w-full table-fixed border-collapse">
        <tbody>
          <tr>
            <td className="w-1/3 align-top">
              <div className="text-right text-[11.5px] font-bold leading-7">
                <div>المملكة العربية السعودية</div>
                <div>{values.ministryName}</div>
                <div>{values.educationDepartment}</div>
                <div>{values.educationOffice}</div>
              </div>
            </td>

            <td className="w-1/3 align-top">
              <div className="flex flex-col items-center justify-start text-center">
                <img
                  src={values.ministryLogoUrl || MOE_LOGO_SRC}
                  alt="وزارة التعليم"
                  className="h-[28mm] w-auto object-contain"
                />
              </div>
            </td>

            <td className="w-1/3 align-top">
              <div className="text-left text-[11.5px] font-bold leading-7">
                <div aria-hidden="true">&nbsp;</div>
                <div>{values.academicYear}</div>
                <div aria-hidden="true">&nbsp;</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function StudentGuardianLine({ values }: { values: LetterValues }) {
  return (
    <section className="mt-7 text-[14px] font-bold leading-8">
      <table className="w-full table-fixed border-collapse">
        <tbody>
          <tr>
            <td className="w-[39mm] whitespace-nowrap text-right">
              المكرم ولي أمر الطالب /
            </td>

            <td className="border-b border-dotted border-black px-2 text-center text-[15px] font-black">
              {values.guardianName}
            </td>

            <td className="w-[12mm] whitespace-nowrap text-center">بالصف</td>

            <td className="w-[45mm] border-b border-dotted border-black px-2 text-center text-[15px] font-black">
              {values.studentClass}
            </td>

            <td className="w-[22mm] whitespace-nowrap text-left" aria-hidden="true">
              &nbsp;
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function AppointmentLine({ values }: { values: LetterValues }) {
  return (
    <section className="mt-8 text-[13px] font-bold leading-8">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "40mm" }} />
          <col style={{ width: "9mm" }} />
          <col style={{ width: "27mm" }} />
          <col style={{ width: "17mm" }} />
          <col style={{ width: "33mm" }} />
          <col style={{ width: "14mm" }} />
          <col style={{ width: "19mm" }} />
          <col style={{ width: "22mm" }} />
        </colgroup>

        <tbody>
          <tr>
            <td className="whitespace-nowrap text-right">
              لذا نأمل منكم الحضور
            </td>

            <td className="whitespace-nowrap text-center">يوم</td>

            <td className="border-b border-dotted border-black px-2 text-center text-[15px] font-black">
              {values.summonDay}
            </td>

            <td className="whitespace-nowrap text-center">الموافق</td>

            <td className="border-b border-dotted border-black px-2 text-center text-[15px] font-black">
              {values.summonDate}
            </td>

            <td className="whitespace-nowrap text-center">الساعة</td>

            <td className="border-b border-dotted border-black px-2 text-center text-[15px] font-black">
              {values.summonTime}
            </td>

            <td className="border-b border-dotted border-black px-2 text-center text-[15px] font-black">
              {values.summonPeriod}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function ReasonsBlock({ reason }: { reason: string }) {
  return (
    <section className="mx-auto mt-5 w-[142mm] space-y-3 text-[14px] font-semibold leading-8">
      {splitReasons(reason).map((item) => (
        <div key={item} className="flex items-start justify-start gap-3">
          <span className="mt-3 h-2 w-2 shrink-0 rounded-full border border-black" />
          <span>{item}</span>
        </div>
      ))}
    </section>
  );
}

function SignatureBlock({ values }: { values: LetterValues }) {
  return (
    <section className="mt-14">
      <table className="w-full table-fixed border-collapse text-center text-[14px] font-black">
        <tbody>
          <tr>
            <td className="w-1/2">
              <div>{values.schoolLeaderTitleDisplay}</div>

              {values.principalName ? (
                <div className="mt-3 text-[12.5px] font-bold">
                  {values.principalName}
                </div>
              ) : null}

              <div className="mx-auto mt-7 w-[48mm] border-b border-dotted border-black" />
            </td>

            <td className="w-1/2">
              <div>{values.counselorTitleDisplay}</div>

              {values.counselorName ? (
                <div className="mt-3 text-[12.5px] font-bold">
                  {values.counselorName}
                </div>
              ) : null}

              <div className="mx-auto mt-7 w-[48mm] border-b border-dotted border-black" />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function RolePreviewSelector({
  value,
  onChange,
  values,
}: {
  value: RolePreviewMode;
  onChange: (value: RolePreviewMode) => void;
  values: LetterValues;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            خيار المعاينة للألقاب
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            في PDF الفعلي يتم الاعتماد على هوية المدرسة. هذا الخيار فقط لتجربة
            شكل الموجه/الموجهة وقائد/قائدة في المعاينة.
          </p>
        </div>

        <select
          value={value}
          onChange={(event) => onChange(event.target.value as RolePreviewMode)}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none"
        >
          <option value="identity">حسب هوية المدرسة</option>
          <option value="male">موجه + قائد</option>
          <option value="female">موجهة + قائدة</option>
        </select>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-600">
          يظهر في الخطاب:{" "}
          <span className="font-black text-slate-900">
            {values.counselorTitleDisplay}
          </span>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-600">
          يظهر في الخطاب:{" "}
          <span className="font-black text-slate-900">
            {values.schoolLeaderTitleDisplay}
          </span>
        </div>
      </div>
    </section>
  );
}

function IdentityPreviewPanel({ values }: { values: LetterValues }) {
  const items = [
    ["المدرسة", values.schoolName],
    ["الإدارة", values.educationDepartment],
    ["المكتب", values.educationOffice],
    ["العام", values.academicYear],
    ["الموجه/الموجهة", values.counselorName || "غير محدد"],
    ["القائد/القائدة", values.principalName || "غير محدد"],
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, item]) => (
        <div
          key={label}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
        >
          <div className="text-[11px] font-black text-slate-400">{label}</div>
          <div className="mt-1 text-sm font-black text-slate-800">{item}</div>
        </div>
      ))}
    </section>
  );
}

function DynamicFieldsPanel() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            المتغيرات الديناميكية في الخطاب
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            التصميم ثابت، وهذه المفاتيح تتغير حسب هوية المدرسة والطالب والإشعار.
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
          {guardianSummonsDynamicFields.length} متغير
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {guardianSummonsDynamicFields.map((field) => (
          <div
            key={field.key}
            className="rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="text-xs font-black text-emerald-700">
              {field.label}
            </div>

            <code className="mt-1 block rounded-lg bg-slate-100 px-2 py-1 text-left text-[11px] font-bold text-slate-700">
              {field.key}
            </code>

            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              {field.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

type LetterValues = ReturnType<typeof buildLetterValues>;

function buildLetterValues(data: RuntimePreviewCaseData) {
  const studentClass =
    cleanValue(getValue(data, ["studentClass", "student_class"])) ||
    [data.student?.grade, data.student?.classroom].filter(Boolean).join(" / ") ||
    "........................";

  const counselorTitleRaw = cleanValue(
    getValue(data, ["counselorTitle", "guideTitle", "advisorTitle"])
  );

  const schoolLeaderTitleRaw = cleanValue(
    getValue(data, [
      "schoolLeaderTitle",
      "principalTitle",
      "leaderTitle",
      "schoolPrincipalTitle",
    ])
  );

  const counselorGender = cleanValue(
    getValue(data, [
      "counselorGender",
      "guideGender",
      "advisorGender",
      "studentGuideGender",
      "mentorGender",
      "userGender",
      "gender",
    ])
  );

  const schoolLeaderGender = cleanValue(
    getValue(data, [
      "schoolLeaderGender",
      "principalGender",
      "leaderGender",
      "schoolPrincipalGender",
    ])
  );

  const principalName = cleanValue(
    getValue(data, [
      "schoolLeaderName",
      "principalName",
      "schoolLeader",
      "schoolPrincipalName",
      "leaderName",
    ])
  );

  const counselorName = cleanValue(
    getValue(data, [
      "counselorName",
      "guideName",
      "advisorName",
      "studentGuideName",
      "mentorName",
    ])
  );

  return {
    ministryName:
      cleanValue(getValue(data, ["ministryName", "ministry_name"])) ||
      "وزارة التعليم",

    ministryLogoUrl:
      cleanValue(getValue(data, ["ministryLogoUrl", "ministry_logo_url"])) ||
      MOE_LOGO_SRC,

    schoolLogoUrl:
      cleanValue(getValue(data, ["schoolLogoUrl", "school_logo_url"])) || "",

    schoolName: formatSchoolName(
      cleanValue(getValue(data, ["schoolName", "school_name"]))
    ),

    educationDepartment: formatEducationDepartment(
      cleanValue(
        getValue(data, ["educationDepartment", "education_department"])
      )
    ),

    educationOffice: formatEducationOffice(
      cleanValue(getValue(data, ["educationOffice", "education_office"]))
    ),

    academicYear:
      cleanValue(getValue(data, ["academicYear", "academic_year"])) ||
      "١٤٤٠ هـ / ١٤٣٩ هـ",

    guidanceUnitName:
      cleanValue(
        getValue(data, [
          "guidanceUnitName",
          "guidanceDepartmentName",
          "guidanceOfficeName",
        ])
      ) || "الإرشاد الطلابي",

    studentName:
      cleanValue(getValue(data, ["studentName", "student_name"])) ||
      data.student?.name ||
      "........................",

    studentClass,

    studentNationalId:
      cleanValue(getValue(data, ["studentNationalId", "nationalId"])) ||
      data.student?.nationalId ||
      "",

    guardianName:
      cleanValue(getValue(data, ["guardianName", "guardian_name", "parentName"])) ||
      data.student?.guardianName ||
      "ولي أمر الطالب",

    guardianPhone:
      cleanValue(
        getValue(data, ["guardianPhone", "guardian_phone", "parentPhone"])
      ) ||
      data.student?.guardianPhone ||
      "",

    summonDay:
      cleanValue(
        getValue(data, ["summonDay", "summonsDay", "attendanceDay", "day"])
      ) || "........................",

    summonDate: formatDisplayDate(
      cleanValue(
        getValue(data, [
          "summonDate",
          "summonsDate",
          "summonsHijriDate",
          "attendanceDate",
          "date",
        ])
      ) || "........................"
    ),

    summonTime:
      cleanValue(
        getValue(data, ["summonTime", "summonsTime", "attendanceTime", "time"])
      ) || "09:00",

    summonPeriod: normalizePeriod(
      cleanValue(getValue(data, ["summonPeriod", "summonsPeriod", "period"])) ||
        "صباحًا"
    ),

    summonReason:
      cleanValue(getValue(data, ["summonReason", "summonsReason", "reason"])) ||
      "غيابه المتكرر لأكثر من خمسة أيام بدون عذر.",

    notes: cleanValue(getValue(data, ["notes", "printNotes", "summonNotes"])),

    counselorName,
    counselorGender,
    counselorTitleDisplay: resolveCounselorTitle(
      counselorTitleRaw,
      counselorGender
    ),

    principalName,
    schoolLeaderGender,
    schoolLeaderTitleDisplay: resolveSchoolLeaderTitle(
      schoolLeaderTitleRaw,
      schoolLeaderGender
    ),
  };
}

function applyRolePreviewMode(values: LetterValues, mode: RolePreviewMode) {
  if (mode === "male") {
    return {
      ...values,
      counselorTitleDisplay: "الموجه الطلابي",
      schoolLeaderTitleDisplay: "قائد المدرسة",
    };
  }

  if (mode === "female") {
    return {
      ...values,
      counselorTitleDisplay: "الموجهة الطلابية",
      schoolLeaderTitleDisplay: "قائدة المدرسة",
    };
  }

  return values;
}

function getValue(data: RuntimePreviewCaseData, keys: string[]) {
  const values = Array.isArray(data.values)
    ? (data.values as PreviewValue[])
    : [];

  for (const key of keys) {
    const item = values.find((value) => value.fieldKey === key);

    if (
      item?.value !== undefined &&
      item.value !== null &&
      String(item.value).trim()
    ) {
      return String(item.value).trim();
    }
  }

  return "";
}

function cleanValue(value: unknown) {
  if (value === undefined || value === null) return "";

  const cleaned = String(value).trim();

  if (!cleaned || cleaned === "null" || cleaned === "undefined") return "";

  return cleaned;
}

function formatSchoolName(value: string) {
  if (!value) return "مدرسة ........................";

  if (value.startsWith("مدرسة")) return value;

  return `مدرسة ${value}`;
}

function formatEducationDepartment(value: string) {
  if (!value) return "الإدارة العامة للتعليم بمنطقة ................";

  if (
    value.startsWith("الإدارة") ||
    value.startsWith("تعليم") ||
    value.includes("الإدارة العامة")
  ) {
    return value;
  }

  return `الإدارة العامة للتعليم بمنطقة ${value}`;
}

function formatEducationOffice(value: string) {
  if (!value) return "مكتب التعليم بمحافظة ................";

  if (value.startsWith("مكتب")) return value;

  if (value.startsWith("ب")) return `مكتب التعليم ${value}`;

  return `مكتب التعليم ب${value}`;
}

function formatDisplayDate(value: string) {
  const cleaned = cleanValue(value);

  if (!cleaned) return "........................";

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned.replaceAll("-", "/");
  }

  return cleaned.replace(/\s+/g, " ");
}

function normalizePeriod(value: string) {
  const cleaned = cleanValue(value);

  if (!cleaned) return "صباحًا";

  if (cleaned === "صباحا" || cleaned === "صباح") return "صباحًا";

  if (cleaned === "مساءا" || cleaned === "مساء") return "مساءً";

  return cleaned;
}

function splitReasons(value: string) {
  const reasons = value
    .split(/،|,|\n|;/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return reasons.length ? reasons : [value];
}

function resolveCounselorTitle(title: string, gender: string) {
  const cleanedTitle = cleanValue(title);

  if (
    cleanedTitle &&
    cleanedTitle !== "الموجه/الموجهة الطلابية" &&
    cleanedTitle !== "الموجه / الموجهة الطلابية"
  ) {
    return cleanedTitle;
  }

  const normalizedGender = normalizeGender(`${gender} ${cleanedTitle}`);

  if (normalizedGender === "FEMALE") return "الموجهة الطلابية";

  if (normalizedGender === "MALE") return "الموجه الطلابي";

  return "الموجه/الموجهة الطلابية";
}

function resolveSchoolLeaderTitle(title: string, gender: string) {
  const cleanedTitle = cleanValue(title);

  if (
    cleanedTitle &&
    cleanedTitle !== "قائد/قائدة المدرسة" &&
    cleanedTitle !== "قائد / قائدة المدرسة"
  ) {
    return cleanedTitle;
  }

  const normalizedGender = normalizeGender(`${gender} ${cleanedTitle}`);

  if (normalizedGender === "FEMALE") return "قائدة المدرسة";

  if (normalizedGender === "MALE") return "قائد المدرسة";

  return "قائد/قائدة المدرسة";
}

function normalizeGender(value: string) {
  const cleaned = cleanValue(value).toLowerCase();

  if (
    cleaned.includes("female") ||
    cleaned.includes("woman") ||
    cleaned.includes("أنثى") ||
    cleaned.includes("انثى") ||
    cleaned.includes("female") ||
    cleaned.includes("موجهة") ||
    cleaned.includes("مرشدة") ||
    cleaned.includes("قائدة")
  ) {
    return "FEMALE";
  }

  if (
    cleaned.includes("male") ||
    cleaned.includes("man") ||
    cleaned.includes("ذكر") ||
    cleaned.includes("موجه") ||
    cleaned.includes("مرشد") ||
    cleaned.includes("قائد")
  ) {
    return "MALE";
  }

  return "UNKNOWN";
}

function normalizeTemplateInfo(template: unknown): TemplateInfo {
  if (!template || typeof template !== "object") {
    return {
      name: guardianSummonsTemplatePreset.name,
      description: guardianSummonsTemplatePreset.description,
      sourceLabel: "قالب رسمي",
    };
  }

  const item = template as {
    name?: unknown;
    description?: unknown;
    status?: unknown;
  };

  return {
    name:
      typeof item.name === "string" && item.name.trim()
        ? item.name
        : guardianSummonsTemplatePreset.name,

    description:
      typeof item.description === "string" && item.description.trim()
        ? item.description
        : guardianSummonsTemplatePreset.description,

    sourceLabel: item.status === "PUBLISHED" ? "قالب منشور" : "قالب رسمي",
  };
}
