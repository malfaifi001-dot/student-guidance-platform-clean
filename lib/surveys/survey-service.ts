import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

type SurveyAvailabilityInput = {
  status: string;
  opensAt?: Date | string | null;
  endsAt?: Date | string | null;
};

export function createSurveyToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export function normalizePhone(value: unknown) {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .trim()
    .slice(0, 20);
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateTime(value: Date | string | null | undefined) {
  const date = toDate(value);

  if (!date) return null;

  return date.toLocaleString("ar-SA");
}

export function getSurveyAvailability(survey: SurveyAvailabilityInput) {
  const now = new Date();
  const opensAt = toDate(survey.opensAt);
  const endsAt = toDate(survey.endsAt);

  if (survey.status === "DRAFT") {
    return {
      isOpen: false,
      code: "DRAFT",
      title: "الاستبيان غير منشور",
      reason: "هذا الاستبيان ما زال مسودة ولم يتم نشره بعد.",
    };
  }

  if (survey.status === "CLOSED") {
    return {
      isOpen: false,
      code: "CLOSED",
      title: "الاستبيان مغلق",
      reason: "تم إغلاق استقبال الردود لهذا الاستبيان.",
    };
  }

  if (survey.status === "ARCHIVED") {
    return {
      isOpen: false,
      code: "ARCHIVED",
      title: "الاستبيان مؤرشف",
      reason: "هذا الاستبيان مؤرشف ولا يستقبل ردودًا جديدة.",
    };
  }

  if (survey.status !== "PUBLISHED") {
    return {
      isOpen: false,
      code: "NOT_PUBLISHED",
      title: "الاستبيان غير متاح",
      reason: "الاستبيان غير منشور حاليًا.",
    };
  }

  if (opensAt && opensAt.getTime() > now.getTime()) {
    return {
      isOpen: false,
      code: "NOT_STARTED",
      title: "لم تبدأ فترة استقبال الردود",
      reason: `سيكون الاستبيان متاحًا للتعبئة ابتداءً من ${formatDateTime(opensAt) || "الموعد المحدد"}.`,
    };
  }

  if (endsAt && endsAt.getTime() < now.getTime()) {
    return {
      isOpen: false,
      code: "ENDED",
      title: "انتهت فترة استقبال الردود",
      reason: `انتهت فترة تعبئة هذا الاستبيان في ${formatDateTime(endsAt) || "الموعد المحدد"}.`,
    };
  }

  return {
    isOpen: true,
    code: "OPEN",
    title: "الاستبيان متاح",
    reason: null,
  };
}

export async function getPublicSurveyByToken(token: string) {
  const survey = await prisma.survey.findUnique({
    where: {
      token,
    },
    include: {
      questions: {
        orderBy: {
          order: "asc",
        },
        include: {
          options: {
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  });

  if (!survey) {
    return {
      survey: null,
      availability: {
        isOpen: false,
        code: "NOT_FOUND",
        title: "الاستبيان غير موجود",
        reason: "الرابط غير صحيح أو لم يعد متاحًا.",
      },
    };
  }

  return {
    survey,
    availability: getSurveyAvailability(survey),
  };
}

export async function getPublishedSurveyByToken(token: string) {
  const { survey, availability } = await getPublicSurveyByToken(token);

  if (!survey || !availability.isOpen) {
    return null;
  }

  return survey;
}