import { NextResponse } from "next/server";
import { Workbook } from "exceljs";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { surveyAudienceLabels } from "@/lib/surveys/survey-config";

type RouteContext = {
  params: Promise<{
    surveyId: string;
  }>;
};

function statusLabel(status: string) {
  if (status === "DRAFT") return "مسودة";
  if (status === "PUBLISHED") return "منشور";
  if (status === "CLOSED") return "مغلق";
  if (status === "ARCHIVED") return "مؤرشف";
  return status;
}

function questionTypeLabel(type: string) {
  if (type === "TEXT") return "إجابة قصيرة";
  if (type === "TEXTAREA") return "إجابة طويلة";
  if (type === "SINGLE_CHOICE") return "اختيار واحد";
  if (type === "MULTIPLE_CHOICE") return "اختيارات متعددة";
  if (type === "YES_NO") return "نعم / لا";
  if (type === "RATING") return "تقييم";
  if (type === "SCALE") return "مقياس رقمي";
  if (type === "NUMBER") return "رقم";
  if (type === "DATE") return "تاريخ";
  return type;
}

function answerToText(answer: { value: string | null; jsonValue: unknown } | undefined) {
  if (!answer) return "";

  if (Array.isArray(answer.jsonValue)) {
    return answer.jsonValue.map((item) => String(item || "").trim()).filter(Boolean).join("، ");
  }

  if (answer.jsonValue !== null && answer.jsonValue !== undefined) {
    return JSON.stringify(answer.jsonValue);
  }

  return answer.value || "";
}

function answerToNumber(answer: { value: string | null; jsonValue: unknown } | undefined) {
  const text = answerToText(answer);
  const numberValue = Number(text);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

async function requireExportAccess(surveyId: string) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 }),
    };
  }

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json({ error: "حسابك غير مرتبط بمدرسة." }, { status: 403 }),
      };
    }

    const overview = await getSchoolSubscriptionOverview(current.user.schoolAccountId, current.user.id);

    if (!overview.usable) {
      return {
        current: null,
        survey: null,
        error: NextResponse.json({ error: "حسابك يحتاج تفعيلًا للاستمرار." }, { status: 402 }),
      };
    }
  }

  const survey = await prisma.survey.findUnique({
    where: {
      id: surveyId,
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
      responses: {
        orderBy: {
          submittedAt: "asc",
        },
        include: {
          answers: true,
        },
      },
    },
  });

  if (!survey) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 }),
    };
  }

  if (
    current.user.role !== "ADMIN" &&
    survey.createdById !== current.user.id
  ) {
    return {
      current: null,
      survey: null,
      error: NextResponse.json({ error: "لا تملك صلاحية الوصول لهذا الاستبيان." }, { status: 403 }),
    };
  }

  return {
    current,
    survey,
    error: null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requireExportAccess(surveyId);

  if (error) return error;

  const workbook = new Workbook();
  workbook.creator = "Teachix";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("ملخص الاستبيان", {
    views: [{ rightToLeft: true }],
  });

  summarySheet.columns = [
    { header: "البند", key: "label", width: 32 },
    { header: "القيمة", key: "value", width: 55 },
  ];

  summarySheet.addRows([
    { label: "عنوان الاستبيان", value: survey!.title },
    { label: "الوصف", value: survey!.description || "" },
    { label: "الحالة", value: statusLabel(survey!.status) },
    { label: "الفئة المستهدفة", value: surveyAudienceLabels[survey!.audienceType] || survey!.audienceType },
    { label: "مجهول الهوية", value: survey!.isAnonymous ? "نعم" : "لا" },
    { label: "عدد الأسئلة", value: survey!.questions.length },
    { label: "عدد الردود", value: survey!.responses.length },
    { label: "تاريخ النشر", value: survey!.publishedAt ? survey!.publishedAt.toLocaleString("ar-SA") : "" },
    { label: "تاريخ التصدير", value: new Date().toLocaleString("ar-SA") },
  ]);

  const analysisSheet = workbook.addWorksheet("تحليل الأسئلة", {
    views: [{ rightToLeft: true }],
  });

  analysisSheet.columns = [
    { header: "رقم السؤال", key: "order", width: 12 },
    { header: "السؤال", key: "label", width: 55 },
    { header: "النوع", key: "type", width: 20 },
    { header: "مطلوب", key: "required", width: 12 },
    { header: "عدد الإجابات", key: "answered", width: 14 },
    { header: "عدد الفارغ", key: "empty", width: 14 },
    { header: "معدل الإجابة", key: "rate", width: 16 },
    { header: "المتوسط", key: "average", width: 14 },
    { header: "أقل قيمة", key: "min", width: 14 },
    { header: "أعلى قيمة", key: "max", width: 14 },
    { header: "توزيع الخيارات", key: "distribution", width: 55 },
  ];

  survey!.questions.forEach((question, index) => {
    const answers = survey!.responses.map((response) => {
      return response.answers.find((answer) => answer.questionId === question.id);
    });

    const answered = answers.filter((answer) => answerToText(answer).trim()).length;
    const numericValues = answers
      .map((answer) => answerToNumber(answer))
      .filter((value): value is number => value !== null);

    const optionLabels =
      question.type === "YES_NO"
        ? ["نعم", "لا"]
        : question.options.map((option) => option.label);

    const distribution =
      question.type === "YES_NO" ||
      question.type === "SINGLE_CHOICE" ||
      question.type === "MULTIPLE_CHOICE"
        ? optionLabels
            .map((label) => {
              const count = answers.filter((answer) => {
                const text = answerToText(answer);
                return text.split("،").map((item) => item.trim()).includes(label);
              }).length;

              return `${label}: ${count}`;
            })
            .join(" | ")
        : "";

    analysisSheet.addRow({
      order: index + 1,
      label: question.label,
      type: questionTypeLabel(question.type),
      required: question.isRequired ? "نعم" : "لا",
      answered,
      empty: Math.max(survey!.responses.length - answered, 0),
      rate: survey!.responses.length ? `${Math.round((answered / survey!.responses.length) * 100)}%` : "0%",
      average: numericValues.length
        ? Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2))
        : "",
      min: numericValues.length ? Math.min(...numericValues) : "",
      max: numericValues.length ? Math.max(...numericValues) : "",
      distribution,
    });
  });
  const chartDataSheet = workbook.addWorksheet("بيانات الرسوم", {
    views: [{ rightToLeft: true }],
  });

  chartDataSheet.columns = [
    { header: "نوع الرسم المقترح", key: "chartType", width: 22 },
    { header: "السؤال", key: "question", width: 55 },
    { header: "البند", key: "label", width: 35 },
    { header: "القيمة", key: "value", width: 16 },
    { header: "النسبة", key: "percentage", width: 16 },
  ];

  survey!.questions.forEach((question) => {
    const answers = survey!.responses.map((response) => {
      return response.answers.find((answer) => answer.questionId === question.id);
    });

    const isChoice =
      question.type === "YES_NO" ||
      question.type === "SINGLE_CHOICE" ||
      question.type === "MULTIPLE_CHOICE";

    const isNumeric =
      question.type === "RATING" ||
      question.type === "SCALE" ||
      question.type === "NUMBER";

    if (isChoice) {
      const optionLabels =
        question.type === "YES_NO"
          ? ["نعم", "لا"]
          : question.options.map((option) => option.label);

      const answeredCount = answers.filter((answer) => answerToText(answer).trim()).length;

      optionLabels.forEach((label) => {
        const count = answers.filter((answer) => {
          const text = answerToText(answer);
          return text.split("،").map((item) => item.trim()).includes(label);
        }).length;

        chartDataSheet.addRow({
          chartType: "Pie / Bar",
          question: question.label,
          label,
          value: count,
          percentage: answeredCount ? `${Math.round((count / answeredCount) * 100)}%` : "0%",
        });
      });
    }

    if (isNumeric) {
      const numericValues = answers
        .map((answer) => answerToNumber(answer))
        .filter((value): value is number => value !== null);

      if (numericValues.length) {
        const average = Number(
          (numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2),
        );

        chartDataSheet.addRow({
          chartType: "Bar",
          question: question.label,
          label: "أقل قيمة",
          value: Math.min(...numericValues),
          percentage: "",
        });

        chartDataSheet.addRow({
          chartType: "Bar",
          question: question.label,
          label: "المتوسط",
          value: average,
          percentage: "",
        });

        chartDataSheet.addRow({
          chartType: "Bar",
          question: question.label,
          label: "أعلى قيمة",
          value: Math.max(...numericValues),
          percentage: "",
        });
      }
    }
  });


  const responsesSheet = workbook.addWorksheet("الردود", {
    views: [{ rightToLeft: true }],
  });

  responsesSheet.columns = [
    { header: "رقم الرد", key: "index", width: 12 },
    { header: "تاريخ الإرسال", key: "submittedAt", width: 24 },
    { header: "نوع المستجيب", key: "respondentType", width: 20 },
    { header: "اسم المستجيب", key: "respondentName", width: 24 },
    { header: "رقم الجوال", key: "respondentPhone", width: 20 },
    ...survey!.questions.map((question, index) => ({
      header: `س${index + 1}: ${question.label}`,
      key: question.id,
      width: 40,
    })),
  ];

  survey!.responses.forEach((response, index) => {
    const row: Record<string, string | number> = {
      index: index + 1,
      submittedAt: response.submittedAt.toLocaleString("ar-SA"),
      respondentType: response.respondentType,
      respondentName: response.respondentName || "",
      respondentPhone: response.respondentPhone || "",
    };

    survey!.questions.forEach((question) => {
      const answer = response.answers.find((item) => item.questionId === question.id);
      row[question.id] = answerToText(answer);
    });

    responsesSheet.addRow(row);
  });

  for (const worksheet of workbook.worksheets) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { horizontal: "center" };
    worksheet.eachRow((row) => {
      row.alignment = { vertical: "middle", wrapText: true };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const safeTitle =
    survey!.title
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "استبيان";

  const fallbackFileName = `survey-${survey!.id}.xlsx`;
  const encodedFileName = encodeURIComponent(`${safeTitle}.xlsx`);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`,
    },
  });
}
