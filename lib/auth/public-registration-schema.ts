import { z } from "zod";
import { isValidSaudiMobile, SAUDI_MOBILE_ERROR } from "@/lib/auth/login-identifier";

export const PUBLIC_REGISTRATION_ROLES = ["COUNSELOR", "ACTIVITY_LEADER", "TEACHER", "PRINCIPAL"] as const;

export const publicRegistrationSchema = z
  .object({
    name: z.string().trim().min(3, "الاسم يجب ألا يقل عن 3 أحرف.").max(160),
    phone: z.string().trim().refine(isValidSaudiMobile, SAUDI_MOBILE_ERROR),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.").max(200),
    confirmPassword: z.string(),
    gender: z.enum(["MALE", "FEMALE"]),
    accountType: z.enum(PUBLIC_REGISTRATION_ROLES),
    acceptedTerms: z.boolean().refine((value) => value === true, {
      message: "يجب الموافقة على الشروط والأحكام وسياسة الاستخدام للمتابعة.",
    }),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "كلمة المرور وتأكيدها غير متطابقين." });
    }
  });

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;
