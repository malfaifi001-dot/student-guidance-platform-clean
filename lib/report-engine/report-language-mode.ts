export type ReportLanguageMode = "MALE" | "FEMALE";

type PhraseReplacement = {
  from: string;
  to: string;
};


const FEMALE_EXACT_REPLACEMENTS: PhraseReplacement[] = [
  { from: "عدد الطلاب المشاركين", to: "عدد الطالبات المشاركات" },
  { from: "الطلاب المشاركين", to: "الطالبات المشاركات" },
  { from: "توقيع المعلم المنفذ", to: "توقيع المعلمة المنفذة" },
  { from: "المعلم المنفذ", to: "المعلمة المنفذة" },
  { from: "المعلم المنفذ", to: "المعلمة المنفذة" },
  { from: "المعلم المنفذ", to: "المعلمة المنفذة" },
  { from: "المعلمة المنفذة", to: "المعلمة المنفذة" },
  { from: "الموجه الطلابي", to: "الموجهة الطلابية" },
  { from: "المرشد الطلابي", to: "المرشدة الطلابية" },
  { from: "مدير المدرسة", to: "مديرة المدرسة" },
  { from: "قائد المدرسة", to: "قائدة المدرسة" },
  { from: "رائد النشاط", to: "رائدة النشاط" },
  { from: "المعلم المنفذ", to: "المعلمة المنفذة" },
  { from: "وتولى التنفيذ", to: "وتولت التنفيذ" },
  { from: "تولى التنفيذ", to: "تولت التنفيذ" },
];

const FEMALE_WHOLE_WORD_REPLACEMENTS: PhraseReplacement[] = [
  { from: "الطلاب", to: "الطالبات" },
  { from: "طلاب", to: "طالبات" },
  { from: "الطالب", to: "الطالبة" },
  { from: "طالب", to: "طالبة" },
  { from: "عدد الطلاب", to: "عدد الطالبات" },
  { from: "المستفيدون", to: "المستفيدات" },
  { from: "المستفيدين", to: "المستفيدات" },
  { from: "المشاركون", to: "المشاركات" },
  { from: "المشاركين", to: "المشاركات" },
  { from: "المستهدفون", to: "المستهدفات" },
  { from: "المستهدفين", to: "المستهدفات" },
  { from: "المعلم", to: "المعلمة" },
  { from: "معلم", to: "معلمة" },
  { from: "الرائد", to: "الرائدة" },
  { from: "المنفذ", to: "المنفذة" },
  { from: "منفذ", to: "منفذة" },
];

const MALE_EXACT_REPLACEMENTS: PhraseReplacement[] = [
  { from: "عدد الطالبات المشاركات", to: "عدد الطلاب المشاركين" },
  { from: "الطالبات المشاركات", to: "الطلاب المشاركين" },
  { from: "توقيع المعلمة المنفذة", to: "توقيع المعلم المنفذ" },
  { from: "المعلمة المنفذة", to: "المعلم المنفذ" },
  { from: "الموجهة الطلابية", to: "الموجه الطلابي" },
  { from: "المرشدة الطلابية", to: "المرشد الطلابي" },
  { from: "مديرة المدرسة", to: "مدير المدرسة" },
  { from: "قائدة المدرسة", to: "قائد المدرسة" },
  { from: "رائدة النشاط", to: "رائد النشاط" },
  { from: "وتولت التنفيذ", to: "وتولى التنفيذ" },
  { from: "تولت التنفيذ", to: "تولى التنفيذ" },
];

const MALE_WHOLE_WORD_REPLACEMENTS: PhraseReplacement[] = [
  { from: "الطالبات", to: "الطلاب" },
  { from: "طالبات", to: "طلاب" },
  { from: "الطالبة", to: "الطالب" },
  { from: "طالبة", to: "طالب" },
  { from: "عدد الطالبات", to: "عدد الطلاب" },
  { from: "المستفيدات", to: "المستفيدين" },
  { from: "المشاركات", to: "المشاركين" },
  { from: "المستهدفات", to: "المستهدفين" },
  { from: "المعلمة", to: "المعلم" },
  { from: "معلمة", to: "معلم" },
  { from: "الرائدة", to: "الرائد" },
  { from: "المنفذة", to: "المنفذ" },
  { from: "منفذة", to: "منفذ" },
];

const PROTECTED_FIELD_HINTS = [
  "student",
  "studentname",
  "guardian",
  "executor",
  "teachername",
  "principalname",
  "signedname",
  "phone",
  "nationalid",
  "email",
  "signature",
  "توقيع",
  "جوال",
  "هاتف",
  "هوية",
  "اسم الطالب",
  "اسم الطالبة",
  "اسم ولي الأمر",
  "اسم المعلم",
  "اسم المعلمة",
  "اسم المدير",
  "اسم المديرة",
];

const PROTECTED_PHRASES = [
  "النشاط الطلابي",
  "النشاط الطلابية",
  "الطلابي",
  "الطلابية",
  "الطالبية",
];

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeLookupText(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortLongestFirst(replacements: PhraseReplacement[]) {
  return [...replacements].sort((a, b) => b.from.length - a.from.length);
}

function replaceAllExact(text: string, from: string, to: string) {
  if (!from || !text.includes(from)) {
    return text;
  }

  return text.split(from).join(to);
}

function replaceArabicWholeWord(text: string, from: string, to: string) {
  if (!from) {
    return text;
  }

  const pattern = new RegExp(`(^|[^ء-ي])(${escapeRegExp(from)})(?=$|[^ء-ي])`, "g");

  return text.replace(pattern, (_, prefix: string) => `${prefix}${to}`);
}

function protectPhrases(text: string) {
  const protectedMap = new Map<string, string>();
  let nextText = text;

  PROTECTED_PHRASES.forEach((phrase, index) => {
    const token = `__REPORT_LANG_PROTECTED_${index}__`;

    if (nextText.includes(phrase)) {
      protectedMap.set(token, phrase);
      nextText = replaceAllExact(nextText, phrase, token);
    }
  });

  return {
    text: nextText,
    protectedMap,
  };
}

function restoreProtectedPhrases(text: string, protectedMap: Map<string, string>) {
  let nextText = text;

  protectedMap.forEach((phrase, token) => {
    nextText = replaceAllExact(nextText, token, phrase);
  });

  return nextText;
}

function getExactReplacements(mode: ReportLanguageMode) {
  return mode === "FEMALE"
    ? sortLongestFirst(FEMALE_EXACT_REPLACEMENTS)
    : sortLongestFirst(MALE_EXACT_REPLACEMENTS);
}

function getWholeWordReplacements(mode: ReportLanguageMode) {
  return mode === "FEMALE"
    ? sortLongestFirst(FEMALE_WHOLE_WORD_REPLACEMENTS)
    : sortLongestFirst(MALE_WHOLE_WORD_REPLACEMENTS);
}

export function normalizeReportLanguageMode(value: unknown): ReportLanguageMode {
  return String(value || "").toUpperCase() === "FEMALE" ? "FEMALE" : "MALE";
}

export function getReportLanguageModeFromUserGender(value: unknown): ReportLanguageMode {
  return String(value || "").toUpperCase() === "FEMALE" ? "FEMALE" : "MALE";
}

export function getReportLanguageModeLabel(mode: ReportLanguageMode): string {
  return normalizeReportLanguageMode(mode) === "FEMALE" ? "مؤنث" : "مذكر";
}

export function getReportLanguageModeInstruction(mode: ReportLanguageMode): string {
  return normalizeReportLanguageMode(mode) === "FEMALE"
    ? "استخدم صياغة التأنيث بشكل متسق. استخدم الطالبات بدل الطلاب، والمعلمة بدل المعلم، ورائدة النشاط بدل رائد النشاط، والموجهة الطلابية بدل الموجه الطلابي، ومديرة المدرسة بدل مدير المدرسة عند الحاجة. لا تستخدم الصياغة المذكرة العامة إذا كانت صيغة التقرير مؤنثة."
    : "استخدم صياغة التذكير بشكل متسق في التقرير، وتجنب التحول إلى الصياغة المؤنثة إلا إذا كانت جزءًا ثابتًا من اسم شخص أو قيمة أصلية لا يجب تغييرها.";
}

export function applyReportLanguageModeToText(
  text: unknown,
  mode: ReportLanguageMode,
): string {
  const normalizedText = cleanText(text);

  if (!normalizedText) {
    return "";
  }

  const normalizedMode = normalizeReportLanguageMode(mode);
  const { text: protectedText, protectedMap } = protectPhrases(normalizedText);

  let nextText = protectedText;

  for (const replacement of getExactReplacements(normalizedMode)) {
    nextText = replaceAllExact(nextText, replacement.from, replacement.to);
  }

  for (const replacement of getWholeWordReplacements(normalizedMode)) {
    nextText = replaceArabicWholeWord(nextText, replacement.from, replacement.to);
  }

  return restoreProtectedPhrases(nextText, protectedMap);
}

export function shouldApplyReportLanguageModeToFieldValue(
  key: string,
  label: string,
): boolean {
  const lookup = normalizeLookupText(`${key} ${label}`);

  return !PROTECTED_FIELD_HINTS.some((hint) => {
    const normalizedHint = normalizeLookupText(hint);
    return normalizedHint ? lookup.includes(normalizedHint) : false;
  });
}

export function applyReportLanguageModeToFieldValue(
  value: unknown,
  mode: ReportLanguageMode,
  key: string,
  label: string,
): string {
  const text = cleanText(value);

  if (!text) {
    return "";
  }

  if (!shouldApplyReportLanguageModeToFieldValue(key, label)) {
    return text;
  }

  return applyReportLanguageModeToText(text, mode);
}
