export type GuidanceGender = "MALE" | "FEMALE" | "UNKNOWN";

export function normalizeGuidanceGender(value: unknown): GuidanceGender {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "FEMALE") return "FEMALE";
  if (normalized === "MALE") return "MALE";
  return "UNKNOWN";
}

export function teacherGenderCopy(gender: GuidanceGender) {
  const female = gender === "FEMALE";

  return {
    teacher: female ? "معلمة" : "معلم",
    welcome: female ? "أهلًا بكِ يا معلمة" : "أهلًا بك يا معلم",
    start: female ? "ابدئي الرحلة" : "ابدأ الرحلة",
    choose: female ? "اختاري عنصر أداء" : "اختر عنصر أداء",
    complete: female ? "أكملي بيانات العمل الفعلية." : "أكمل بيانات العمل الفعلية.",
    can: female ? "يمكنكِ" : "يمكنك",
    created: female ? "أنشأتِ" : "أنشأت",
  } as const;
}
