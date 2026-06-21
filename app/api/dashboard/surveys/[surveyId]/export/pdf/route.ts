import { readFile } from "fs/promises";
import { extname, join } from "path";
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

const chartPalette = ["#0f4c81", "#157347", "#b45309", "#334155", "#7f1d1d"];

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

function isDonutQuestion(type: string) {
  return type === "YES_NO" || type === "SINGLE_CHOICE";
}

function isNumericQuestion(type: string) {
  return type === "RATING" || type === "SCALE" || type === "NUMBER";
}

function formatGregorianDate(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

async function readPublicImageDataUri(publicPath: string) {
  const normalizedPath = publicPath.replace(/^\/+/, "").replace(/^public\//, "");
  const absolutePath = join(process.cwd(), "public", normalizedPath);

  try {
    const buffer = await readFile(absolutePath);
    const extension = extname(absolutePath).toLowerCase();

    const mime =
      extension === ".svg"
        ? "image/svg+xml"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : "image/png";

    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
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

type SurveyForPdf = NonNullable<Awaited<ReturnType<typeof getSurveyForPdf>>>;

function buildQuestionAnalysis(survey: SurveyForPdf) {
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
            .slice(0, 1)
        : [];

    const dateSamples =
      question.type === "DATE"
        ? responseAnswers
            .map((answer) => answerToText(answer).trim())
            .filter(Boolean)
            .slice(0, 1)
        : [];

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      isRequired: question.isRequired,
      answeredCount: answeredAnswers.length,
      emptyCount: Math.max(totalResponses - answeredAnswers.length, 0),
      answerRate: totalResponses ? Math.round((answeredAnswers.length / totalResponses) * 100) : 0,
      average: isNumericQuestion(question.type) && numericValues.length
        ? Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2))
        : null,
      min: numericValues.length ? Math.min(...numericValues) : null,
      max: numericValues.length ? Math.max(...numericValues) : null,
      optionCounts,
      textSamples,
      dateSamples,
    };
  });
}

type QuestionAnalysis = ReturnType<typeof buildQuestionAnalysis>[number];

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

function getRequestedQuestionIds(request: Request) {
  const url = new URL(request.url);
  const rawValue = url.searchParams.get("questionIds") || "";

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getVisibleQuestions(allQuestions: QuestionAnalysis[], requestedQuestionIds: string[]) {
  if (!requestedQuestionIds.length) {
    return allQuestions.slice(0, Math.min(allQuestions.length, 6));
  }

  const requestedSet = new Set(requestedQuestionIds);
  const selected = allQuestions.filter((question) => requestedSet.has(question.id));

  if (!selected.length) {
    return allQuestions.slice(0, Math.min(allQuestions.length, 6));
  }

  return selected.slice(0, 10);
}

function buildInsightLines({
  totalResponses,
  totalQuestions,
  completionRate,
  questions,
  hiddenQuestionsCount,
}: {
  totalResponses: number;
  totalQuestions: number;
  completionRate: number;
  questions: QuestionAnalysis[];
  hiddenQuestionsCount: number;
}) {
  const lines: string[] = [];

  if (!totalResponses) {
    return ["لم تُسجّل ردود حتى الآن، وسيتم تحديث التقرير بعد استقبال المشاركات."];
  }

  lines.push(`تم تحليل ${questions.length} محورًا مختارًا من أصل ${totalQuestions} سؤالًا، بناءً على ${totalResponses} ردًا.`);

  const numericQuestions = questions.filter((question) => question.average !== null);

  if (numericQuestions.length) {
    const bestNumeric = [...numericQuestions].sort((first, second) => Number(second.average) - Number(first.average))[0];
    const lowestNumeric = [...numericQuestions].sort((first, second) => Number(first.average) - Number(second.average))[0];

    if (bestNumeric) {
      lines.push(`أعلى مؤشر رقمي: ${bestNumeric.label} بمتوسط ${bestNumeric.average}.`);
    }

    if (lowestNumeric && lowestNumeric.id !== bestNumeric?.id) {
      lines.push(`أبرز فرصة تحسين: ${lowestNumeric.label} بمتوسط ${lowestNumeric.average}.`);
    }
  }

  const strongestChoice = questions
    .flatMap((question) =>
      question.optionCounts.map((option) => ({
        question: question.label,
        label: option.label,
        count: option.count,
        percentage: option.percentage,
      })),
    )
    .filter((item) => item.count > 0)
    .sort((first, second) => second.percentage - first.percentage)[0];

  if (strongestChoice) {
    lines.push(`أقوى اتجاه في الاختيارات: ${strongestChoice.label} بنسبة ${strongestChoice.percentage}%.`);
  }

  if (hiddenQuestionsCount > 0) {
    lines.push(`لم يتم عرض ${hiddenQuestionsCount} سؤالًا في هذه الصفحة للحفاظ على رسمية التقرير واختصاره.`);
  }

  return lines.slice(0, 4);
}

function buildCompletionGauge(completionRate: number) {
  const safeRate = Math.max(0, Math.min(completionRate, 100));

  return `
    <div class="completion-gauge" style="background: conic-gradient(#0f4c81 0 ${safeRate}%, #e5e7eb ${safeRate}% 100%);">
      <div>
        <strong>${escapeHtml(safeRate)}%</strong>
        <span>اكتمال</span>
      </div>
    </div>
  `;
}

function buildNumericVisual(question: QuestionAnalysis) {
  const items = [
    { label: "الأدنى", value: Number(question.min || 0) },
    { label: "المتوسط", value: Number(question.average || 0) },
    { label: "الأعلى", value: Number(question.max || 0) },
  ];

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return `
    <div class="numeric-visual">
      ${items
        .map((item, index) => {
          const height = Math.max((item.value / maxValue) * 100, 10);

          return `
            <div class="numeric-column">
              <b>${escapeHtml(item.value)}</b>
              <div class="numeric-track">
                <i style="height:${height}%; background:${chartPalette[index % chartPalette.length]}"></i>
              </div>
              <span>${escapeHtml(item.label)}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildDonutVisual(question: QuestionAnalysis) {
  const activeOptions = question.optionCounts.filter((option) => option.count > 0);
  const options = (activeOptions.length ? activeOptions : question.optionCounts).slice(0, 4);
  const total = Math.max(options.reduce((sum, option) => sum + option.count, 0), 1);

  let cursor = 25;

  const circles = options
    .map((option, index) => {
      const percentage = (option.count / total) * 100;
      const circle = `
        <circle
          cx="21"
          cy="21"
          r="15.9155"
          fill="transparent"
          stroke="${chartPalette[index % chartPalette.length]}"
          stroke-width="5"
          stroke-dasharray="${percentage} ${100 - percentage}"
          stroke-dashoffset="${cursor}"
        />
      `;

      cursor -= percentage;

      return circle;
    })
    .join("");

  return `
    <div class="donut-visual">
      <svg viewBox="0 0 42 42" class="donut-svg" aria-hidden="true">
        <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#e5e7eb" stroke-width="5" />
        ${circles}
        <text x="21" y="20" text-anchor="middle" class="donut-number">${escapeHtml(question.answerRate)}%</text>
        <text x="21" y="25" text-anchor="middle" class="donut-label">معدل</text>
      </svg>

      <div class="legend-list">
        ${options
          .map((option, index) => `
            <div>
              <i style="background:${chartPalette[index % chartPalette.length]}"></i>
              <span>${escapeHtml(option.label)}</span>
              <b>${escapeHtml(option.percentage)}%</b>
            </div>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function buildMultipleChoiceVisual(question: QuestionAnalysis) {
  const options = question.optionCounts
    .filter((option) => option.count > 0)
    .sort((first, second) => second.count - first.count)
    .slice(0, 3);

  if (!options.length) {
    return `<div class="plain-note">لا توجد اختيارات مسجلة لهذا السؤال.</div>`;
  }

  return `
    <div class="ranked-visual">
      ${options
        .map((option, index) => `
          <div class="rank-row">
            <span>${escapeHtml(option.label)}</span>
            <div class="bar-track">
              <i style="width:${Math.max(option.percentage, 5)}%; background:${chartPalette[index % chartPalette.length]}"></i>
            </div>
            <b>${escapeHtml(option.percentage)}%</b>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function buildTextVisual(question: QuestionAnalysis) {
  const sample = question.textSamples[0];

  if (!sample) {
    return `<div class="plain-note">لا توجد إجابات نصية مختصرة.</div>`;
  }

  return `
    <div class="quote-visual">
      <span>عينة مختصرة</span>
      <p>${escapeHtml(sample)}</p>
    </div>
  `;
}

function buildDateVisual(question: QuestionAnalysis) {
  const sample = question.dateSamples[0];

  if (!sample) {
    return `<div class="plain-note">لا توجد تواريخ مسجلة.</div>`;
  }

  return `
    <div class="date-visual">
      <span>تاريخ وارد</span>
      <strong>${escapeHtml(formatGregorianDate(sample) || sample)}</strong>
      <small>من إجابات المشاركين</small>
    </div>
  `;
}

function buildQuestionVisual(question: QuestionAnalysis) {
  if (isNumericQuestion(question.type) && question.average !== null) {
    return buildNumericVisual(question);
  }

  if (isDonutQuestion(question.type)) {
    return buildDonutVisual(question);
  }

  if (question.type === "MULTIPLE_CHOICE") {
    return buildMultipleChoiceVisual(question);
  }

  if (question.type === "TEXT" || question.type === "TEXTAREA") {
    return buildTextVisual(question);
  }

  if (question.type === "DATE") {
    return buildDateVisual(question);
  }

  return `<div class="plain-note">لا توجد بيانات رسومية لهذا المحور.</div>`;
}

async function buildPdfHtml(survey: SurveyForPdf, requestedQuestionIds: string[]) {
  const ministryLogoDataUri = await readPublicImageDataUri("/uploads/school-logos/MOE.png");
  const allQuestions = buildQuestionAnalysis(survey);
  const questions = getVisibleQuestions(allQuestions, requestedQuestionIds);
  const hiddenQuestionsCount = Math.max(allQuestions.length - questions.length, 0);

  const totalResponses = survey.responses.length;
  const totalQuestions = survey.questions.length;

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

  const profile = survey.schoolAccount.profile;
  const schoolName = profile?.schoolName || survey.schoolAccount.name || "منصة التوجيه الطلابي";
  const educationDepartment = profile?.educationDepartment || "إدارة التعليم";
  const educationOffice = profile?.educationOffice || "مكتب التعليم";
  const reportDate = formatGregorianDate(new Date());

  const densityClass =
    questions.length <= 4
      ? "density-large"
      : questions.length <= 7
        ? "density-medium"
        : "density-compact";

  const insightLines = buildInsightLines({
    totalResponses,
    totalQuestions,
    completionRate,
    questions,
    hiddenQuestionsCount,
  });

  const questionBlocks = questions
    .map((question, index) => `
      <section class="question-module">
        <div class="question-head">
          <div class="question-index">س${index + 1}</div>
          <div class="question-title">
            <span>${escapeHtml(questionTypeLabel(question.type))}${question.isRequired ? " · مطلوب" : ""}</span>
            <h3>${escapeHtml(question.label)}</h3>
          </div>
        </div>

        <div class="question-stats">
          <div><strong>${escapeHtml(question.answeredCount)}</strong><span>إجابة</span></div>
          <div><strong>${escapeHtml(question.answerRate)}%</strong><span>معدل</span></div>
          <div><strong>${escapeHtml(question.emptyCount)}</strong><span>فارغ</span></div>
        </div>

        ${buildQuestionVisual(question)}
      </section>
    `)
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
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      direction: rtl;
      font-family: Arial, "Tahoma", sans-serif;
      background: #ffffff;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }

    .sheet {
      width: 210mm;
      height: 297mm;
      padding: 9mm 10mm;
      background: #ffffff;
      overflow: hidden;
    }

    .letterhead {
      display: grid;
      grid-template-columns: 58mm 1fr 48mm;
      gap: 5mm;
      align-items: center;
      min-height: 30mm;
      padding: 4mm 4.5mm 5mm;
      border: 1px solid #d1d5db;
      border-bottom: 2px solid #0f2a44;
      border-radius: 6mm;
      background: #ffffff;
    }

    .official-side {
      display: flex;
      align-items: center;
      gap: 3mm;
    }

    .logo {
      width: 18mm;
      height: 18mm;
      object-fit: contain;
    }

    .logo-fallback {
      width: 18mm;
      height: 18mm;
      display: grid;
      place-items: center;
      border: 1px solid #0f2a44;
      color: #0f2a44;
      font-size: 7px;
      font-weight: 900;
      line-height: 1.4;
      text-align: center;
    }

    .official-lines strong,
    .school-lines strong {
      display: block;
      color: #0f2a44;
      font-size: 9.5px;
      line-height: 1.8;
      font-weight: 900;
    }

    .official-lines span,
    .school-lines span {
      display: block;
      color: #475569;
      font-size: 8px;
      line-height: 1.8;
      font-weight: 800;
    }

    .report-title {
      text-align: center;
      border-right: 1px solid #d1d5db;
      border-left: 1px solid #d1d5db;
      padding: 0 4mm;
    }

    .report-title small {
      display: inline-block;
      color: #0f4c81;
      font-size: 8px;
      font-weight: 900;
      border: 1px solid #d1d5db;
      padding: 1.4mm 4mm;
      border-radius: 999px;
      background: #f8fbff;
    }

    .report-title h1 {
      margin: 2.5mm 0 0;
      color: #111827;
      font-size: 15px;
      line-height: 1.55;
      font-weight: 900;
    }

    .school-lines {
      text-align: left;
    }

    .executive-band {
      display: grid;
      grid-template-columns: 38mm 1fr;
      gap: 5mm;
      margin-top: 5mm;
      padding: 4.5mm;
      border: 1px solid #d1d5db;
      border-radius: 5mm;
      background: #ffffff;
    }

    .completion-box {
      display: grid;
      place-items: center;
      border-left: 1px solid #e5e7eb;
      border-radius: 4mm;
    }

    .completion-gauge {
      width: 27mm;
      height: 27mm;
      border-radius: 50%;
      display: grid;
      place-items: center;
    }

    .completion-gauge > div {
      width: 20mm;
      height: 20mm;
      border-radius: 50%;
      background: #ffffff;
      display: grid;
      place-items: center;
      text-align: center;
      border: 1px solid #e5e7eb;
    }

    .completion-gauge strong {
      display: block;
      color: #0f2a44;
      font-size: 13px;
      font-weight: 900;
      line-height: 1;
    }

    .completion-gauge span {
      display: block;
      margin-top: 1mm;
      color: #64748b;
      font-size: 6.5px;
      font-weight: 900;
    }

    .summary-area {
      display: grid;
      gap: 3mm;
    }

    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2mm;
    }

    .kpi {
      border: 1px solid #e5e7eb;
      padding: 2.7mm;
      min-height: 17mm;
      background: #fbfdff;
      border-radius: 3.5mm;
    }

    .kpi span {
      display: block;
      color: #64748b;
      font-size: 7px;
      font-weight: 900;
    }

    .kpi strong {
      display: block;
      margin-top: 1mm;
      color: #111827;
      font-size: 14px;
      font-weight: 900;
      line-height: 1.1;
    }

    .kpi small {
      display: block;
      margin-top: 1mm;
      color: #0f4c81;
      font-size: 6.6px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .executive-text {
      color: #374151;
      font-size: 8.1px;
      line-height: 1.95;
      font-weight: 800;
    }

    .section-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4mm;
      margin-top: 5mm;
      padding: 2.2mm 2.8mm;
      border: 1px solid #e5e7eb;
      border-radius: 3.5mm;
      background: #fcfdff;
    }

    .section-label h2 {
      margin: 0;
      color: #0f2a44;
      font-size: 12px;
      font-weight: 900;
    }

    .section-label span {
      color: #64748b;
      font-size: 7.5px;
      font-weight: 900;
    }

    .questions-board {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2.4mm;
      margin-top: 3mm;
      overflow: hidden;
    }

    .density-large .question-module {
      min-height: 42mm;
    }

    .density-medium .question-module {
      min-height: 33mm;
    }

    .density-compact .question-module {
      min-height: 25mm;
    }

    .question-module {
      border: 1px solid #d1d5db;
      background: #ffffff;
      padding: 2.6mm;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
      border-radius: 4.5mm;
      box-shadow: 0 1mm 2.2mm rgba(15, 42, 68, 0.05);
    }

    .question-head {
      display: grid;
      grid-template-columns: 10mm 1fr;
      gap: 2mm;
      align-items: start;
    }

    .question-index {
      display: grid;
      place-items: center;
      min-height: 8mm;
      background: #0f2a44;
      color: #ffffff;
      font-size: 8px;
      font-weight: 900;
      border-radius: 2.8mm;
    }

    .question-title span {
      display: block;
      color: #0f4c81;
      font-size: 6.6px;
      line-height: 1.4;
      font-weight: 900;
    }

    .question-title h3 {
      height: 9mm;
      margin: .8mm 0 0;
      color: #111827;
      font-size: 8.2px;
      line-height: 1.45;
      font-weight: 900;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .density-compact .question-title h3 {
      height: 7.2mm;
      font-size: 7.1px;
      line-height: 1.35;
    }

    .question-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1mm;
      margin-top: 1.5mm;
    }

    .question-stats div {
      background: #f8fafc;
      border: 1px solid #edf2f7;
      padding: 1.2mm .8mm;
      text-align: center;
      border-radius: 2.6mm;
    }

    .question-stats strong {
      display: block;
      color: #111827;
      font-size: 8px;
      font-weight: 900;
      line-height: 1;
    }

    .question-stats span {
      display: block;
      margin-top: .6mm;
      color: #64748b;
      font-size: 5.5px;
      font-weight: 800;
    }

    .numeric-visual {
      height: 15mm;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2mm;
      align-items: end;
      margin-top: 1.7mm;
    }

    .density-compact .numeric-visual {
      height: 10.5mm;
    }

    .numeric-column {
      height: 100%;
      display: grid;
      grid-template-rows: 3mm 1fr 3mm;
      gap: .5mm;
      text-align: center;
      align-items: end;
    }

    .numeric-column b {
      color: #111827;
      font-size: 6.5px;
      font-weight: 900;
    }

    .numeric-track {
      height: 100%;
      display: flex;
      align-items: end;
      justify-content: center;
      background: #edf2f7;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      overflow: hidden;
    }

    .numeric-track i {
      width: 70%;
      display: block;
      border-radius: 999px 999px 0 0;
    }

    .numeric-column span {
      color: #64748b;
      font-size: 5.5px;
      font-weight: 900;
    }

    .donut-visual {
      display: grid;
      grid-template-columns: 18mm 1fr;
      gap: 2mm;
      align-items: center;
      margin-top: 1.5mm;
      min-height: 17mm;
    }

    .density-compact .donut-visual {
      grid-template-columns: 14mm 1fr;
      min-height: 12mm;
    }

    .donut-svg {
      width: 18mm;
      height: 18mm;
      filter: drop-shadow(0 1px 1px rgba(15, 42, 68, 0.08));
    }

    .density-compact .donut-svg {
      width: 14mm;
      height: 14mm;
    }

    .donut-number {
      font-size: 5px;
      fill: #111827;
      font-weight: 900;
    }

    .donut-label {
      font-size: 2.5px;
      fill: #64748b;
      font-weight: 900;
    }

    .legend-list {
      display: grid;
      gap: .8mm;
      min-width: 0;
    }

    .legend-list div {
      display: grid;
      grid-template-columns: 2mm 1fr auto;
      gap: 1mm;
      align-items: center;
      color: #374151;
      font-size: 5.8px;
      font-weight: 900;
      min-width: 0;
    }

    .legend-list i {
      width: 2mm;
      height: 2mm;
    }

    .legend-list span {
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .ranked-visual {
      display: grid;
      gap: 1.1mm;
      margin-top: 2mm;
    }

    .rank-row {
      display: grid;
      grid-template-columns: 20mm 1fr 9mm;
      gap: 1.2mm;
      align-items: center;
      color: #374151;
      font-size: 6px;
      font-weight: 900;
    }

    .density-compact .rank-row {
      grid-template-columns: 15mm 1fr 7mm;
      font-size: 5.4px;
    }

    .bar-track {
      height: 2.2mm;
      background: #edf2f7;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      border-radius: 999px;
    }

    .bar-track i {
      display: block;
      height: 100%;
      border-radius: 999px;
    }

    .quote-visual,
    .date-visual,
    .plain-note {
      margin-top: 2mm;
      min-height: 12mm;
      padding: 2mm;
      border-right: 3px solid #0f4c81;
      background: #f8fafc;
      color: #374151;
      font-size: 6.3px;
      line-height: 1.6;
      font-weight: 800;
      overflow: hidden;
      border-radius: 3.2mm;
    }

    .quote-visual span,
    .date-visual span {
      display: block;
      color: #0f4c81;
      font-size: 5.8px;
      font-weight: 900;
      margin-bottom: .8mm;
    }

    .quote-visual p {
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .date-visual {
      text-align: center;
      border-right-color: #157347;
    }

    .date-visual strong {
      display: block;
      color: #111827;
      font-size: 9px;
      font-weight: 900;
      margin-bottom: .7mm;
    }

    .date-visual small {
      color: #64748b;
      font-size: 5.6px;
      font-weight: 800;
    }

    .insights-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      margin-top: 4mm;
    }

    .insight {
      border-right: 3px solid #0f4c81;
      background: #fbfdff;
      border: 1px solid #e5e7eb;
      padding: 2.2mm;
      color: #374151;
      font-size: 7px;
      line-height: 1.65;
      font-weight: 850;
      min-height: 13mm;
      overflow: hidden;
      border-radius: 3.4mm;
    }

    .footer {
      margin-top: 3mm;
      padding: 2.4mm 3mm;
      border: 1px solid #d1d5db;
      border-radius: 3.8mm;
      text-align: center;
      color: #64748b;
      font-size: 6.5px;
      font-weight: 800;
      background: #fcfdff;
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="letterhead">
      <section class="official-side">
        ${
          ministryLogoDataUri
            ? `<img class="logo" src="${ministryLogoDataUri}" alt="شعار وزارة التعليم" />`
            : `<div class="logo-fallback">وزارة<br />التعليم</div>`
        }
        <div class="official-lines">
          <strong>وزارة التعليم</strong>
          <span>${escapeHtml(educationDepartment)}</span>
          <span>${escapeHtml(educationOffice)}</span>
        </div>
      </section>

      <section class="report-title">
        <small>تقرير إنفوجرافيك رسمي لتحليل استبيان</small>
        <h1>${escapeHtml(survey.title)}</h1>
      </section>

      <section class="school-lines">
        <span>اسم المدرسة</span>
        <strong>${escapeHtml(schoolName)}</strong>
        <span>تاريخ التقرير: ${escapeHtml(reportDate)}</span>
      </section>
    </header>

    <section class="executive-band">
      <div class="completion-box">
        ${buildCompletionGauge(completionRate)}
      </div>

      <div class="summary-area">
        <div class="kpi-row">
          <div class="kpi">
            <span>عدد الردود</span>
            <strong>${escapeHtml(totalResponses)}</strong>
            <small>إجمالي المشاركات</small>
          </div>

          <div class="kpi">
            <span>الأسئلة المختارة</span>
            <strong>${escapeHtml(questions.length)}</strong>
            <small>من أصل ${escapeHtml(totalQuestions)}</small>
          </div>

          <div class="kpi">
            <span>الحالة</span>
            <strong style="font-size:11px">${escapeHtml(statusLabel(survey.status))}</strong>
            <small>${escapeHtml(surveyAudienceLabels[survey.audienceType] || survey.audienceType)}</small>
          </div>

          <div class="kpi">
            <span>الهوية</span>
            <strong style="font-size:10px">${survey.isAnonymous ? "مجهول" : "اختياري"}</strong>
            <small>بيانات المستجيب</small>
          </div>
        </div>

        <div class="executive-text">
          يعرض هذا التقرير صفحة تنفيذية مختصرة للأسئلة المختارة فقط، بهدف تقديم قراءة بصرية رسمية تساعد قائد المدرسة أو رائد النشاط على فهم المؤشرات بسرعة دون تحويل التقرير إلى تفريغ كامل لكل تفاصيل الاستبيان.
        </div>
      </div>
    </section>

    <section class="section-label">
      <h2>لوحة المؤشرات المختارة</h2>
      <span>التقرير يعرض أهم المحاور بصيغة إنفوجرافيك قابلة للطباعة الرسمية</span>
    </section>

    <section class="questions-board ${densityClass}">
      ${questionBlocks}
    </section>

    <section class="section-label">
      <h2>أبرز القراءة التحليلية</h2>
      <span>مستخرجة من الأسئلة المختارة</span>
    </section>

    <section class="insights-box">
      ${insightLines.map((line) => `<div class="insight">${escapeHtml(line)}</div>`).join("")}
    </section>

    <footer class="footer">
      تم إنشاء هذا التقرير من مركز الاستبيانات في منصة التوجيه الطلابي · صفحة واحدة رسمية قابلة للأرشفة والطباعة
    </footer>
  </main>
</body>
</html>
`;
}

export async function GET(request: Request, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requirePdfAccess(surveyId);

  if (error) return error;

  const requestedQuestionIds = getRequestedQuestionIds(request);
  const html = await buildPdfHtml(survey!, requestedQuestionIds);

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
    });

    await page.setContent(html, {
      waitUntil: "load",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
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
  } catch (error) {
    console.error("SURVEY_ANALYSIS_PDF_EXPORT_ERROR", error);

    return NextResponse.json(
      { error: "تعذر تصدير تقرير الاستبيان PDF." },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}