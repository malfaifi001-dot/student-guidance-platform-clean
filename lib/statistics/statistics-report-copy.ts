export function getReportPreparedByLabel(gender: unknown) {
  return String(gender || "").trim().toUpperCase() === "FEMALE"
    ? "أعدت التقرير"
    : "أعد التقرير";
}
