import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";

type AppreciationCertificatePreviewProps = {
  template?: unknown;
  previewCaseData?: RuntimePreviewCaseData | null;
  pdfMode?: boolean;
  showDynamicFields?: boolean;
};

type PreviewValue = {
  fieldKey?: string;
  fieldLabel?: string;
  value?: unknown;
};

type CertificateValues = ReturnType<typeof buildCertificateValues>;

const MOE_LOGO_SRC = "/uploads/school-logos/MOE.png";

export const appreciationCertificateDynamicFields = [
  { key: "schoolName", label: "اسم المدرسة", description: "من هوية المدرسة." },
  { key: "educationDepartment", label: "الإدارة العامة", description: "من هوية المدرسة." },
  { key: "educationOffice", label: "مكتب التعليم", description: "من هوية المدرسة." },
  { key: "academicYear", label: "العام الدراسي", description: "من هوية المدرسة." },
  { key: "ministryLogoUrl", label: "شعار الوزارة", description: "يسحب شعار وزارة التعليم." },
  { key: "studentName", label: "اسم الطالب/الطالبة", description: "من Smart Picker أو الاسم اليدوي." },
  { key: "studentGender", label: "جنس الطالب", description: "لتغيير الطالب/الطالبة." },
  { key: "studentClass", label: "الصف / الفصل", description: "من بيانات الطالب." },
  { key: "stage", label: "المرحلة", description: "ابتدائي، متوسط، ثانوي." },
  { key: "certificateTitle", label: "عنوان الشهادة", description: "مثل: شهادة شكر وتقدير." },
  { key: "appreciationReason", label: "سبب التكريم", description: "سبب منح الشهادة." },
  { key: "achievementCategory", label: "مجال التميز", description: "سلوكي، تحصيلي، انتظام، مبادرة..." },
  { key: "achievementTitle", label: "عنوان الإنجاز", description: "عنوان مختصر للإنجاز." },
  { key: "achievementSummary", label: "ملخص الإنجاز", description: "تفصيل اختياري." },
  { key: "termName", label: "الفصل الدراسي", description: "الفصل الأول/الثاني/الثالث." },
  { key: "weekName", label: "الأسبوع", description: "الأسبوع المرتبط بالمتابعة." },
  { key: "issueDate", label: "تاريخ الإصدار", description: "تاريخ إصدار الشهادة." },
  { key: "certificateNumber", label: "رقم الشهادة", description: "رقم مرجعي اختياري." },
  { key: "score", label: "الدرجة / المؤشر", description: "رقم أو مؤشر أداء." },
  { key: "rank", label: "الترتيب", description: "الأول، الثاني، ضمن العشرة الأوائل..." },
  { key: "attendanceRate", label: "نسبة الحضور", description: "اختياري للمتابعة." },
  { key: "behaviorScore", label: "مؤشر السلوك", description: "اختياري." },
  { key: "followUpResult", label: "نتيجة المتابعة", description: "تحسن، تميز، يحتاج دعم..." },
  { key: "recommendation", label: "توصية الموجه", description: "توصية مختصرة اختيارية." },
  { key: "counselorName", label: "اسم الموجه/الموجهة", description: "من هوية المدرسة أو المستخدم." },
  { key: "counselorGender", label: "جنس الموجه", description: "لصياغة الموجه أو الموجهة." },
  { key: "schoolLeaderName", label: "اسم قائد/قائدة المدرسة", description: "من هوية المدرسة." },
  { key: "schoolLeaderGender", label: "جنس قائد المدرسة", description: "لصياغة قائد أو قائدة." },
];

export const appreciationCertificateTemplatePreset = {
  id: "tpl-appreciation-certificate",
  name: "شهادة شكر وتقدير",
  title: "شهادة شكر وتقدير",
  description:
    "قالب شهادة شكر رسمي لخدمة متابعة الطلاب، يعتمد على هوية المدرسة وبيانات الطالب ونتائج المتابعة والإحصاء.",
  scope: "SUB_WORKFLOW",
  status: "PUBLISHED",
  updatedAt: "2026-06-02",
  documentType: "certificate",
  designPreset: "appreciation-certificate-v1",
  previewCaseId: "appreciation-certificate-preview",
  pages: [
    {
      id: "appreciation-certificate-page",
      kind: "certificate",
      title: "شهادة شكر وتقدير",
      description:
        "النص ثابت، والمتغيرات من هوية المدرسة والطالب والمتابعة والإحصاء.",
      blocks: [
        {
          id: "appreciation-certificate-hardcoded",
          kind: "certificate",
          title: "شهادة شكر وتقدير",
          required: true,
          source: {
            source: "caseValues",
            label: "بيانات الشهادة",
            fieldKey: "studentName",
          },
        },
      ],
    },
  ],
} as any;

export const appreciationCertificatePreviewCaseData: RuntimePreviewCaseData = {
  found: true,
  caseId: "appreciation-certificate-preview",
  serviceSlug: "student-follow-up",
  serviceName: "متابعة الطلاب",
  title: "شهادة شكر وتقدير",
  status: "ISSUED",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  student: {
    id: "preview-student",
    name: "أحمد محمد عبدالله",
    nationalId: "0000000000",
    grade: "الثاني الابتدائي",
    classroom: "أ",
    stage: "الابتدائية",
    guardianName: "",
    guardianPhone: "",
  },
  values: [
    { fieldKey: "schoolName", fieldLabel: "اسم المدرسة", value: "مدرسة اليرموك" },
    { fieldKey: "educationDepartment", fieldLabel: "الإدارة", value: "عسير" },
    { fieldKey: "educationOffice", fieldLabel: "المكتب", value: "عسير" },
    { fieldKey: "academicYear", fieldLabel: "العام", value: "1447" },
    { fieldKey: "ministryLogoUrl", fieldLabel: "الشعار", value: MOE_LOGO_SRC },

    { fieldKey: "studentName", fieldLabel: "الطالب", value: "أحمد محمد عبدالله" },
    { fieldKey: "studentGender", fieldLabel: "الجنس", value: "MALE" },
    { fieldKey: "studentClass", fieldLabel: "الصف", value: "الثاني الابتدائي / أ" },
    { fieldKey: "stage", fieldLabel: "المرحلة", value: "الابتدائية" },

    { fieldKey: "certificateTitle", fieldLabel: "العنوان", value: "شهادة شكر وتقدير" },
    { fieldKey: "appreciationReason", fieldLabel: "سبب التكريم", value: "تميزه في المتابعة الطلابية وتحسن مستوى الانضباط والتحصيل" },
    { fieldKey: "achievementCategory", fieldLabel: "المجال", value: "الانضباط والتحصيل الدراسي" },
    { fieldKey: "achievementTitle", fieldLabel: "الإنجاز", value: "تحسن ملحوظ في مستوى الطالب" },
    { fieldKey: "achievementSummary", fieldLabel: "الملخص", value: "نظير التزامه، وتفاعله الإيجابي، وحرصه على تطوير مستواه." },
    { fieldKey: "termName", fieldLabel: "الفصل", value: "الفصل الدراسي الأول" },
    { fieldKey: "weekName", fieldLabel: "الأسبوع", value: "الأسبوع الخامس" },
    { fieldKey: "issueDate", fieldLabel: "التاريخ", value: "1447/05/10" },
    { fieldKey: "certificateNumber", fieldLabel: "رقم الشهادة", value: "ST-FU-0001" },
    { fieldKey: "score", fieldLabel: "المؤشر", value: "95%" },
    { fieldKey: "rank", fieldLabel: "الترتيب", value: "ضمن الطلاب المتميزين" },
    { fieldKey: "attendanceRate", fieldLabel: "الحضور", value: "98%" },
    { fieldKey: "behaviorScore", fieldLabel: "السلوك", value: "متميز" },
    { fieldKey: "followUpResult", fieldLabel: "النتيجة", value: "تحسن واضح" },
    { fieldKey: "recommendation", fieldLabel: "التوصية", value: "الاستمرار على هذا المستوى والمحافظة على التميز." },

    { fieldKey: "counselorName", fieldLabel: "الموجه", value: "سلمان المسدي" },
    { fieldKey: "counselorGender", fieldLabel: "جنس الموجه", value: "MALE" },
    { fieldKey: "schoolLeaderName", fieldLabel: "القائد", value: "علي القحطاني" },
    { fieldKey: "schoolLeaderGender", fieldLabel: "جنس القائد", value: "MALE" },
  ],
  evidences: [],
};

export function AppreciationCertificatePreview({
  template,
  previewCaseData,
  pdfMode = false,
  showDynamicFields = false,
}: AppreciationCertificatePreviewProps) {
  const data = previewCaseData || appreciationCertificatePreviewCaseData;
  const values = buildCertificateValues(data);
  const templateInfo = normalizeTemplateInfo(template);

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
                النص ثابت، وكل بيانات المدرسة والطالب والمتابعة والإحصاء
                متغيرات ديناميكية.
              </p>
            </div>

            <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-700">
              شهادة رسمية — A4 Landscape
            </span>
          </div>

          {showDynamicFields ? <DynamicFieldsPanel /> : null}
        </section>
      ) : null}

      <div className={pdfMode ? "" : "overflow-x-auto rounded-[1.5rem] bg-slate-50 p-4"}>
        <article
          className={[
            "pdf-certificate-page relative mx-auto overflow-hidden bg-white text-black",
            pdfMode
              ? "h-[210mm] w-[297mm] px-[13mm] py-[10mm]"
              : "h-[210mm] w-[297mm] rounded-[1.5rem] border border-slate-200 px-[13mm] py-[10mm] shadow-sm",
          ].join(" ")}
          style={{
            fontFamily: 'Arial, Tahoma, "Segoe UI", sans-serif',
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div className="absolute inset-[7mm] rounded-[14mm] border-[3px] border-amber-500" />
          <div className="absolute inset-[10mm] rounded-[11mm] border border-emerald-700/70" />
          <div className="absolute right-[-28mm] top-[-28mm] h-[72mm] w-[72mm] rounded-full bg-emerald-100" />
          <div className="absolute bottom-[-30mm] left-[-30mm] h-[80mm] w-[80mm] rounded-full bg-amber-100" />

          <section className="relative z-10 flex items-start justify-between">
            <div className="w-[85mm] text-right text-[11px] font-bold leading-6">
              <div>المملكة العربية السعودية</div>
              <div>{values.ministryName}</div>
              <div>{values.educationDepartment}</div>
              <div>{values.educationOffice}</div>
            </div>

            <div className="flex flex-1 flex-col items-center text-center">
              <img
                src={values.ministryLogoUrl || MOE_LOGO_SRC}
                alt="وزارة التعليم"
                className="h-[22mm] w-auto object-contain"
              />
            </div>

            <div className="w-[85mm] text-left text-[11px] font-bold leading-6">
              <div>{values.schoolName}</div>
              <div>{values.academicYear}</div>
              <div>متابعة الطلاب</div>
              {values.certificateNumber ? <div>رقم: {values.certificateNumber}</div> : null}
            </div>
          </section>

          <section className="relative z-10 mt-5 text-center">
            <div className="mx-auto h-[1px] w-[165mm] bg-gradient-to-l from-transparent via-amber-500 to-transparent" />

            <p className="mt-3 text-[18px] font-black text-emerald-800">
              {values.achievementCategory}
            </p>

            <h1 className="mt-2 text-[42px] font-black tracking-tight text-slate-950">
              {values.certificateTitle}
            </h1>

            <p className="mt-1 text-[15px] font-bold text-slate-500">
              {values.termName} — {values.weekName}
            </p>
          </section>

          <section className="relative z-10 mx-auto mt-5 max-w-[230mm] text-center">
            <p className="text-[19px] font-bold leading-[2.1] text-slate-900">
              تتقدم{" "}
              <span className="font-black text-emerald-800">{values.schoolName}</span>
              {" "}بخالص الشكر والتقدير إلى{" "}
              <span className="font-black">{values.studentLabel}</span>
            </p>

            <div className="mx-auto mt-2 w-[190mm] rounded-[2rem] border border-amber-300 bg-amber-50/70 px-8 py-4">
              <div className="text-[33px] font-black leading-tight text-slate-950">
                {values.studentName}
              </div>

              <div className="mt-2 text-[16px] font-bold text-slate-600">
                {values.studentClass}
                {values.stage ? ` — ${values.stage}` : ""}
              </div>
            </div>

            <p className="mx-auto mt-5 max-w-[215mm] text-[18px] font-bold leading-[2.1] text-slate-900">
              وذلك نظير{" "}
              <span className="font-black text-emerald-800">{values.appreciationReason}</span>
              ، ونسأل الله له دوام التوفيق والتميز.
            </p>

            {values.achievementSummary ? (
              <p className="mx-auto mt-2 max-w-[205mm] text-[14px] font-semibold leading-7 text-slate-600">
                {values.achievementSummary}
              </p>
            ) : null}
          </section>

          <section className="relative z-10 mx-auto mt-5 grid w-[225mm] grid-cols-4 gap-3 text-center">
            <MetricCard label="الإنجاز" value={values.achievementTitle} />
            <MetricCard label="المؤشر" value={values.score} />
            <MetricCard label="الحضور" value={values.attendanceRate} />
            <MetricCard label="النتيجة" value={values.followUpResult} />
          </section>

          {values.recommendation ? (
            <section className="relative z-10 mx-auto mt-4 w-[218mm] rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-center text-[13px] font-bold leading-7 text-slate-700">
              <span className="font-black text-slate-950">توصية الموجه الطلابي: </span>
              {values.recommendation}
            </section>
          ) : null}

          <section className="relative z-10 mt-8 grid grid-cols-3 items-end text-center">
            <SignatureBox
              title={values.counselorTitleDisplay}
              name={values.counselorName}
            />

            <div className="text-[12px] font-bold leading-7 text-slate-600">
              <div>تاريخ الإصدار</div>
              <div dir="ltr" className="text-[17px] font-black text-slate-950">
                {values.issueDate}
              </div>
            </div>

            <SignatureBox
              title={values.schoolLeaderTitleDisplay}
              name={values.schoolLeaderName}
            />
          </section>
        </article>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3">
      <div className="text-[10px] font-black text-emerald-700">{label}</div>
      <div className="mt-1 truncate text-[13px] font-black text-slate-900">
        {value || "—"}
      </div>
    </div>
  );
}

function SignatureBox({ title, name }: { title: string; name: string }) {
  return (
    <div className="text-center">
      <div className="text-[15px] font-black text-slate-950">{title}</div>
      {name ? <div className="mt-2 text-[13px] font-bold">{name}</div> : null}
      <div className="mx-auto mt-5 w-[58mm] border-b border-dotted border-black" />
    </div>
  );
}

function DynamicFieldsPanel() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">
            متغيرات شهادة الشكر
          </h3>

          <p className="mt-1 text-xs leading-6 text-slate-500">
            كل هذه القيم قابلة للحقن من هوية المدرسة، الطالب، وسجل متابعة الطلاب.
          </p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-500">
          {appreciationCertificateDynamicFields.length} متغير
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {appreciationCertificateDynamicFields.map((field) => (
          <div key={field.key} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-xs font-black text-emerald-700">{field.label}</div>
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

function buildCertificateValues(data: RuntimePreviewCaseData) {
  const studentGender = cleanValue(getValue(data, ["studentGender", "gender"])) || "";
  const studentName =
    cleanValue(getValue(data, ["studentName", "recipientName"])) ||
    data.student?.name ||
    "اسم الطالب";

  const studentClass =
    cleanValue(getValue(data, ["studentClass", "student_class"])) ||
    [data.student?.grade, data.student?.classroom].filter(Boolean).join(" / ") ||
    "الصف / الفصل";

  const counselorTitleRaw = cleanValue(getValue(data, ["counselorTitle", "guideTitle", "advisorTitle"]));
  const schoolLeaderTitleRaw = cleanValue(getValue(data, ["schoolLeaderTitle", "principalTitle", "leaderTitle"]));

  const counselorGender = cleanValue(
    getValue(data, ["counselorGender", "guideGender", "advisorGender", "userGender", "gender"])
  );

  const schoolLeaderGender = cleanValue(
    getValue(data, ["schoolLeaderGender", "principalGender", "leaderGender"])
  );

  return {
    ministryName: cleanValue(getValue(data, ["ministryName"])) || "وزارة التعليم",

    ministryLogoUrl:
      cleanValue(getValue(data, ["ministryLogoUrl", "ministry_logo_url"])) ||
      MOE_LOGO_SRC,

    schoolName: formatSchoolName(cleanValue(getValue(data, ["schoolName", "school_name"]))),

    educationDepartment: formatEducationDepartment(
      cleanValue(getValue(data, ["educationDepartment", "education_department"]))
    ),

    educationOffice: formatEducationOffice(
      cleanValue(getValue(data, ["educationOffice", "education_office"]))
    ),

    academicYear:
      cleanValue(getValue(data, ["academicYear", "academic_year"])) ||
      "١٤٤٠ هـ / ١٤٣٩ هـ",

    studentName,
    studentGender,
    studentLabel: normalizeGender(studentGender) === "FEMALE" ? "الطالبة" : "الطالب",
    studentClass,
    stage: cleanValue(getValue(data, ["stage", "studentStage"])) || data.student?.stage || "",

    certificateTitle:
      cleanValue(getValue(data, ["certificateTitle"])) || "شهادة شكر وتقدير",

    appreciationReason:
      cleanValue(getValue(data, ["appreciationReason", "reason"])) ||
      "تميزه في المتابعة الطلابية",

    achievementCategory:
      cleanValue(getValue(data, ["achievementCategory", "category"])) ||
      "التميز الطلابي",

    achievementTitle:
      cleanValue(getValue(data, ["achievementTitle"])) ||
      "تميز ملحوظ",

    achievementSummary:
      cleanValue(getValue(data, ["achievementSummary"])) || "",

    termName:
      cleanValue(getValue(data, ["termName", "semesterName"])) ||
      "الفصل الدراسي",

    weekName:
      cleanValue(getValue(data, ["weekName", "schoolWeek"])) ||
      "الأسبوع",

    issueDate:
      formatDisplayDate(cleanValue(getValue(data, ["issueDate", "date"])) || new Date().toISOString().slice(0, 10)),

    certificateNumber:
      cleanValue(getValue(data, ["certificateNumber", "serialNumber"])) || "",

    score: cleanValue(getValue(data, ["score", "performanceScore"])) || "—",
    rank: cleanValue(getValue(data, ["rank"])) || "",
    attendanceRate: cleanValue(getValue(data, ["attendanceRate"])) || "—",
    behaviorScore: cleanValue(getValue(data, ["behaviorScore"])) || "",
    followUpResult: cleanValue(getValue(data, ["followUpResult", "result"])) || "متميز",
    recommendation: cleanValue(getValue(data, ["recommendation", "notes"])) || "",

    counselorName:
      cleanValue(getValue(data, ["counselorName", "guideName", "advisorName", "studentGuideName"])) || "",

    counselorTitleDisplay: resolveCounselorTitle(counselorTitleRaw, counselorGender),

    schoolLeaderName:
      cleanValue(getValue(data, ["schoolLeaderName", "principalName", "leaderName"])) || "",

    schoolLeaderTitleDisplay: resolveSchoolLeaderTitle(schoolLeaderTitleRaw, schoolLeaderGender),
  };
}

function getValue(data: RuntimePreviewCaseData, keys: string[]) {
  const values = Array.isArray(data.values) ? (data.values as PreviewValue[]) : [];

  for (const key of keys) {
    const item = values.find((value) => value.fieldKey === key);

    if (item?.value !== undefined && item.value !== null && String(item.value).trim()) {
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
  if (value.startsWith("الإدارة") || value.includes("الإدارة العامة")) return value;
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned.replaceAll("-", "/");
  return cleaned || "........................";
}

function normalizeGender(value: string) {
  const cleaned = cleanValue(value).toLowerCase();

  if (
    cleaned.includes("female") ||
    cleaned.includes("أنثى") ||
    cleaned.includes("انثى") ||
    cleaned.includes("طالبة") ||
    cleaned.includes("موجهة") ||
    cleaned.includes("مرشدة") ||
    cleaned.includes("قائدة")
  ) {
    return "FEMALE";
  }

  if (
    cleaned.includes("male") ||
    cleaned.includes("ذكر") ||
    cleaned.includes("طالب") ||
    cleaned.includes("موجه") ||
    cleaned.includes("مرشد") ||
    cleaned.includes("قائد")
  ) {
    return "MALE";
  }

  return "UNKNOWN";
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

function normalizeTemplateInfo(template: unknown) {
  if (!template || typeof template !== "object") {
    return {
      name: appreciationCertificateTemplatePreset.name,
      description: appreciationCertificateTemplatePreset.description,
      sourceLabel: "قالب رسمي",
    };
  }

  const item = template as { name?: unknown; description?: unknown; status?: unknown };

  return {
    name:
      typeof item.name === "string" && item.name.trim()
        ? item.name
        : appreciationCertificateTemplatePreset.name,

    description:
      typeof item.description === "string" && item.description.trim()
        ? item.description
        : appreciationCertificateTemplatePreset.description,

    sourceLabel: item.status === "PUBLISHED" ? "قالب منشور" : "قالب رسمي",
  };
}

