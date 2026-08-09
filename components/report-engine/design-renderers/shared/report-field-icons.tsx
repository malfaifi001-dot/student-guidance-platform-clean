import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  FileText,
  GraduationCap,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  Mail,
  MapPin,
  MessageSquareText,
  NotebookPen,
  Phone,
  Route,
  School,
  Settings2,
  ShieldCheck,
  Star,
  Tag,
  Target,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";

type ReportFieldIconItem = {
  key?: string;
  fieldKey?: string;
  label?: string;
};

type ReportFieldIconRule = {
  icon: LucideIcon;
  keyWords: readonly string[];
  labelWords: readonly string[];
};

function normalizeFieldText(value: unknown) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLocaleLowerCase("ar")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[^a-z0-9\u0621-\u064A]+/g, " ")
    .trim();
}

function getKeywordMatchScore(text: string, words: readonly string[]) {
  return words.reduce((score, word) => {
    const normalizedWord = normalizeFieldText(word);
    return normalizedWord && text.includes(normalizedWord)
      ? Math.max(score, normalizedWord.length)
      : score;
  }, 0);
}

function findBestIcon(
  text: string,
  keywordSelector: (rule: ReportFieldIconRule) => readonly string[],
) {
  let bestIcon: LucideIcon | null = null;
  let bestScore = 0;

  for (const rule of REPORT_FIELD_ICON_RULES) {
    const score = getKeywordMatchScore(text, keywordSelector(rule));
    if (score > bestScore) {
      bestIcon = rule.icon;
      bestScore = score;
    }
  }

  return bestIcon;
}

const REPORT_FIELD_ICON_RULES: readonly ReportFieldIconRule[] = [
  {
    icon: CalendarDays,
    keyWords: ["date", "createdAt", "updatedAt", "birthDate", "academicYear"],
    labelWords: ["تاريخ", "التاريخ", "موعد", "عام دراسي", "السنة", "year", "date"],
  },
  {
    icon: CalendarRange,
    keyWords: ["day", "week", "semester", "term", "period"],
    labelWords: ["يوم", "اسبوع", "أسبوع", "فصل دراسي", "الفترة", "day", "week"],
  },
  {
    icon: Clock3,
    keyWords: ["time", "duration", "hour"],
    labelWords: ["وقت", "الوقت", "ساعة", "ساعات", "مدة", "time", "duration"],
  },
  {
    icon: UserRound,
    keyWords: ["student", "person", "name", "counselor", "teacher", "leader", "guardian"],
    labelWords: ["طالب", "طالبة", "اسم", "شخص", "موجه", "مرشد", "معلم", "قائد", "ولي الامر", "student", "person"],
  },
  {
    icon: UsersRound,
    keyWords: ["students", "users", "group", "team", "attendees", "beneficiaries"],
    labelWords: ["طلاب", "طالبات", "مستفيدين", "حضور", "فريق", "مجموعة", "فئة مستهدفة", "users", "group", "team"],
  },
  {
    icon: School,
    keyWords: ["school", "educationOffice", "educationDepartment"],
    labelWords: ["مدرسة", "المدرسة", "مكتب التعليم", "ادارة التعليم", "الإدارة التعليمية", "school"],
  },
  {
    icon: GraduationCap,
    keyWords: ["education", "grade", "class", "subject", "curriculum"],
    labelWords: ["تعليم", "الصف", "الفصل", "مادة", "منهج", "مقرر", "education", "grade", "class"],
  },
  {
    icon: Route,
    keyWords: ["strategy", "plan", "method", "approach"],
    labelWords: ["استراتيجية", "استراتيجيات", "خطة", "منهجية", "اسلوب", "strategy", "plan"],
  },
  {
    icon: Brain,
    keyWords: ["brain", "thinking", "analysis", "reflection"],
    labelWords: ["تفكير", "تحليل", "تأمل", "استنتاج", "brain", "thinking", "analysis"],
  },
  {
    icon: Target,
    keyWords: ["target", "goal", "objective", "outcome"],
    labelWords: ["هدف", "اهداف", "الأهداف", "غاية", "مخرج", "نتيجة", "target", "goal", "objective"],
  },
  {
    icon: Wrench,
    keyWords: ["tool", "tools", "resource", "equipment"],
    labelWords: ["اداة", "أداة", "ادوات", "أدوات", "وسيلة", "وسائل", "تجهيزات", "tool", "equipment"],
  },
  {
    icon: ClipboardList,
    keyWords: ["clipboard", "procedure", "execution", "steps", "tasks"],
    labelWords: ["تنفيذ", "اجراء", "إجراء", "خطوات", "مهام", "اعمال", "الأعمال", "procedure", "execution", "tasks"],
  },
  {
    icon: CheckCircle2,
    keyWords: ["check", "approval", "approved", "status", "completion"],
    labelWords: ["اعتماد", "موافقة", "حالة", "اكتمال", "منجز", "تحقق", "approval", "status"],
  },
  {
    icon: NotebookPen,
    keyWords: ["note", "notes", "remark", "recommendation"],
    labelWords: ["ملاحظة", "ملاحظات", "توصية", "توصيات", "تعليق", "note", "notes", "recommendation"],
  },
  {
    icon: MessageSquareText,
    keyWords: ["message", "dialogue", "communication", "discussion", "feedback"],
    labelWords: ["رسالة", "حوار", "تواصل", "مناقشة", "تغذية راجعة", "message", "dialogue", "feedback"],
  },
  {
    icon: FileText,
    keyWords: ["document", "file", "report", "record", "attachment", "form"],
    labelWords: ["وثيقة", "ملف", "تقرير", "سجل", "مرفق", "نموذج", "document", "file", "report"],
  },
  {
    icon: Activity,
    keyWords: ["activity", "program", "event", "initiative"],
    labelWords: ["نشاط", "برنامج", "فعالية", "مبادرة", "activity", "program", "event"],
  },
  {
    icon: ShieldCheck,
    keyWords: ["behavior", "conduct", "discipline", "protection"],
    labelWords: ["سلوك", "انضباط", "مواظبة", "حماية", "behavior", "conduct", "discipline"],
  },
  {
    icon: ClipboardCheck,
    keyWords: ["assessment", "evaluation", "measure", "score"],
    labelWords: ["تقييم", "تقويم", "قياس", "درجة", "assessment", "evaluation", "score"],
  },
  {
    icon: Star,
    keyWords: ["star", "award", "achievement", "excellence"],
    labelWords: ["تميز", "انجاز", "إنجاز", "تكريم", "جائزة", "star", "award", "achievement"],
  },
  {
    icon: BarChart3,
    keyWords: ["chart", "statistics", "indicator", "percentage", "result"],
    labelWords: ["مؤشر", "احصاء", "إحصاء", "نسبة", "نتائج", "بيانات", "chart", "statistics", "indicator"],
  },
  {
    icon: BookOpen,
    keyWords: ["book", "lesson", "learning", "knowledge", "content"],
    labelWords: ["كتاب", "درس", "تعلم", "معرفة", "محتوى", "book", "lesson", "learning"],
  },
  {
    icon: MapPin,
    keyWords: ["location", "place", "venue", "address", "room"],
    labelWords: ["مكان", "موقع", "قاعة", "عنوان", "location", "place", "venue"],
  },
  {
    icon: Phone,
    keyWords: ["phone", "mobile", "telephone", "contactNumber"],
    labelWords: ["هاتف", "جوال", "رقم التواصل", "phone", "mobile"],
  },
  {
    icon: Mail,
    keyWords: ["email", "mail"],
    labelWords: ["بريد", "البريد الالكتروني", "البريد الإلكتروني", "email", "mail"],
  },
  {
    icon: AlertTriangle,
    keyWords: ["warning", "risk", "issue", "problem", "alert"],
    labelWords: ["تحذير", "خطر", "مشكلة", "تنبيه", "warning", "risk", "problem"],
  },
  {
    icon: Heart,
    keyWords: ["heart", "care", "support", "wellbeing"],
    labelWords: ["رعاية", "دعم", "رفاه", "اهتمام", "heart", "care", "support"],
  },
  {
    icon: Lightbulb,
    keyWords: ["idea", "suggestion", "innovation", "solution"],
    labelWords: ["فكرة", "اقتراح", "ابتكار", "حل", "idea", "suggestion", "innovation"],
  },
  {
    icon: BriefcaseBusiness,
    keyWords: ["work", "job", "career", "responsibility", "role"],
    labelWords: ["عمل", "وظيفة", "مهني", "مسؤولية", "دور", "work", "job", "role"],
  },
  {
    icon: Settings2,
    keyWords: ["settings", "configuration", "option"],
    labelWords: ["اعدادات", "إعدادات", "تهيئة", "خيار", "settings", "configuration"],
  },
  {
    icon: ListChecks,
    keyWords: ["list", "items", "requirements", "actions"],
    labelWords: ["قائمة", "عناصر", "متطلبات", "اجراءات", "إجراءات", "list", "items", "requirements"],
  },
  {
    icon: FileSignature,
    keyWords: ["signature", "sign", "authorization"],
    labelWords: ["توقيع", "مصادقة", "تفويض", "signature", "authorization"],
  },
  {
    icon: ImageIcon,
    keyWords: ["evidence", "image", "photo", "picture", "media"],
    labelWords: ["شاهد", "دليل", "صورة", "صور", "اثبات", "إثبات", "evidence", "image", "photo"],
  },
  {
    icon: CircleHelp,
    keyWords: ["question", "help", "inquiry"],
    labelWords: ["سؤال", "استفسار", "مساعدة", "question", "help", "inquiry"],
  },
];

export function resolveReportFieldIcon(item: ReportFieldIconItem): LucideIcon {
  const fieldKey = normalizeFieldText(item.fieldKey || item.key);

  if (fieldKey) {
    const keyMatch = findBestIcon(fieldKey, (rule) => rule.keyWords);
    if (keyMatch) return keyMatch;
  }

  const label = normalizeFieldText(item.label);
  if (label) {
    const labelMatch = findBestIcon(label, (rule) => rule.labelWords);
    if (labelMatch) return labelMatch;
  }

  return Tag;
}
