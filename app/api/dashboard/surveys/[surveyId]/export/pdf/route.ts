import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
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

type AnswerLike = {
  value: string | null;
  jsonValue: unknown;
};

type QuestionAnalysis = {
  id: string;
  label: string;
  type: string;
  isRequired: boolean;
  answeredCount: number;
  emptyCount: number;
  answerRate: number;
  average: number | null;
  min: number | null;
  max: number | null;
  optionCounts: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
  textSamples: string[];
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

function answerToText(answer: AnswerLike | undefined) {
  if (!answer) return "";

  if (Array.isArray(answer.jsonValue)) {
    return answer.jsonValue
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join("، ");
  }

  if (answer.jsonValue !== null && answer.jsonValue !== undefined) {
    return String(answer.jsonValue);
  }

  return answer.value || "";
}

function answerToNumber(answer: AnswerLike | undefined) {
  const numberValue = Number(answerToText(answer));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isChoiceQuestion(type: string) {
  return type === "YES_NO" || type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";
}

function isNumericQuestion(type: string) {
  return type === "RATING" || type === "SCALE" || type === "NUMBER";
}

function formatGregorianDate(value: Date | string | null | undefined) {
  const date = value ? new Date(value) : new Date();

  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(safeDate);
}

function formatNumber(value: number | null | undefined, digits = 1, fallback = "غير متوفر") {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function formatPercent(value: number | null | undefined, digits = 0, fallback = "غير متوفر") {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return `${formatNumber(value, digits)}%`;
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
    return "";
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

function buildQuestionAnalysis(survey: SurveyForPdf): QuestionAnalysis[] {
  const totalResponses = survey.responses.length;

  return survey.questions.map((question) => {
    const responseAnswers = survey.responses.map((response) =>
      response.answers.find((answer) => answer.questionId === question.id),
    );

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
            .slice(0, 2)
        : [];

    return {
      id: question.id,
      label: question.label,
      type: question.type,
      isRequired: question.isRequired,
      answeredCount: answeredAnswers.length,
      emptyCount: Math.max(totalResponses - answeredAnswers.length, 0),
      answerRate: totalResponses ? Math.round((answeredAnswers.length / totalResponses) * 100) : 0,
      average:
        isNumericQuestion(question.type) && numericValues.length
          ? Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2))
          : null,
      min: numericValues.length ? Math.min(...numericValues) : null,
      max: numericValues.length ? Math.max(...numericValues) : null,
      optionCounts,
      textSamples,
    };
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

function getRequestedQuestionIds(request: Request) {
  const url = new URL(request.url);
  const rawValue = url.searchParams.get("questionIds") || "";

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function shouldAutoPrint(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("print") === "1";
}

function injectPrintScript(html: string) {
  const printScript = `
<script>
window.addEventListener("load", () => {
  window.setTimeout(() => window.print(), 500);
});
</script>`;

  return html.includes("</body>") ? html.replace("</body>", `${printScript}\n</body>`) : `${html}${printScript}`;
}

function getVisibleQuestions(allQuestions: QuestionAnalysis[], requestedQuestionIds: string[]) {
  if (!requestedQuestionIds.length) {
    return allQuestions.slice(0, Math.min(allQuestions.length, 10));
  }

  const requestedSet = new Set(requestedQuestionIds);
  const selected = allQuestions.filter((question) => requestedSet.has(question.id));

  if (!selected.length) {
    return allQuestions.slice(0, Math.min(allQuestions.length, 10));
  }

  return selected.slice(0, 10);
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function pickTopChoice(questions: QuestionAnalysis[]) {
  return questions
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
}

function getStrongestQuestion(questions: QuestionAnalysis[]) {
  const numeric = questions
    .filter((question) => question.average !== null)
    .sort((first, second) => Number(second.average) - Number(first.average))[0];

  if (numeric) return numeric;

  return questions.slice().sort((first, second) => second.answerRate - first.answerRate)[0] || null;
}

function getImprovementQuestion(questions: QuestionAnalysis[]) {
  const numeric = questions
    .filter((question) => question.average !== null)
    .sort((first, second) => Number(first.average) - Number(second.average))[0];

  if (numeric) return numeric;

  return questions.slice().sort((first, second) => first.answerRate - second.answerRate)[0] || null;
}

function iconSvg(type: "responses" | "questions" | "completion" | "average" | "target" | "alert" | "school" | "report" | "audience" | "status" | "date" | "privacy") {
  const icons: Record<string, string> = {
    responses:
      '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>',
    questions:
      '<svg viewBox="0 0 24 24"><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>',
    completion:
      '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/><circle cx="12" cy="12" r="10"/></svg>',
    average:
      '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/><path d="M19 9h-4"/><path d="M19 9v4"/></svg>',
    target:
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M22 2 12 12"/></svg>',
    alert:
      '<svg viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    school:
      '<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M4 10 12 4l8 6"/><path d="M6 10v11"/><path d="M18 10v11"/><path d="M10 21v-6h4v6"/></svg>',
    report:
      '<svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>',
    audience:
      '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    status:
      '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/><circle cx="12" cy="12" r="10"/></svg>',
    date:
      '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
    privacy:
      '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  };

  return icons[type];
}

function infoItem(type: Parameters<typeof iconSvg>[0], label: string, value: string) {
  return `
    <div class="info-item">
      <div class="info-icon">${iconSvg(type)}</div>
      <div class="info-copy">
        <div class="info-label">${escapeHtml(label)}</div>
        <div class="info-value">${escapeHtml(value)}</div>
      </div>
    </div>`;
}

function metricCard(type: Parameters<typeof iconSvg>[0], tone: "green" | "blue" | "turq" | "red", value: string, label: string) {
  return `
    <div class="metric-card ${tone}">
      <div class="metric-icon">${iconSvg(type)}</div>
      <div class="metric-number">${escapeHtml(value)}</div>
      <div class="metric-label">${escapeHtml(label)}</div>
    </div>`;
}

function questionRow(question: QuestionAnalysis, index: number) {
  const sortedOption = question.optionCounts.slice().sort((first, second) => second.percentage - first.percentage)[0];

  const value =
    question.average !== null
      ? `${formatNumber(question.average, 2)} متوسط`
      : sortedOption
        ? `${formatPercent(sortedOption.percentage)} أعلى اختيار`
        : `${formatPercent(question.answerRate)} معدل`;

  return `
    <tr>
      <td>س${index + 1}</td>
      <td class="question-text">${escapeHtml(question.label)}</td>
      <td>${escapeHtml(questionTypeLabel(question.type))}</td>
      <td>${escapeHtml(String(question.answeredCount))}</td>
      <td>${escapeHtml(value)}</td>
    </tr>`;
}

function insightLine(icon: string, text: string) {
  return `
    <div class="insight-line">
      <div class="insight-icon">${icon}</div>
      <div class="insight-text">${escapeHtml(text)}</div>
    </div>`;
}

function buildInsightLines({
  totalResponses,
  totalQuestions,
  completionRate,
  selectedQuestions,
}: {
  totalResponses: number;
  totalQuestions: number;
  completionRate: number;
  selectedQuestions: QuestionAnalysis[];
}) {
  if (!totalResponses) {
    return [
      "لم تُسجّل ردود حتى الآن، وسيتم تحديث التقرير بعد استقبال المشاركات.",
      "يمكن نشر رابط الاستبيان ومتابعة المؤشرات بعد وصول الردود الأولى.",
      "لا توجد توصيات تحليلية كافية قبل توفر بيانات الاستجابة.",
    ];
  }

  const averageAnswerRate = average(selectedQuestions.map((question) => question.answerRate)) ?? 0;
  const strongest = getStrongestQuestion(selectedQuestions);
  const improvement = getImprovementQuestion(selectedQuestions);
  const topChoice = pickTopChoice(selectedQuestions);

  return [
    `تم تحليل ${selectedQuestions.length} محورًا مختارًا من أصل ${totalQuestions} سؤالًا، بناءً على ${totalResponses} ردًا.`,
    `بلغت نسبة اكتمال الأسئلة المطلوبة ${formatPercent(completionRate)}، وبلغ متوسط معدل الإجابة للأسئلة المختارة ${formatPercent(averageAnswerRate)}.`,
    strongest
      ? `أقوى مؤشر ظاهر: ${strongest.label} ${strongest.average !== null ? `بمتوسط ${strongest.average}` : `بمعدل إجابة ${strongest.answerRate}%`}.`
      : "لا يظهر مؤشر قوي كافٍ في البيانات الحالية.",
    improvement
      ? `أبرز فرصة تحسين: ${improvement.label} ${improvement.average !== null ? `بمتوسط ${improvement.average}` : `بمعدل إجابة ${improvement.answerRate}%`}.`
      : "لا تظهر فرصة تحسين محددة في البيانات الحالية.",
    topChoice
      ? `أقوى اتجاه في الاختيارات: ${topChoice.label} بنسبة ${topChoice.percentage}%.`
      : "الأسئلة النصية أو الرقمية تحتاج قراءة نوعية داعمة بجانب المؤشرات.",
  ].slice(0, 3);
}

async function buildPdfHtml(survey: SurveyForPdf, requestedQuestionIds: string[]) {
  const moeLogoDataUri = await readPublicImageDataUri("/uploads/school-logos/MOE.png");
  const visionLogoDataUri = await readPublicImageDataUri("/uploads/school-logos/VISION2030.png");

  const allQuestions = buildQuestionAnalysis(survey);
  const questions = getVisibleQuestions(allQuestions, requestedQuestionIds);
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

  const completionRate = totalResponses ? Math.round((completedRequiredResponses / totalResponses) * 100) : 0;
  const averageAnswerRate = average(questions.map((question) => question.answerRate)) ?? 0;
  const numericAverage = average(questions.map((question) => question.average ?? NaN).filter(Number.isFinite));
  const improvement = getImprovementQuestion(questions);
  const topChoice = pickTopChoice(questions);
  const positiveRate = topChoice?.percentage ?? averageAnswerRate;

  const profile = survey.schoolAccount.profile;
  const schoolName = profile?.schoolName || survey.schoolAccount.name || "غير متوفر";
  const reportDate = formatGregorianDate(new Date());
  const audienceLabel =
    surveyAudienceLabels[survey.audienceType as keyof typeof surveyAudienceLabels] || survey.audienceType;

  const insightLines = buildInsightLines({
    totalResponses,
    totalQuestions,
    completionRate,
    selectedQuestions: questions,
  });

  const donutRate = Math.max(0, Math.min(completionRate, 100));

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(survey.title)}</title>
<style>
  @font-face { font-family:'Cairo'; src:local('Cairo'); }

  :root{
    --green:#07a869;
    --blue:#3d7eb9;
    --turq:#0da9a6;
    --navy:#081f47;
    --line:#d9e2e8;
    --red:#ef5548;
    --paper:#ffffff;
    --screen:#edf2f6;
  }

  @page {
    size: A4 landscape;
    margin: 0;
    page-orientation: upright;
  }

  *{ box-sizing:border-box; }

  html{
    width:100%;
    min-height:100%;
    margin:0;
    padding:0;
    background:var(--screen);
  }

  body{
    width:100%;
    min-height:100vh;
    margin:0;
    padding:0;
    overflow:auto;
    background:var(--screen);
    color:#09254b;
    font-family:'Cairo', Tahoma, Arial, sans-serif;
    direction:rtl;
    display:flex;
    justify-content:center;
    align-items:flex-start;
  }

  .sheet{
    width:297mm;
    height:210mm;
    margin:0 auto;
    overflow:hidden;
    position:relative;
    background:var(--paper);
    padding:11mm 11mm 6mm;
    isolation:isolate;
  }

  .corner-dots{
    position:absolute;
    left:0;
    bottom:0;
    width:31mm;
    height:11mm;
    opacity:.72;
    z-index:0;
  }

  .brand,
  .vision-brand{
    position:absolute;
    top:8.5mm;
    width:33mm;
    height:17mm;
    display:flex;
    align-items:center;
    justify-content:center;
    overflow:hidden;
    z-index:2;
  }

  .brand{ right:11mm; }
  .vision-brand{ left:11mm; }

  .brand img,
  .vision-brand img{
    width:100%;
    height:100%;
    object-fit:contain;
    display:block;
  }

  .report-header{
    position:relative;
    z-index:1;
    min-height:23mm;
    padding:0 42mm;
    text-align:center;
    display:flex;
    flex-direction:column;
    justify-content:center;
  }

  .report-title{
    margin:0;
    color:var(--navy);
    font-size:8mm;
    line-height:1.15;
    font-weight:900;
    letter-spacing:-.15mm;
    white-space:nowrap;
  }

  .report-subtitle{
    margin:2mm 0 0;
    color:#078b80;
    font-size:3.45mm;
    line-height:1.35;
    font-weight:800;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }

  .info-panel{
    position:relative;
    z-index:1;
    margin-top:4mm;
    height:31mm;
    border:.45mm solid #d3dce4;
    border-radius:3mm;
    background:rgba(255,255,255,.98);
    display:grid;
    grid-template-columns:repeat(4,1fr);
    grid-template-rows:repeat(2,1fr);
    overflow:hidden;
  }

  .info-item{
    min-width:0;
    display:grid;
    grid-template-columns:8mm 1fr;
    gap:1.8mm;
    align-items:center;
    padding:1.8mm 2.3mm;
    border-left:.25mm solid #e2e7ec;
    border-bottom:.25mm solid #e2e7ec;
  }

  .info-item:nth-child(4n){ border-left:0; }
  .info-item:nth-child(n+5){ border-bottom:0; }

  .info-icon,
  .metric-icon,
  .insight-icon{
    color:var(--turq);
    display:flex;
    align-items:center;
    justify-content:center;
  }

  .info-icon svg{
    width:6.5mm;
    height:6.5mm;
  }

  .metric-icon svg{
    width:6.6mm;
    height:6.6mm;
  }

  .insight-icon svg{
    width:5.5mm;
    height:5.5mm;
  }

  svg{
    stroke:currentColor;
    fill:none;
    stroke-width:2.1;
    stroke-linecap:round;
    stroke-linejoin:round;
  }

  .info-copy{ min-width:0; }

  .info-label{
    color:var(--navy);
    font-size:2.45mm;
    font-weight:900;
    line-height:1.2;
    margin-bottom:.5mm;
    white-space:nowrap;
  }

  .info-value{
    color:#0b3d73;
    font-size:2.35mm;
    font-weight:700;
    line-height:1.25;
    height:5.9mm;
    overflow:hidden;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
  }

  .metrics{
    position:relative;
    z-index:1;
    margin-top:3.2mm;
    height:25mm;
    display:grid;
    grid-template-columns:repeat(6,1fr);
    gap:2mm;
  }

  .metric-card{
    min-width:0;
    border:.4mm solid #d8e1e8;
    border-radius:3mm;
    background:#fff;
    box-shadow:0 .8mm 2mm rgba(4,31,67,.05);
    padding:2mm 1.2mm 1.6mm;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-start;
    position:relative;
    overflow:hidden;
  }

  .metric-card::after{
    content:"";
    position:absolute;
    width:7mm;
    height:.9mm;
    left:calc(50% - 3.5mm);
    bottom:0;
    border-radius:999px;
    background:var(--blue);
  }

  .metric-card.green::after{ background:var(--green); }
  .metric-card.turq::after{ background:var(--turq); }
  .metric-card.red::after{ background:var(--red); }

  .metric-card.green .metric-icon,
  .metric-card.green .metric-number{ color:var(--green); }

  .metric-card.turq .metric-icon,
  .metric-card.turq .metric-number{ color:var(--turq); }

  .metric-card.red .metric-icon,
  .metric-card.red .metric-number{ color:var(--red); }

  .metric-number{
    margin-top:.8mm;
    min-height:6mm;
    color:#116eae;
    font-size:4.7mm;
    line-height:1;
    font-weight:900;
    text-align:center;
    display:flex;
    align-items:center;
    justify-content:center;
  }

  .metric-label{
    margin-top:.9mm;
    color:#0c2854;
    font-weight:800;
    font-size:2.25mm;
    line-height:1.25;
    text-align:center;
    height:5.7mm;
    overflow:hidden;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
  }

  .content-grid{
    position:relative;
    z-index:1;
    margin-top:4.3mm;
    height:86mm;
    display:grid;
    grid-template-columns:1.1fr .9fr;
    gap:3mm;
  }

  .panel{
    min-width:0;
    position:relative;
    border:.45mm solid #0d8293;
    border-radius:3mm;
    background:#fff;
    padding:8.4mm 4mm 3.4mm;
    overflow:visible;
  }

  .panel-title{
    position:absolute;
    top:-3.2mm;
    right:26mm;
    left:26mm;
    height:7.4mm;
    border-radius:999px;
    background:linear-gradient(90deg,#064f89,#088e84);
    color:#fff;
    font-size:2.65mm;
    font-weight:900;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:1.6mm;
    overflow:hidden;
    white-space:nowrap;
  }

  .panel-title svg{
    width:4.1mm;
    height:4.1mm;
    stroke:#fff;
  }

  .survey-grid{
    height:100%;
    display:block;
    direction:rtl;
  }

  .donut-wrap{
    display:none;
  }

  .donut{
    width:26mm;
    height:26mm;
    border-radius:50%;
    background:conic-gradient(var(--green) 0 ${donutRate}%, #e8eef2 ${donutRate}% 100%);
    position:relative;
    box-shadow:0 .5mm 1.8mm rgba(0,0,0,.1);
  }

  .donut::before{
    content:"";
    position:absolute;
    inset:6.3mm;
    border-radius:50%;
    background:#fff;
    box-shadow:inset 0 0 2mm rgba(18,57,88,.12);
  }

  .donut-center{
    position:absolute;
    width:13mm;
    height:13mm;
    border-radius:50%;
    background:#fff;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    color:#092c5a;
    font-weight:900;
    text-align:center;
  }

  .donut-center strong{
    font-size:3.8mm;
    line-height:1;
  }

  .donut-center span{
    margin-top:.5mm;
    font-size:1.9mm;
    color:#52677d;
  }

  .question-table{
    width:100%;
    border-collapse:collapse;
    table-layout:fixed;
    direction:rtl;
    font-size:2.55mm;
  }

  .question-table th{
    color:#0d2857;
    font-weight:900;
    text-align:right;
    padding:1.4mm 1.1mm;
    border-bottom:.3mm solid #dce5eb;
    white-space:nowrap;
  }

  .question-table td{
    color:#0e2b58;
    font-weight:800;
    padding:1.35mm 1.1mm;
    border-bottom:.25mm solid #e7edf2;
    vertical-align:middle;
    height:9.6mm;
    overflow:hidden;
  }

  .question-table th:nth-child(1),
  .question-table td:nth-child(1){ width:6%; text-align:center; }

  .question-table th:nth-child(2),
  .question-table td:nth-child(2){ width:58%; }

  .question-table th:nth-child(3),
  .question-table td:nth-child(3){ width:14%; text-align:center; }

  .question-table th:nth-child(4),
  .question-table td:nth-child(4){ width:7%; text-align:center; }

  .question-table th:nth-child(5),
  .question-table td:nth-child(5){ width:15%; text-align:center; }

  .question-text{
    white-space:normal;
    overflow:hidden;
    text-overflow:clip;
    line-height:1.45;
    display:-webkit-box;
    -webkit-line-clamp:3;
    -webkit-box-orient:vertical;
  }

  .insights{
    height:100%;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
  }

  .insight-line{
    min-height:25mm;
    display:grid;
    grid-template-columns:7.5mm 1fr;
    gap:2mm;
    align-items:center;
    padding:3mm 0;
    border-bottom:.28mm solid #dce7ee;
    overflow:hidden;
  }

  .insight-line:last-child{
    border-bottom:0;
  }

  .insight-text{
    color:#0d2b59;
    font-size:3.05mm;
    line-height:1.65;
    font-weight:700;
    max-height:18mm;
    overflow:hidden;
    display:-webkit-box;
    -webkit-line-clamp:3;
    -webkit-box-orient:vertical;
  }

  @media print {
    @page {
      size: A4 landscape;
      margin: 0;
      page-orientation: upright;
    }

    html,
    body{
      width:297mm !important;
      height:210mm !important;
      min-height:210mm !important;
      margin:0 !important;
      padding:0 !important;
      overflow:hidden !important;
      background:#fff !important;
      display:block !important;
      -webkit-print-color-adjust:exact !important;
      print-color-adjust:exact !important;
    }

    .sheet{
      width:297mm !important;
      height:210mm !important;
      margin:0 !important;
      overflow:hidden !important;
      box-shadow:none !important;
      page-break-after:avoid;
      break-after:avoid-page;
      -webkit-print-color-adjust:exact !important;
      print-color-adjust:exact !important;
    }
  }
</style>
</head>
<body>
  <main class="sheet">
    ${
      visionLogoDataUri
        ? `<section class="vision-brand" aria-label="شعار رؤية السعودية 2030"><img src="${visionLogoDataUri}" alt="" /></section>`
        : ""
    }

    ${
      moeLogoDataUri
        ? `<section class="brand" aria-label="شعار وزارة التعليم"><img src="${moeLogoDataUri}" alt="" /></section>`
        : ""
    }

    <svg class="corner-dots" viewBox="0 0 320 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><linearGradient id="gb" x1="0" x2="1"><stop stop-color="#3d7eb9"/><stop offset="1" stop-color="#07a869"/></linearGradient></defs>
      <g fill="url(#gb)">
        <circle cx="8" cy="8" r="6"/><circle cx="30" cy="13" r="5" opacity=".8"/><circle cx="52" cy="18" r="5" opacity=".75"/><circle cx="76" cy="22" r="4" opacity=".7"/><circle cx="102" cy="27" r="4" opacity=".6"/><circle cx="130" cy="32" r="3" opacity=".55"/>
        <circle cx="8" cy="37" r="5" opacity=".8"/><circle cx="32" cy="42" r="5" opacity=".75"/><circle cx="58" cy="48" r="4" opacity=".7"/><circle cx="88" cy="52" r="4" opacity=".65"/><circle cx="120" cy="56" r="3" opacity=".6"/><circle cx="152" cy="60" r="3" opacity=".55"/>
        <circle cx="5" cy="66" r="4" opacity=".7"/><circle cx="34" cy="68" r="4" opacity=".65"/><circle cx="65" cy="70" r="3" opacity=".6"/><circle cx="98" cy="72" r="3" opacity=".55"/><circle cx="133" cy="73" r="2.8" opacity=".5"/>
      </g>
    </svg>

    <header class="report-header">
      <h1 class="report-title">تقرير تحليل الاستبيان</h1>
      <div class="report-subtitle">قراءة إحصائية تربوية لآراء المستفيدين ومؤشرات التحسين</div>
    </header>

    <section class="info-panel">
      ${infoItem("school", "المدرسة", schoolName)}
      ${infoItem("report", "اسم الاستبيان", survey.title)}
      ${infoItem("audience", "الفئة المستهدفة", audienceLabel)}
      ${infoItem("status", "حالة الاستبيان", statusLabel(survey.status))}
      ${infoItem("privacy", "نوع الاستجابة", survey.isAnonymous ? "مجهول الهوية" : "بيانات المستجيب اختيارية")}
      ${infoItem("responses", "عدد الردود", `${totalResponses} رد`)}
      ${infoItem("questions", "الأسئلة المختارة", `${questions.length} من ${totalQuestions}`)}
      ${infoItem("date", "تاريخ التقرير", reportDate)}
    </section>

    <section class="metrics">
      ${metricCard("responses", "green", String(totalResponses), "عدد الردود")}
      ${metricCard("questions", "blue", String(questions.length), "محاور مختارة")}
      ${metricCard("completion", "green", formatPercent(completionRate), "اكتمال المطلوب")}
      ${metricCard("average", "turq", formatPercent(averageAnswerRate), "معدل الإجابة")}
      ${metricCard("target", "turq", numericAverage !== null ? formatNumber(numericAverage, 2) : formatPercent(positiveRate), "أقوى مؤشر")}
      ${metricCard("alert", improvement ? "red" : "blue", improvement ? "1" : "0", "فرصة تحسين")}
    </section>

    <section class="content-grid">
      <article class="panel">
        <div class="panel-title">لوحة المحاور المختارة</div>

        <div class="survey-grid">
          <div class="donut-wrap">
            <div class="donut"></div>
            <div class="donut-center">
              <strong>${escapeHtml(formatPercent(completionRate))}</strong>
              <span>اكتمال</span>
            </div>
          </div>

          <table class="question-table">
            <thead>
              <tr>
                <th>م</th>
                <th>المحور</th>
                <th>النوع</th>
                <th>إجابة</th>
                <th>المؤشر</th>
              </tr>
            </thead>
            <tbody>
              ${questions.map((question, index) => questionRow(question, index)).join("")}
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <div class="panel-title">${iconSvg("report")} خلاصة تنفيذية</div>

        <div class="insights">
          ${insightLine(iconSvg("responses"), insightLines[0] || "")}
          ${insightLine(iconSvg("completion"), insightLines[1] || "")}
          ${insightLine(iconSvg("target"), insightLines[2] || "")}
        </div>
      </article>
    </section>
  </main>
</body>
</html>`;
}

export async function GET(request: Request, context: RouteContext) {
  const { surveyId } = await context.params;
  const { survey, error } = await requirePdfAccess(surveyId);

  if (error) return error;

  try {
    const requestedQuestionIds = getRequestedQuestionIds(request);
    const html = await buildPdfHtml(survey!, requestedQuestionIds);
    const responseHtml = shouldAutoPrint(request) ? injectPrintScript(html) : html;

    return new NextResponse(responseHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("SURVEY_ANALYSIS_PRINT_EXPORT_ERROR", error);

    return NextResponse.json(
      { error: "تعذر فتح تقرير الاستبيان للطباعة." },
      { status: 500 },
    );
  }
}