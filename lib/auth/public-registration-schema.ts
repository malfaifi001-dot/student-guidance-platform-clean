import { z } from "zod";

export const PUBLIC_REGISTRATION_ROLES = ["COUNSELOR", "ACTIVITY_LEADER", "TEACHER", "PRINCIPAL"] as const;

export const publicRegistrationSchema = z
  .object({
    name: z.string().trim().min(3, "الاسم يجب ألا يقل عن 3 أحرف.").max(160),
    email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح.").max(254),
    phone: z.string().trim().max(30).optional().nullable(),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.").max(200),
    confirmPassword: z.string(),
    gender: z.enum(["MALE", "FEMALE"]),
    accountType: z.enum(PUBLIC_REGISTRATION_ROLES),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "كلمة المرور وتأكيدها غير متطابقين." });
    }
  });

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;
