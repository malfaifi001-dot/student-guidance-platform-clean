import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { getCurrentSessionUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { getSchoolSubscriptionOverview } from "@/lib/subscription/subscription-service";
import { surveyAudienceLabels } from "@/lib/surveys/survey-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    surveyId: string;
  }>;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
    return answer.jsonValue
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("، ");
  }

  if (answer.jsonValue !== null && answer.jsonValue !== undefined) {
    return JSON.stringify(answer.jsonValue);
  }

  return answer.value || "";
}

function answerToNumber(answer: { value: string | null; jsonValue: unknown } | undefined) {
  const numberValue = Number(answerToText(answer));

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function isChoiceQuestion(type: string) {
  return type === "YES_NO" || type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
}

function isNumericQuestion(type: string) {
  return type === "RATING" || type === "SCALE" || type === "NUMBER";
}

function buildQuestionAnalysis(survey: NonNullable<Awaited<ReturnType<typeof getSurveyForPdf>>>) {
  const totalResponses = survey.responses.length;

  return survey.questions.map((question) => {
    const responseAnswers = survey.responses.map((response) => {
      return response.answers.find((answer) => answer.questionId === question.id);
    });

    const answeredAnswers = responseAnswers.filter((answer) => answerToText(answer).trim());
    const numericValues = responseAnswers
      .map((answer) => answerToNumber(answer))
      .filter((value): value is number => value !== null);

    const optionLabels =
      question.type === "YES_NO"
        ? ["نعم", "لا"]
        : question.options.map((option) => option.label);

    const optionCounts = isChoiceQuestion(question.type)
      ? optionLabels.map((label) => {
          const count = responseAnswers.filter((answer) => {
            const values = answerToText(answer)
              .split("،")
              .map((item) => item.trim())
              .filter(Boolean);

            return values.includes(label);
          }).length;

          return {
            label,
            count,
            percentage: answeredAnswers.length ? Math.round((count / answeredAnswers.length) * 100) : 0,
          };
        })
      : [];

    const textSamples =
      question.type === "TEXT" || question.type === "TEXTAREA"
        ? responseAnswers
            .map((answer) => answerToText(answer).trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      isRequired: question.isRequired,
      answeredCount: answeredAnswers.length,
      emptyCount: Math.max(totalResponses - answeredAnswers.length, 0),
      answerRate: totalResponses ? Math.round((answeredAnswers.length / totalResponses) * 100) : 0,
      average: numericValues.length
        ? Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2))
        : null,
      min: numericValues.length ? Math.min(...numericValues) : null,
      max: numericValues.length ? Math.max(...numericValues) : null,
      optionCounts,
      textSamples,
    };
  });
}

async function getSurveyForPdf(surveyId: string) {
  return prisma.survey.findUnique({
    where: {
      id: surveyId,
    },
    include: {
      schoolAccount: {
        include: {
          profile: true,
        },
      },
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
}

async function requirePdfAccess(surveyId: string) {
  const current = await getCurrentSessionUser();

  if (!current?.user) {
    return {
      survey: null,
      error: NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 }),
    };
  }

  if (current.user.role !== "ADMIN") {
    if (!current.user.schoolAccountId) {
      return {
        survey: null,
        error: NextResponse.json({ error: "حسابك غير مرتبط بمدرسة." }, { status: 403 }),
      };
    }

    const overview = await getSchoolSubscriptionOverview(current.user.schoolAccountId);

    if (!overview.usable) {
      return {
        survey: null,
        error: NextResponse.json({ error: "حسابك يحتاج تفعيلًا للاستمرار." }, { status: 402 }),
      };
    }
  }

  const survey = await getSurveyForPdf(surveyId);

  if (!survey) {
    return {
      survey: null,
      error: NextResponse.json({ error: "الاستبيان غير موجود." }, { status: 404 }),
    };
  }

  if (current.user.role !== "ADMIN" && survey.schoolAccountId !== current.user.schoolAccountId) {
    return {
      survey: null,
      error: NextResponse.json({ error: "لا تملك صلاحية الوصول لهذا الاستبيان." }, { status: 403 }),
    };
  }

  return {
    survey,
    error: null,
  };
}

function buildPdfHtml(survey: NonNullable<Awaited<ReturnType<typeof getSurveyForPdf>>>) {
  const questions = buildQuestionAnalysis(survey);
  const totalResponses = survey.responses.length;
  const requiredQuestions = survey.questions.filter((question) => question.isRequired);
  const completedRequiredResponses = survey.responses.filter((response) => {
    if (!requiredQuestions.length) return true;

    return requiredQuestions.every((question) => {
      const answer = response.answers.find((item) => item.questionId === question.id);
      return Boolean(answerToText(answer).trim());
    });
  }).length;

  const completionRate = totalResponses
    ? Math.round((completedRequiredResponses / totalResponses) * 100)
    : 0;

  const reportDate = new Date().toLocaleDateString("ar-SA");
  const schoolName =
    survey.schoolAccount.profile?.schoolName ||
    survey.schoolAccount.name ||
    "منصة التوجيه الطلابي";

  const questionCards = questions
    .map((question, index) => {
      const numericBlock =
        question.average !== null
          ? `
            <div class="metric-grid three">
              <div class="mini-metric">
                <span>المتوسط</span>
                <strong>${escapeHtml(question.average)}</strong>
              </div>
              <div class="mini-metric">
                <span>أقل قيمة</span>
                <strong>${escapeHtml(question.min)}</strong>
              </div>
              <div class="mini-metric">
                <span>أعلى قيمة</span>
                <strong>${escapeHtml(question.max)}</strong>
              </div>
            </div>
          `
          : "";

      const numericBars =
        isNumericQuestion(question.type) && question.average !== null
          ? `
            <div class="simple-bars">
              ${[
                { label: "أقل قيمة", value: question.min || 0 },
                { label: "المتوسط", value: question.average || 0 },
                { label: "أعلى قيمة", value: question.max || 0 },
              ]
                .map((item) => {
                  const maxValue = Math.max(question.max || 1, 1);
                  const width = Math.max((Number(item.value) / maxValue) * 100, 6);

                  return `
                    <div class="bar-row">
                      <span>${escapeHtml(item.label)}</span>
                      <div class="bar-track">
                        <div class="bar-fill green" style="width:${width}%"></div>
                      </div>
                      <strong>${escapeHtml(item.value)}</strong>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
          : "";

      const choiceBlock =
        isChoiceQuestion(question.type) && question.optionCounts.some((option) => option.count > 0)
          ? `
            <div class="choice-list">
              <p class="section-note">توزيع الاختيارات</p>
              ${question.optionCounts
                .filter((option) => option.count > 0)
                .map((option) => `
                  <div class="choice-row">
                    <div class="choice-head">
                      <strong>${escapeHtml(option.label)}</strong>
                      <span>${escapeHtml(option.count)} رد — ${escapeHtml(option.percentage)}%</span>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill blue" style="width:${Math.max(option.percentage, 4)}%"></div>
                    </div>
                  </div>
                `)
                .join("")}
            </div>
          `
          : "";

      const textSamples =
        question.textSamples.length > 0
          ? `
            <div class="text-samples">
              <p class="section-note">عينات من الإجابات النصية</p>
              ${question.textSamples
                .map((sample) => `<div class="text-sample">${escapeHtml(sample)}</div>`)
                .join("")}
            </div>
          `
          : "";

      return `
        <article class="question-card">
          <div class="question-head">
            <div>
              <div class="badges">
                <span>السؤال ${index + 1}</span>
                <span>${escapeHtml(questionTypeLabel(question.type))}</span>
                ${question.isRequired ? "<span class='required'>مطلوب</span>" : ""}
              </div>
              <h3>${escapeHtml(question.label)}</h3>
            </div>

            <div class="question-stats">
              <div><strong>${escapeHtml(question.answeredCount)}</strong><span>إجابة</span></div>
              <div><strong>${escapeHtml(question.emptyCount)}</strong><span>فارغ</span></div>
              <div><strong>${escapeHtml(question.answerRate)}%</strong><span>معدل</span></div>
            </div>
          </div>

          ${numericBlock}
          ${numericBars}
          ${choiceBlock}
          ${textSamples}
        </article>
      `;
    })
    .join("");

  return `
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(survey.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      direction: rtl;
      font-family: Arial, "Tahoma", sans-serif;
      background: #ffffff;
      color: #020617;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 100%;
      min-height: 100%;
    }

    .header {
      border: 1px solid #dbe4ee;
      border-radius: 28px;
      padding: 26px;
      margin-bottom: 18px;
      background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
    }

    .topline {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 20px;
    }

    .brand {
      color: #0369a1;
      font-size: 14px;
      font-weight: 800;
    }

    h1 {
      margin: 12px 0 0;
      font-size: 30px;
      line-height: 1.5;
      font-weight: 900;
    }

    .description {
      margin: 10px 0 0;
      color: #475569;
      font-size: 14px;
      line-height: 2;
    }

    .stamp {
      min-width: 125px;
      border-radius: 24px;
      background: #020617;
      color: #ffffff;
      padding: 17px;
      text-align: center;
    }

    .stamp span {
      display: block;
      opacity: .75;
      font-size: 12px;
    }

    .stamp strong {
      display: block;
      margin-top: 8px;
      font-size: 18px;
    }

    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .badges span {
      display: inline-flex;
      border-radius: 999px;
      background: #f1f5f9;
      color: #334155;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 800;
    }

    .badges .required {
      background: #fff1f2;
      color: #be123c;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 18px;
    }

    .metric {
      border-radius: 24px;
      padding: 18px;
      background: #f8fafc;
    }

    .metric.blue {
      background: #eff6ff;
    }

    .metric.green {
      background: #ecfdf5;
    }

    .metric span {
      display: block;
      color: #64748b;
      font-size: 12px;
      font-weight: 800;
    }

    .metric strong {
      display: block;
      margin-top: 8px;
      font-size: 28px;
      font-weight: 900;
      color: #020617;
    }

    .metric.green strong {
      color: #047857;
    }

    .metric.blue strong {
      color: #0369a1;
      font-size: 18px;
    }

    .section-title {
      margin: 22px 0 12px;
      font-size: 22px;
      font-weight: 900;
    }

    .executive {
      border-radius: 24px;
      background: #f8fafc;
      padding: 18px;
      color: #334155;
      font-size: 14px;
      line-height: 2.1;
      margin-bottom: 18px;
    }

    .question-card {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #dbe4ee;
      border-radius: 26px;
      padding: 18px;
      margin-bottom: 16px;
      background: #ffffff;
    }

    .question-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .question-head .badges {
      margin-top: 0;
    }

    .question-head h3 {
      margin: 12px 0 0;
      font-size: 17px;
      line-height: 1.8;
      font-weight: 900;
    }

    .question-stats {
      display: grid;
      grid-template-columns: repeat(3, 76px);
      gap: 8px;
      text-align: center;
    }

    .question-stats div {
      border-radius: 18px;
      background: #f8fafc;
      padding: 11px;
    }

    .question-stats strong {
      display: block;
      font-size: 18px;
      font-weight: 900;
    }

    .question-stats span {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 11px;
    }

    .metric-grid {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .metric-grid.three {
      grid-template-columns: repeat(3, 1fr);
    }

    .mini-metric {
      border-radius: 18px;
      background: #f8fafc;
      padding: 14px;
    }

    .mini-metric span {
      color: #64748b;
      font-size: 11px;
      font-weight: 800;
    }

    .mini-metric strong {
      display: block;
      margin-top: 6px;
      font-size: 22px;
      font-weight: 900;
    }

    .simple-bars,
    .choice-list,
    .text-samples {
      margin-top: 14px;
    }

    .section-note {
      margin: 0 0 8px;
      color: #334155;
      font-size: 13px;
      font-weight: 900;
    }

    .bar-row {
      display: grid;
      grid-template-columns: 84px 1fr 40px;
      gap: 10px;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
    }

    .bar-track {
      height: 10px;
      border-radius: 999px;
      background: #edf2f7;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 999px;
    }

    .bar-fill.blue {
      background: #0284c7;
    }

    .bar-fill.green {
      background: #059669;
    }

    .choice-row {
      border-radius: 18px;
      background: #f8fafc;
      padding: 12px;
      margin-bottom: 8px;
    }

    .choice-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 9px;
      font-size: 12px;
    }

    .choice-head span {
      color: #64748b;
    }

    .text-sample {
      border-radius: 16px;
      background: #f8fafc;
      padding: 12px;
      margin-bottom: 8px;
      color: #334155;
      font-size: 13px;
      line-height: 1.9;
    }

    .footer {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div class="topline">
        <div>
          <div class="brand">${escapeHtml(schoolName)}</div>
          <h1>${escapeHtml(survey.title)}</h1>
          ${survey.description ? `<p class="description">${escapeHtml(survey.description)}</p>` : ""}
        </div>

        <div class="stamp">
          <span>تقرير استبيان</span>
          <strong>${escapeHtml(reportDate)}</strong>
        </div>
      </div>

      <div class="badges">
        <span>${escapeHtml(statusLabel(survey.status))}</span>
        <span>${escapeHtml(surveyAudienceLabels[survey.audienceType] || survey.audienceType)}</span>
        <span>${survey.isAnonymous ? "مجهول الهوية" : "بيانات المستجيب اختيارية"}</span>
      </div>

      <div class="summary">
        <div class="metric">
          <span>عدد الردود</span>
          <strong>${escapeHtml(totalResponses)}</strong>
        </div>
        <div class="metric">
          <span>عدد الأسئلة</span>
          <strong>${escapeHtml(survey.questions.length)}</strong>
        </div>
        <div class="metric green">
          <span>اكتمال المطلوب</span>
          <strong>${escapeHtml(completionRate)}%</strong>
        </div>
        <div class="metric blue">
          <span>تاريخ التقرير</span>
          <strong>${escapeHtml(reportDate)}</strong>
        </div>
      </div>
    </section>

    <h2 class="section-title">الملخص التنفيذي</h2>
    <section class="executive">
      تم جمع <strong>${escapeHtml(totalResponses)}</strong> ردًا على هذا الاستبيان، ويحتوي على
      <strong>${escapeHtml(survey.questions.length)}</strong> سؤالًا. بلغت نسبة اكتمال الأسئلة المطلوبة
      <strong>${escapeHtml(completionRate)}%</strong>. يمكن استخدام هذا التقرير كملحق رسمي داعم ضمن تقارير المدرسة أو الحالات المرتبطة.
    </section>

    <h2 class="section-title">تحليل الأسئلة</h2>
    ${questionCards}

    <footer class="footer">
      تم إنشاء هذا التقرير من مركز الاستبيانات في منصة التوجيه الطلابي.
    </footer>
  </main>
</body>
</html>
`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requirePdfAccess(surveyId);

  if (error) return error;

  const html = buildPdfHtml(survey!);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "load",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "12mm",
        left: "10mm",
      },
    });

    const safeTitle =
      survey!.title
        .replace(/[\\/:*?"<>|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || "استبيان";

    const fallbackFileName = `survey-${survey!.id}.pdf`;
    const encodedFileName = encodeURIComponent(`${safeTitle}.pdf`);

    const pdfArrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(pdfArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`,
      },
    });
  } finally {
    await browser.close();
  }
}