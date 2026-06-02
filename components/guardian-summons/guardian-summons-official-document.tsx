"use client";

import Image from "next/image";

type GuardianSummonsReason = {
  id: string;
  label: string;
  selected?: boolean;
};

type GuardianSummonsOfficialDocumentProps = {
  schoolName?: string;
  educationRegion?: string;
  educationOffice?: string;
  hijriYear?: string;
  studentName?: string;
  guardianName?: string;
  summonsDay?: string;
  summonsDate?: string;
  summonsTime?: string;
  periodLabel?: "صباحًا" | "مساءً";
  reasons?: GuardianSummonsReason[];
  counselorName?: string;
  principalName?: string;
  showLogo?: boolean;
};

const DEFAULT_REASONS: GuardianSummonsReason[] = [
  {
    id: "academic-weakness",
    label: "ضعف التحصيل الدراسي.",
    selected: true,
  },
  {
    id: "low-performance",
    label: "تدني مستوى الأداء الأكاديمي.",
  },
  {
    id: "academic-follow-up",
    label: "متابعة المستوى الدراسي للطالب.",
  },
  {
    id: "absence",
    label: "غيابه المتكرر لأكثر من خمسة أيام بدون عذر.",
    selected: true,
  },
  {
    id: "late-arrival",
    label: "تأخره الصباحي المتكرر لأكثر من خمسة أيام بدون عذر.",
  },
  {
    id: "behavior",
    label: "وجود مشكلة سلوكية.",
  },
  {
    id: "violations",
    label: "تكرار المخالفات السلوكية.",
  },
  {
    id: "homework",
    label: "إهمال الواجبات والمهام الدراسية.",
  },
  {
    id: "tests",
    label: "انخفاض درجات الاختبارات.",
  },
  {
    id: "family-cooperation",
    label: "تعزيز التعاون بين المدرسة والأسرة لمصلحة الطالب.",
  },
];

function DottedLine({
  width = 130,
  children,
}: {
  width?: number;
  children?: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex min-h-[18px] items-end justify-center border-b border-dotted border-black px-2 leading-none"
      style={{ minWidth: width }}
    >
      {children ? <span className="pb-[1px]">{children}</span> : null}
    </span>
  );
}

function EmptyBox({ checked }: { checked?: boolean }) {
  return (
    <span className="inline-flex h-[9px] w-[9px] items-center justify-center rounded-full border border-black align-middle">
      {checked ? <span className="h-[4px] w-[4px] rounded-full bg-black" /> : null}
    </span>
  );
}

export function GuardianSummonsOfficialDocument({
  schoolName = "",
  educationRegion = "",
  educationOffice = "",
  hijriYear = "١٤٤٦",
  studentName = "",
  guardianName = "",
  summonsDay = "",
  summonsDate = "",
  summonsTime = "",
  periodLabel = "صباحًا",
  reasons = DEFAULT_REASONS,
  counselorName = "",
  principalName = "",
  showLogo = true,
}: GuardianSummonsOfficialDocumentProps) {
  const selectedReasons = reasons.length ? reasons : DEFAULT_REASONS;

  return (
    <section dir="rtl" className="mx-auto w-full max-w-[210mm] bg-white text-black">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .guardian-summons-page {
            box-shadow: none !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="guardian-summons-page relative mx-auto min-h-[297mm] w-[210mm] overflow-hidden bg-white px-[18mm] py-[12mm] text-[15px] leading-[2.1] shadow-sm">
        <header className="relative min-h-[102px]">
          <div className="absolute right-0 top-0 w-[62mm] text-right text-[13px] leading-[1.7]">
            <div>المملكة العربية السعودية</div>
            <div>وزارة التعليم</div>
            <div>
              الإدارة العامة للتعليم بمنطقة <DottedLine width={72}>{educationRegion}</DottedLine>
            </div>
            <div>
              مكتب التعليم بمحافظة <DottedLine width={72}>{educationOffice}</DottedLine>
            </div>
          </div>

          <div className="absolute left-0 top-0 w-[55mm] text-right text-[13px] leading-[1.9]">
            <div>
              مدرسة <DottedLine width={78}>{schoolName}</DottedLine>
            </div>
            <div className="mt-2 flex justify-start gap-3" dir="ltr">
              <span>{hijriYear}</span>
              <span>هـ</span>
              <span>١٤</span>
            </div>
            <div>الإرشاد الطلابي</div>
          </div>

          <div className="flex flex-col items-center pt-1 text-center">
            <div className="text-[14px]">بسم الله الرحمن الرحيم</div>

            <div className="mt-3 h-[58px] w-[150px]">
              {showLogo ? (
                <div className="relative h-full w-full">
                  <Image
                    src="/moe-logo.png"
                    alt="وزارة التعليم"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[13px] text-slate-600">
                  وزارة التعليم
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mt-2">
          <h1 className="text-center text-[25px] font-bold leading-tight">
            استدعاء ولي أمر طالب
          </h1>

          <div className="mt-9 flex items-center justify-between text-[15px]">
            <div>
              المكرم ولي أمر الطالب / <DottedLine width={190}>{guardianName}</DottedLine>
            </div>
            <div>
              بالصف <DottedLine width={80}>{studentName}</DottedLine>
            </div>
            <div>
              سلّمه الله
            </div>
          </div>

          <p className="mt-8 text-center text-[15px]">
            السلام عليكم ورحمة الله وبركاته ،،،
          </p>

          <p className="mt-4 text-[15px] leading-[2.2]">
            نظرًا لأهمية التعاون المستمر والتنسيق بين المدرسة وولي أمر الطالب فيما يخدم
            مصلحته ويحقق له النجاح بإذن الله.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[15px]">
            <span>لذا نأمل منكم الحضور يوم</span>
            <DottedLine width={100}>{summonsDay}</DottedLine>
            <span>الموافق</span>
            <DottedLine width={120}>{summonsDate}</DottedLine>
            <span>/</span>
            <span>{hijriYear} هـ</span>
            <span>الساعة</span>
            <DottedLine width={80}>{summonsTime}</DottedLine>
            <span>{periodLabel}</span>
          </div>

          <div className="mt-9 text-center font-semibold">
            لمناقشة وبحث مشكلة ابنكم وهي :
          </div>

          <div className="mx-auto mt-5 w-[128mm] space-y-4 text-[15px] leading-[2]">
            {selectedReasons.map((reason) => (
              <div key={reason.id} className="flex items-start gap-3">
                <span className="mt-[10px]">
                  <EmptyBox checked={reason.selected} />
                </span>
                <span>{reason.label}</span>
              </div>
            ))}
          </div>
        </main>

        <footer className="absolute bottom-[18mm] left-[18mm] right-[18mm] grid grid-cols-2 gap-12 text-center text-[14px] leading-[2]">
          <div>
            <div className="font-semibold">الموجه/ـة الطلابي/ـة</div>
            <div className="mt-3">
              <DottedLine width={150}>{counselorName}</DottedLine>
            </div>
          </div>

          <div>
            <div className="font-semibold">مدير/ة المدرسة</div>
            <div className="mt-3">
              <DottedLine width={150}>{principalName}</DottedLine>
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}