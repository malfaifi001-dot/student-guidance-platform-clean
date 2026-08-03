import { z } from "zod";

const requiredTrimmedString = (label: string, maxLength: number) =>
  z
    .string({
      error: `${label} مطلوب.`,
    })
    .trim()
    .min(1, `${label} مطلوب.`)
    .max(maxLength, `${label} أطول من الحد المسموح.`);

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.union([z.string().max(maxLength), z.null(), z.undefined()]),
  ).transform((value) => {
    if (typeof value !== "string") {
      return "";
    }

    return value;
  });

export const schoolSettingsPatchSchema = z.object({
  officialName: requiredTrimmedString("الاسم الرسمي", 160),
  jobTitle: requiredTrimmedString("المسمى الوظيفي", 160),
  phone: optionalTrimmedString(40),
  schoolName: requiredTrimmedString("اسم المدرسة", 200),
  principalName: optionalTrimmedString(160),
  principalPhone: optionalTrimmedString(40),
  activityLeaderName: optionalTrimmedString(160),
  educationDepartment: optionalTrimmedString(160),
  educationOffice: optionalTrimmedString(160),
  city: optionalTrimmedString(120),
  district: optionalTrimmedString(120),
  stage: optionalTrimmedString(120),
  academicYear: optionalTrimmedString(60),
  currentSemester: optionalTrimmedString(60),
  logoUrl: optionalTrimmedString(500),
});

export const principalSignatureRequestSchema = z.object({
  principalName: requiredTrimmedString("اسم المدير", 160),
  principalPhone: requiredTrimmedString("رقم الواتساب", 40),
});

export const schoolSignaturePostSchema = z.object({
  kind: z.enum(["activityLeader", "counselor", "teacher"]),
  dataUrl: z.string().trim().min(1, "بيانات التوقيع مطلوبة.").max(3_000_000),
});
