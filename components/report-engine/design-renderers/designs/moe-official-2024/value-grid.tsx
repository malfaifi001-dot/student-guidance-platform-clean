import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  GraduationCap,
  Hash,
  HeartHandshake,
  Lightbulb,
  ListChecks,
  MapPin,
  Megaphone,
  MessageSquareText,
  NotebookPen,
  School,
  ShieldCheck,
  Star,
  Target,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

export type MoeOfficial2024ValueItem = {
  key?: string;
  label: string;
  value?: string | string[] | null;
};

type FieldVisual = {
  icon: LucideIcon;
  tone: "teal" | "green";
};

function normalizeArabicLabel(value: string) {
  return String(value || "")
    .trim()
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function getMoe24FieldVisual(
  label: string,
  index: number,
): FieldVisual {
  const text = normalizeArabicLabel(label);

  const includesAny = (...words: string[]) =>
    words.some((word) => text.includes(normalizeArabicLabel(word)));

  if (
    includesAny(
      "التقرير",
      "السجل",
      "الوثيقة",
      "المرفق",
      "النموذج",
      "الملف",
    )
  ) {
    return { icon: FileText, tone: "green" };
  }

  if (
    includesAny(
      "المادة",
      "التدريس",
      "التعلم",
      "المنهج",
      "المقرر",
      "المجال",
    )
  ) {
    return { icon: BookOpen, tone: "teal" };
  }

  if (
    includesAny(
      "الطلاب",
      "الطالبات",
      "المستفيد",
      "المستفيدين",
      "الفئة",
      "الحضور",
    )
  ) {
    return { icon: UsersRound, tone: "teal" };
  }

  if (
    includesAny(
      "المعلم",
      "المعلمة",
      "المنفذ",
      "المسؤول",
      "المشرف",
      "المرشد",
      "الموجه",
    )
  ) {
    return { icon: UserRound, tone: "green" };
  }

  if (
    includesAny(
      "التاريخ",
      "اليوم",
      "الفصل",
      "الاسبوع",
      "الأسبوع",
      "موعد",
    )
  ) {
    return { icon: CalendarDays, tone: "green" };
  }

  if (
    includesAny(
      "الوقت",
      "المدة",
      "الساعه",
      "الساعة",
      "ساعات",
    )
  ) {
    return { icon: Clock3, tone: "teal" };
  }

  if (
    includesAny(
      "المكان",
      "الموقع",
      "القاعة",
      "الفصل الدراسي",
    )
  ) {
    return { icon: MapPin, tone: "green" };
  }

  if (
    includesAny(
      "الخطة",
      "التنفيذ",
      "الوصف",
      "الاجراء",
      "الإجراء",
      "الخطوات",
    )
  ) {
    return { icon: ClipboardCheck, tone: "green" };
  }

  if (
    includesAny(
      "المهام",
      "الاعمال",
      "الأعمال",
      "المتطلبات",
      "القائمة",
    )
  ) {
    return { icon: ListChecks, tone: "teal" };
  }

  if (
    includesAny(
      "الهدف",
      "الأهداف",
      "الاهداف",
      "النتيجة",
      "المخرج",
    )
  ) {
    return { icon: Target, tone: "green" };
  }

  if (
    includesAny(
      "النسبة",
      "المؤشر",
      "الاحصاء",
      "الإحصاء",
      "القياس",
      "التقييم",
      "التحليل",
    )
  ) {
    return { icon: BarChart3, tone: "teal" };
  }

  if (
    includesAny(
      "الانجاز",
      "الإنجاز",
      "التميز",
      "التكريم",
    )
  ) {
    return { icon: Trophy, tone: "green" };
  }

  if (
    includesAny(
      "الشهادة",
      "الشهادات",
      "اعتماد",
      "معتمد",
    )
  ) {
    return { icon: Award, tone: "green" };
  }

  if (
    includesAny(
      "المدرسة",
      "المدرسه",
      "المنشأة",
      "المنشاه",
    )
  ) {
    return { icon: School, tone: "teal" };
  }

  if (
    includesAny(
      "المؤهل",
      "المؤهلات",
      "الدورة",
      "الدورات",
      "التخصص",
    )
  ) {
    return { icon: GraduationCap, tone: "green" };
  }

  if (
    includesAny(
      "رقم",
      "العدد",
      "الكود",
      "المعرف",
    )
  ) {
    return { icon: Hash, tone: "teal" };
  }

  if (
    includesAny(
      "المبادرة",
      "الفكرة",
      "الابتكار",
      "الإبداع",
      "الابداع",
    )
  ) {
    return { icon: Lightbulb, tone: "green" };
  }

  if (
    includesAny(
      "التعاون",
      "الشراكة",
      "الشراكه",
      "المشاركة",
      "المشاركه",
    )
  ) {
    return { icon: HeartHandshake, tone: "teal" };
  }

  if (
    includesAny(
      "السلامة",
      "السلامه",
      "الحماية",
      "الحمايه",
      "الأمن",
      "الامن",
    )
  ) {
    return { icon: ShieldCheck, tone: "green" };
  }

  if (
    includesAny(
      "الاعلان",
      "الإعلان",
      "التوعية",
      "التوعيه",
      "النشر",
    )
  ) {
    return { icon: Megaphone, tone: "teal" };
  }

  if (
    includesAny(
      "العمل",
      "المهنة",
      "المهنه",
      "الوظيفة",
      "الوظيفه",
    )
  ) {
    return { icon: BriefcaseBusiness, tone: "green" };
  }

  if (
    includesAny(
      "الملاحظة",
      "الملاحظات",
      "ملاحظات",
      "تعليق",
    )
  ) {
    return { icon: NotebookPen, tone: "teal" };
  }

  if (
    includesAny(
      "التواصل",
      "الرسالة",
      "الرساله",
      "التغذية الراجعة",
    )
  ) {
    return { icon: MessageSquareText, tone: "green" };
  }

  if (
    includesAny(
      "الحالة",
      "الحاله",
      "مكتمل",
      "منجز",
    )
  ) {
    return { icon: CheckCircle2, tone: "green" };
  }

  if (
    includesAny(
      "النشاط",
      "البرنامج",
      "الفعالية",
      "الفعاليه",
    )
  ) {
    return { icon: Activity, tone: "teal" };
  }

  if (
    includesAny(
      "التقدير",
      "التقييم العام",
      "المستوى",
    )
  ) {
    return { icon: Star, tone: "green" };
  }

  if (
    includesAny(
      "الشاهد",
      "الشواهد",
      "اثبات",
      "إثبات",
    )
  ) {
    return { icon: FileCheck2, tone: "teal" };
  }

  return {
    icon: FileText,
    tone: index % 2 === 0 ? "teal" : "green",
  };
}

function normalizeValue(
  value: string | string[] | null | undefined,
): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderFieldValue(
  value: string | string[] | null | undefined,
): ReactNode {
  const items = normalizeValue(value);

  if (!items.length) {
    return "غير متوفر";
  }

  if (items.length === 1) {
    return items[0];
  }

  return (
    <ul className="moe24-report-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

export function MoeOfficial2024ValueGrid({
  items,
}: {
  items: MoeOfficial2024ValueItem[];
}) {
  return (
    <div
      className="moe24-report-details-panel"
      style={{
        padding: "calc(4mm * var(--report-field-spacing-scale, 1))",
        paddingTop: "calc(5mm * var(--report-field-spacing-scale, 1))",
      }}
    >
      <div
        className="moe24-report-detail-grid"
        style={{
          rowGap: "calc(2mm * var(--report-field-spacing-scale, 1))",
          columnGap: "calc(4mm * var(--report-field-spacing-scale, 1))",
        }}
      >
        {items.map((item, index) => {
          const valueItems = normalizeValue(item.value);
          const serializedValue = valueItems.join(" ");

          const isCompactArray =
            valueItems.length > 1 &&
            valueItems.length <= 4 &&
            serializedValue.length <= 190 &&
            valueItems.every((entry) => entry.length <= 85);

          /*
           * لا نستخدم العرض الكامل إلا عند الحاجة الحقيقية.
           *
           * القوائم الصغيرة والمتوسطة تبقى نصف صف.
           * النص المتوسط يسمح له بسطرين أو ثلاثة داخل العمود.
           */
          const wide =
            valueItems.length >= 5 ||
            serializedValue.length > 240 ||
            valueItems.some((entry) => entry.length > 135) ||
            serializedValue.includes("\n\n");

          const visual = getMoe24FieldVisual(
            item.label,
            index,
          );

          const Icon = visual.icon;

          return (
            <article
              key={item.key || item.label || index}
              className={[
                "moe24-report-field",
                `moe24-report-field-${visual.tone}`,
                wide ? "moe24-report-field-wide" : "",
                isCompactArray
                  ? "moe24-report-field-compact-list"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                minHeight: "calc(12mm * var(--report-field-spacing-scale, 1))",
                gap: "calc(2.5mm * var(--report-field-spacing-scale, 1))",
                padding: "calc(1.5mm * var(--report-field-spacing-scale, 1)) calc(2.2mm * var(--report-field-spacing-scale, 1))",
              }}
            >
              <span
                className="moe24-report-field-icon"
                aria-hidden="true"
              >
                <Icon />
              </span>

              <div className="moe24-report-field-content">
                <div className="moe24-report-field-label">
                  <span
                    className="moe24-report-field-dot"
                    aria-hidden="true"
                  />

                  <span
                    style={{
                      fontSize: "calc(7.8px * var(--report-field-label-scale, 1))",
                    }}
                  >
                    {item.label}
                  </span>
                </div>

                <strong
                  style={{
                    marginTop: "calc(1mm * var(--report-field-spacing-scale, 1))",
                    fontSize: `calc(${wide ? 9.8 : 10}px * var(--report-field-value-scale, 1))`,
                    lineHeight: `calc(${wide ? 1.55 : 1.45}em * var(--report-narrative-density-scale, 1))`,
                  }}
                >
                  {renderFieldValue(item.value)}
                </strong>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
