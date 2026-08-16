import { z } from "zod";
import {
  EDUCATION_ADMINISTRATIONS,
  normalizeEducationAdministration,
  OTHER_SCHOOL_PROFILE_OPTION,
} from "@/lib/constants/school-profile-options";
import { SAUDI_CITY_OTHER_OPTION } from "@/lib/constants/saudi-cities";

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
  schoolStatisticalNumber: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .union([
        z
          .string()
          .regex(/^\d*$/, "الرقم الإحصائي يجب أن يحتوي على أرقام فقط.")
          .max(50),
        z.null(),
        z.undefined(),
      ])
      .transform((value) => (typeof value === "string" ? value : "")),
  ),
  educationDepartment: z.preprocess(
    (value) =>
      typeof value === "string"
        ? normalizeEducationAdministration(value)
        : value,
    z.enum(EDUCATION_ADMINISTRATIONS, {
      error: "اختر إدارة تعليم من القائمة المعتمدة.",
    }),
  ),
  educationOffice: optionalTrimmedString(160),
  city: requiredTrimmedString("المدينة", 120).refine(
    (value) => value !== SAUDI_CITY_OTHER_OPTION,
    "اكتب اسم المدينة عند اختيار أخرى.",
  ),
  district: optionalTrimmedString(120),
  stage: requiredTrimmedString("المرحلة", 120).refine(
    (value) => value !== OTHER_SCHOOL_PROFILE_OPTION,
    "اكتب اسم المرحلة عند اختيار أخرى.",
  ),
  logoUrl: optionalTrimmedString(500),
});

export const principalSignatureRequestSchema = z.object({
  principalName: requiredTrimmedString("اسم المدير", 160),
  principalPhone: requiredTrimmedString("رقم الواتساب", 40),
});

export const schoolSignaturePostSchema = z.object({
  kind: z.enum(["principal", "activityLeader", "counselor", "teacher"]),
  dataUrl: z.string().trim().min(1, "بيانات التوقيع مطلوبة.").max(3_000_000),
});
