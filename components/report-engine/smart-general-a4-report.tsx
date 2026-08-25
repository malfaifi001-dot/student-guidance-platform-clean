import type {
  SmartReportField,
  SmartReportPayload,
  ReportEvidenceConfig,
} from "@/lib/report-engine/smart-report-types";
import { SignatureImage } from "@/components/signatures/signature-image";

type SmartGeneralA4ReportProps = {
  payload: SmartReportPayload;
};

const ARABIC_LABEL_MAP: Record<string, string> = {
  activity_domain: "مجال النشاط",
  execution_method: "طريقة التنفيذ",
  execution_mode: "طريقة التنفيذ",
  execution_date: "تاريخ التنفيذ",
  semester: "الفصل الدراسي",
  term: "الفصل الدراسي",
  term_1: "الفصل الدراسي الأول",
  term_2: "الفصل الدراسي الثاني",
  week: "الأسبوع",
  start_week: "أسبوع البداية",
  end_week: "أسبوع النهاية",
  start_day: "يوم البداية",
  end_day: "يوم النهاية",
  target_group: "الفئة المستهدفة",
  beneficiary_count: "عدد المستفيدين",
  beneficiaries_count: "عدد المستفيدين",
  students_count: "عدد الطلاب",
  student_count: "عدد الطلاب",
  participant_students_count: "عدد الطلاب المشاركين",
  parents_participated: "مشاركة أولياء الأمور",
  location: "الموقع",
  place: "المكان",
  execution_location: "موقع التنفيذ",
  executor: "المنفذ",
  teacher_name: "اسم المعلم",
  assigned_teacher: "المعلم المسند إليه",
  activity_leader: "قائد النشاط",
  counselor: "المرشد الطلابي",
  principal: "قائد المدرسة",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  sunday: "الأحد",
  saturday: "السبت",
  lecture: "محاضرة",
  workshop: "ورشة عمل",
  field_visit: "زيارة ميدانية",
  competition: "مسابقة",
  awareness_campaign: "حملة توعوية",
  training_course: "دورة تدريبية",
  meeting: "لقاء",
  interview: "مقابلة",
  yes: "نعم",
  no: "لا",
};

function arabicLabel(key: string, label: string): string {
  if (label !== key) return label;
  return ARABIC_LABEL_MAP[key] || label;
}

function isFieldUseful(field: SmartReportField): boolean {
  if (field.value === "" || field.value === null || field.value === undefined)
    return false;
  const label = arabicLabel(field.key, field.label);
  if (label === field.key && !ARABIC_LABEL_MAP[field.key]) return false;
  return true;
}

function renderValue(value: SmartReportField["value"]) {
  if (value === null || value === undefined || value === "") return "غير محدد";
  if (Array.isArray(value)) return value.length ? value.join("، ") : "غير محدد";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return String(value);
}

function renderArabicValue(
  value: SmartReportField["value"],
  fieldKey: string,
): string {
  const base = renderValue(value);
  if (base === "غير محدد") return base;
  const lower = base.toLowerCase();
  const translated = ARABIC_LABEL_MAP[lower] || ARABIC_LABEL_MAP[base];
  if (translated && translated !== base && translated !== lower) return translated;
  return base;
}

function imageContainerStyle(
  imageSize: ReportEvidenceConfig["imageSize"],
  itemsPerPage: number,
) {
  if (imageSize === "large-square" && itemsPerPage === 1)
    return { height: "180mm" };
  if (imageSize === "large-square") return { height: "90mm" };
  if (imageSize === "portrait") return { height: "75mm" };
  if (imageSize === "landscape") return { height: "55mm" };
  return { height: "45mm" };
}

function evidenceGridCols(
  imageSize: ReportEvidenceConfig["imageSize"],
  itemsPerPage: number,
): string {
  if (imageSize === "large-square" && itemsPerPage === 1) return "grid-cols-1";
  return "grid-cols-2";
}

function UsefulFieldGrid({ fields }: { fields: SmartReportField[] }) {
  const visibleFields = fields.filter(isFieldUseful).slice(0, 18);

  if (!visibleFields.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {visibleFields.map((field) => (
        <div
          key={field.key}
          className="rounded-2xl border border-slate-200 bg-white p-4"
        >
          <p className="text-[11px] font-black text-slate-500">
            {arabicLabel(field.key, field.label)}
          </p>
          <p className="mt-1 text-sm font-black leading-7 text-slate-950">
            {renderArabicValue(field.value, field.key)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SmartGeneralA4Report({ payload }: SmartGeneralA4ReportProps) {
  const showCaptions = payload.evidenceConfig?.showCaptions ?? false;
  const imageSize = payload.evidenceConfig?.imageSize ?? "small-squares";
  const itemsPerPage = payload.evidenceConfig?.itemsPerPage ?? 2;
  const detailFieldsWithValues = payload.detailFields.filter(isFieldUseful);

  return (
    <article
      className="mx-auto min-h-[297mm] w-[210mm] overflow-hidden bg-white p-[14mm] text-slate-950 shadow-2xl print:min-h-[297mm] print:w-[210mm] print:shadow-none"
      dir="rtl"
    >
      <header className="rounded-[2rem] bg-slate-950 px-8 py-7 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-black text-slate-300">
              {payload.identity.ministryName || "وزارة التعليم"}
            </p>

            <h1 className="mt-3 text-3xl font-black leading-10">
              {payload.title}
            </h1>

            <p className="mt-2 text-sm font-bold text-slate-300">
              {payload.service.name} - {payload.identity.schoolName}
            </p>
          </div>

          <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-2">
            {payload.identity.schoolLogoUrl ? (
              <img
                src={payload.identity.schoolLogoUrl}
                alt={payload.identity.schoolName}
                className="h-full w-full object-contain brightness-0 invert"
              />
            ) : (
              <span className="text-xs font-black">الشعار</span>
            )}
          </div>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-4 gap-3">
        {payload.primaryFields
          .filter(
            (f) =>
              f.value !== "" && f.value !== null && f.value !== undefined,
          )
          .slice(0, 4)
          .map((field) => (
            <div
              key={field.key}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-[11px] font-black text-slate-500">
                {arabicLabel(field.key, field.label)}
              </p>
              <p className="mt-1 text-sm font-black leading-7 text-slate-950">
                {renderArabicValue(field.value, field.key)}
              </p>
            </div>
          ))}
      </section>

      {payload.narrative.body ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-7 w-2 rounded-full bg-emerald-600" />
            <h2 className="text-xl font-black text-slate-950">
              {payload.narrative.title || "وصف التقرير"}
            </h2>
          </div>

          <p className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-base font-bold leading-9 text-slate-700">
            {payload.narrative.body}
          </p>
        </section>
      ) : null}

      {detailFieldsWithValues.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-7 w-2 rounded-full bg-emerald-600" />
            <h2 className="text-xl font-black text-slate-950">
              بيانات الحالة
            </h2>
          </div>

          <UsefulFieldGrid fields={payload.detailFields} />
        </section>
      ) : null}

      {payload.evidence.items.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-7 w-2 rounded-full bg-emerald-600" />
            <h2 className="text-xl font-black text-slate-950">
              الشواهد والمرفقات
            </h2>
          </div>

          <div
            className={`grid gap-3 ${evidenceGridCols(imageSize, itemsPerPage)}`}
          >
            {payload.evidence.items.map((item, index) => (
              <div
                key={item.id || index}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div
                  className="flex items-center justify-center overflow-hidden rounded-xl bg-white text-xs font-black text-slate-400"
                  style={imageContainerStyle(imageSize, itemsPerPage)}
                >
                  {item.url && item.type === "IMAGE" ? (
                    <img
                      src={item.url}
                      alt={item.title || `شاهد ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center p-4 text-center">
                      {item.title || `شاهد ${index + 1}`}
                    </span>
                  )}
                </div>

                {showCaptions && item.caption ? (
                  <p className="mt-2 text-center text-xs font-bold leading-6 text-slate-500">
                    {item.caption}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {payload.signatures.length > 0 ? (
        <section
          className={[
            "mt-8",
            payload.signatures.length === 1
              ? "flex justify-center"
              : "grid grid-cols-3 gap-3",
          ].join(" ")}
        >
          {payload.signatures.slice(0, 3).map((signature) => (
            <div
              key={signature.key}
              className={[
                "flex min-h-28 flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-center",
                payload.signatures.length === 1 ? "w-[58mm] max-w-full" : "",
              ].join(" ")}
            >
              <p className="text-xs font-black text-slate-500">
                {signature.label}
              </p>

              {signature.imageUrl ? (
                <SignatureImage
                  src={signature.imageUrl}
                  alt={signature.signerName || signature.label}
                  className="h-10"
                />
              ) : (
                <p className="text-slate-400">............................</p>
              )}

              <p className="text-sm font-black text-slate-950">
                {signature.signerName || "غير محدد"}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      <footer className="mt-6 flex items-center justify-between border-t-4 border-slate-950 pt-3 text-xs font-black text-slate-500">
        <span>{payload.identity.schoolName}</span>
        <span>{payload.identity.academicYear}</span>
        <span>Teachix</span>
      </footer>
    </article>
  );
}
