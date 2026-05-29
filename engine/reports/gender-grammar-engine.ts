type GenderMode = "MALE" | "FEMALE" | "NEUTRAL";

export function applyGenderGrammar(text: string, gender: GenderMode) {
  if (gender === "FEMALE") {
    return text
      .replaceAll("الطالب", "الطالبة")
      .replaceAll("المستفيد", "المستفيدة")
      .replaceAll("الموجه", "الموجهة")
      .replaceAll("تم توجيهه", "تم توجيهها")
      .replaceAll("تمت متابعته", "تمت متابعتها")
      .replaceAll("تم إرشاده", "تم إرشادها")
      .replaceAll("حضر", "حضرت")
      .replaceAll("أبدى", "أبدت")
      .replaceAll("يحتاج", "تحتاج");
  }

  return text;
}