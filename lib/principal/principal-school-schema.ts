import { z } from "zod";
import { normalizeStatisticalNumber } from "@/lib/principal/principal-school-service";

const requiredText = (label: string, maximum: number) =>
  z.string().trim().min(1, `${label} مطلوب.`).max(maximum);

export const principalSchoolProfileSchema = z.object({
  schoolName: requiredText("اسم المدرسة", 200),
  principalName: requiredText("اسم مدير المدرسة", 160),
  schoolStatisticalNumber: z
    .string()
    .transform((value, context) => {
      try {
        return normalizeStatisticalNumber(value);
      } catch {
        context.addIssue({ code: "custom", message: "الرقم الإحصائي يجب أن يتكون من أرقام فقط." });
        return z.NEVER;
      }
    }),
  educationDepartment: requiredText("إدارة التعليم", 160),
  city: requiredText("المدينة", 120),
  stage: requiredText("المرحلة", 120),
});
