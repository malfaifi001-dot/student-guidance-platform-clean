import type { RuntimePreviewCaseData } from "@/lib/report-engine/report-template-runtime-types";

type GuardianSummonsOfficialPdfPageProps = {
  previewCaseData: RuntimePreviewCaseData;
};

export function GuardianSummonsOfficialPdfPage({
  previewCaseData,
}: GuardianSummonsOfficialPdfPageProps) {
  const studentName = getValue(previewCaseData, ["studentName"]) || "........................";
  const studentClass = getValue(previewCaseData, ["studentClass"]) || "........................";
  const summonDay = getValue(previewCaseData, ["summonDay", "summonsDay"]) || "........................";
  const summonDate = getValue(previewCaseData, ["summonDate", "summonsHijriDate"]) || "........................";
  const summonTime = getValue(previewCaseData, ["summonTime", "summonsTime"]) || "09:00";
  const summonPeriod = getValue(previewCaseData, ["summonPeriod", "summonsPeriod"]) || "صباحًا";
  const summonReason =
    getValue(previewCaseData, ["summonReason", "summonsReason"]) ||
    "غيابه المتكرر لأكثر من خمسة أيام بدون عذر.";

  const reasons = summonReason
    .split("،")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="pdf-report-page bg-white">
      <div
        dir="rtl"
        className="mx-auto min-h-[297mm] w-[210mm] bg-white px-[20mm] py-[14mm] text-slate-950"
        style={{
          fontFamily: "Arial, Tahoma, sans-serif",
        }}
      >
        <div className="text-center text-[15px] font-black">
          بسم الله الرحمن الرحيم
        </div>

        <header className="mt-6 grid grid-cols-3 items-start gap-6">
          <div className="text-right text-[13px] font-bold leading-8">
            <div>المملكة العربية السعودية</div>
            <div>وزارة التعليم</div>
            <div>الإدارة العامة للتعليم بمنطقة ................</div>
            <div>مكتب التعليم بمحافظة ................</div>
          </div>

          <div className="flex flex-col items-center justify-start text-center">
            <div className="relative h-[34px] w-[86px]">
              <div className="absolute left-[10px] top-[8px] h-2 w-2 rounded-full bg-sky-500" />
              <div className="absolute left-[24px] top-[3px] h-2 w-2 rounded-full bg-emerald-500" />
              <div className="absolute left-[38px] top-[9px] h-2 w-2 rounded-full bg-sky-500" />
              <div className="absolute left-[52px] top-[4px] h-2 w-2 rounded-full bg-emerald-500" />
              <div className="absolute left-[66px] top-[10px] h-2 w-2 rounded-full bg-sky-500" />
              <div className="absolute left-[18px] top-[20px] h-2 w-2 rounded-full bg-emerald-500" />
              <div className="absolute left-[34px] top-[22px] h-2 w-2 rounded-full bg-sky-500" />
              <div className="absolute left-[50px] top-[20px] h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-1 text-[12px] font-black text-emerald-700">
              وزارة التعليم
            </div>
            <div className="text-[11px] font-bold text-slate-500">
              Ministry of Education
            </div>
          </div>

          <div className="text-left text-[13px] font-bold leading-8">
            <div>مدرسة ........................</div>
            <div>١٤٤٠ هـ / ١٤٣٩ هـ</div>
            <div>الإرشاد الطلابي</div>
          </div>
        </header>

        <h1 className="mt-12 text-center text-[31px] font-black tracking-tight">
          استدعاء ولي أمر طالب
        </h1>

        <section className="mt-9 text-[17px] font-bold leading-10">
          <div className="flex items-end justify-center gap-3">
            <span>المكرم ولي أمر الطالب /</span>
            <span className="inline-block min-w-[92mm] border-b border-dotted border-slate-900 px-4 text-center font-black">
              {studentName}
            </span>
            <span>بالصف</span>
          </div>

          <div className="mt-1 flex items-end justify-center gap-3">
            <span className="inline-block min-w-[58mm] border-b border-dotted border-slate-900 px-4 text-center font-black">
              {studentClass}
            </span>
            <span>سلمه الله</span>
          </div>
        </section>

        <section className="mt-10 text-center text-[17px] font-bold leading-10">
          السلام عليكم ورحمة الله وبركاته ،،،
        </section>

        <section className="mx-auto mt-7 max-w-[160mm] text-right text-[17px] font-semibold leading-[2.35]">
          نظرًا لأهمية التعاون المستمر والتنسيق بين المدرسة وولي أمر الطالب فيما
          يخدم مصلحته ويحقق له النجاح بإذن الله.
        </section>

        <section className="mt-9 text-[17px] font-bold leading-10">
          <div className="flex items-end justify-center gap-3">
            <span>لذا نأمل منكم الحضور يوم</span>
            <span className="inline-block min-w-[34mm] border-b border-dotted border-slate-900 px-3 text-center font-black">
              {summonDay}
            </span>
            <span>الموافق</span>
            <span className="inline-block min-w-[48mm] border-b border-dotted border-slate-900 px-3 text-center font-black">
              {summonDate}
            </span>
            <span>الساعة</span>
          </div>

          <div className="mt-1 flex items-end justify-center gap-4">
            <span className="inline-block min-w-[35mm] border-b border-dotted border-slate-900 px-3 text-center font-black">
              {summonTime}
            </span>
            <span className="inline-block min-w-[35mm] border-b border-dotted border-slate-900 px-3 text-center font-black">
              {summonPeriod}
            </span>
          </div>
        </section>

        <section className="mt-10 text-center text-[18px] font-black">
          لمناقشة وبحث مشكلة ابنكم وهي :
        </section>

        <section className="mx-auto mt-6 w-[135mm] space-y-3 text-[16px] font-semibold leading-8">
          {reasons.length ? (
            reasons.map((reason) => (
              <div key={reason} className="flex items-start justify-start gap-3">
                <span className="mt-3 h-2 w-2 rounded-full border border-slate-900" />
                <span>{reason}</span>
              </div>
            ))
          ) : (
            <div className="flex items-start justify-start gap-3">
              <span className="mt-3 h-2 w-2 rounded-full border border-slate-900" />
              <span>{summonReason}</span>
            </div>
          )}
        </section>

        <footer className="mt-16 grid grid-cols-2 gap-16 text-center text-[15px] font-black">
          <div>
            <div>الموجه/الموجهة الطلابية</div>
            <div className="mx-auto mt-8 w-[48mm] border-b border-dotted border-slate-900" />
          </div>

          <div>
            <div>قائد/قائدة المدرسة</div>
            <div className="mx-auto mt-8 w-[48mm] border-b border-dotted border-slate-900" />
          </div>
        </footer>
      </div>
    </div>
  );
}

function getValue(data: RuntimePreviewCaseData, keys: string[]) {
  for (const key of keys) {
    const item = data.values.find((value) => value.fieldKey === key);

    if (item?.value) {
      return String(item.value);
    }
  }

  return "";
}
