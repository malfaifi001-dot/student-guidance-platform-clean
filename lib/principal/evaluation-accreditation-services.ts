export type PrincipalEvaluationAccreditationService = {
  slug: string;
  serviceSlug: string;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
};

const BASE_PATH = "/dashboard/principal/evaluation-accreditation";

function service(
  serviceSlug: string,
  title: string,
  description: string,
): PrincipalEvaluationAccreditationService {
  return {
    slug: serviceSlug,
    serviceSlug,
    title,
    shortTitle: title,
    description,
    href: `${BASE_PATH}/${serviceSlug}`,
  };
}

export const PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES = [
  service(
    "principal-school-administration",
    "الإدارة المدرسية",
    "توثيق أعمال الإدارة المدرسية ومتابعة سجلاتها وتقاريرها وفق Workflow المنشور.",
  ),
  service(
    "principal-evaluation-learning",
    "التقويم والتعلم",
    "توثيق أعمال التقويم والتعلم ومتابعة سجلاتها وتقاريرها وفق Workflow المنشور.",
  ),
  service(
    "principal-learning-outcomes",
    "نواتج التعلم",
    "توثيق نواتج التعلم ومتابعة سجلاتها وتقاريرها وفق Workflow المنشور.",
  ),
  service(
    "principal-school-environment",
    "البيئة المدرسية",
    "توثيق أعمال البيئة المدرسية ومتابعة سجلاتها وتقاريرها وفق Workflow المنشور.",
  ),
] as const satisfies readonly PrincipalEvaluationAccreditationService[];

const serviceBySlug = new Map(
  PRINCIPAL_EVALUATION_ACCREDITATION_SERVICES.map((item) => [item.slug, item]),
);

export function getPrincipalEvaluationAccreditationService(slug: string) {
  return serviceBySlug.get(String(slug || "").trim()) || null;
}

export function isPrincipalEvaluationAccreditationServiceSlug(slug: string) {
  return serviceBySlug.has(String(slug || "").trim());
}
