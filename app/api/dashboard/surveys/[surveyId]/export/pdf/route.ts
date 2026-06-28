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

const chartPalette = ["#07a869", "#3d7eb9", "#0da9a6", "#ef5548", "#c1b489"];

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

  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
  window.setTimeout(() => window.print(), 450);
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

function metricIcon(type: string) {
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
  };

  return icons[type] || icons.questions;
}

function infoIcon(type: string) {
  const icons: Record<string, string> = {
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
    response:
      '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg>',
    questions:
      '<svg viewBox="0 0 24 24"><path d="M9.1 9a3 3 0 1 1 5.8 1c0 2-3 2-3 4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>',
  };

  return icons[type] || icons.report;
}

function metricCard(type: string, tone: "green" | "blue" | "turq" | "red", value: string, label: string) {
  return `
    <div class="metric-card ${tone}">
      <div class="metric-icon">${metricIcon(type)}</div>
      <div class="metric-number">${escapeHtml(value)}</div>
      <div class="metric-label">${escapeHtml(label)}</div>
    </div>`;
}

function infoItem(type: string, label: string, value: string) {
  return `
    <div class="info-item">
      <div class="info-icon">${infoIcon(type)}</div>
      <div>
        <div class="info-label">${escapeHtml(label)}:</div>
        <div class="info-value">${escapeHtml(value)}</div>
      </div>
    </div>`;
}

function summaryLine(icon: string, text: string) {
  return `
    <div class="summary-line">
      <div class="summary-icon">${icon}</div>
      <div class="summary-text">${text}</div>
    </div>`;
}

function questionRow(question: QuestionAnalysis, index: number) {
  const value =
    question.average !== null
      ? `${formatNumber(question.average, 2)} متوسط`
      : question.optionCounts.length
        ? `${formatPercent(question.optionCounts.slice().sort((a, b) => b.percentage - a.percentage)[0]?.percentage || 0)} أعلى اختيار`
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

  const strongest = getStrongestQuestion(questions);
  const improvement = getImprovementQuestion(questions);
  const topChoice = pickTopChoice(questions);

  const profile = survey.schoolAccount.profile;
  const schoolName = profile?.schoolName || survey.schoolAccount.name || "غير متوفر";
  const reportDate = formatGregorianDate(new Date());

  const insightLines = buildInsightLines({
    totalResponses,
    totalQuestions,
    completionRate,
    selectedQuestions: questions,
  });

  const donutRate = Math.max(0, Math.min(completionRate, 100));
  const positiveRate = topChoice?.percentage ?? averageAnswerRate;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(survey.title)}</title>
<style>
  @font-face { font-family:'Cairo'; src:local('Cairo'); }

  :root{
    --green:#07a869;
    --blue:#3d7eb9;
    --turq:#0da9a6;
    --navy:#15445a;
    --gold:#c1b489;
    --gray:#c2c1c1;
    --line:#d9e2e8;
    --red:#ef5548;
    --soft-red:#fb6a5c;
  }

  *{box-sizing:border-box}

  html,body{
    margin:0;
    width:1600px;
    height:900px;
    overflow:hidden;
    background:#e9eef1;
    font-family:'Cairo',Tahoma,Arial,sans-serif;
    color:#09254b;
  }

  .sheet{
    width:1600px;
    height:900px;
    margin:0 auto;
    background:#fff;
    position:relative;
    overflow:hidden;
    padding:34px 78px 36px;
    isolation:isolate;
  }

  @page{size:16.6667in 9.375in;margin:0}

  @media print{
    html,body{background:white;width:1600px;height:900px;overflow:hidden}
    .sheet{margin:0;box-shadow:none;width:1600px;height:900px;page-break-after:avoid}
  }

  .bottom-dots{
    position:absolute;
    bottom:2px;
    left:0;
    width:320px;
    height:78px;
    opacity:.75;
    z-index:0;
  }

  .brand{
    position:absolute;
    top:38px;
    right:72px;
    width:330px;
    height:130px;
    z-index:50;
    display:flex;
    align-items:center;
    justify-content:center;
    overflow:hidden;
  }

  .brand img{
    width:310px;
    max-height:122px;
    object-fit:contain;
    display:block;
  }

  .vision-brand{
    position:absolute;
    top:36px;
    left:74px;
    width:310px;
    height:135px;
    z-index:55;
    display:flex;
    align-items:center;
    justify-content:center;
    overflow:hidden;
  }

  .vision-brand img{
    width:300px;
    max-height:125px;
    object-fit:contain;
    display:block;
  }

  .header{
    position:relative;
    z-index:2;
    text-align:center;
    padding-top:1px;
  }

  .title{
    margin:0;
    font-size:52px;
    line-height:1.16;
    font-weight:900;
    letter-spacing:-1px;
    color:#081f47;
  }

  .subtitle{
    margin:8px 0 0;
    color:#078b80;
    font-size:28px;
    font-weight:800;
  }

  .info-panel{
    position:relative;
    z-index:2;
    margin-top:38px;
    border:2px solid #d3dce4;
    border-radius:12px;
    min-height:139px;
    padding:10px 22px;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    grid-auto-rows:58px;
    align-items:center;
    background:rgba(255,255,255,.96);
    box-shadow:0 1px 3px rgba(13,38,76,.04) inset;
  }

  .info-item{
    height:48px;
    display:grid;
    grid-template-columns:58px 1fr;
    gap:12px;
    align-items:center;
    padding:0 14px;
    border-left:1px solid #e2e7ec;
    overflow:hidden;
  }

  .info-item:nth-child(4n){border-left:0}
  .info-item:nth-child(-n+4){border-bottom:1px solid #dde6ec;padding-bottom:8px}

  .info-icon{
    width:40px;
    height:40px;
    display:flex;
    align-items:center;
    justify-content:center;
    color:var(--turq);
    flex-shrink:0;
  }

  .info-icon svg{
    width:38px;
    height:38px;
    stroke:currentColor;
    fill:none;
    stroke-width:2.25;
    stroke-linecap:round;
    stroke-linejoin:round;
  }

  .info-label{
    color:#081f47;
    font-size:17px;
    font-weight:900;
    line-height:1.2;
    margin-bottom:4px;
    white-space:nowrap;
  }

  .info-value{
    color:#0b3d73;
    font-size:16px;
    font-weight:700;
    line-height:1.22;
    display:-webkit-box;
    -webkit-line-clamp:2;
    -webkit-box-orient:vertical;
    overflow:hidden;
    text-overflow:ellipsis;
    max-height:2.45em;
  }

  .metrics{
    position:relative;
    z-index:2;
    margin-top:14px;
    display:grid;
    grid-template-columns:repeat(6,1fr);
    gap:12px;
  }

  .metric-card{
    height:150px;
    border:2px solid #d8e1e8;
    border-radius:12px;
    background:#fff;
    box-shadow:0 4px 11px rgba(4,31,67,.055);
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-start;
    padding:13px 4px 9px;
    position:relative;
  }

  .metric-card:after{
    content:"";
    position:absolute;
    bottom:-2px;
    left:50%;
    transform:translateX(-50%);
    width:22px;
    height:4px;
    border-radius:20px;
    background:var(--blue);
  }

  .metric-card.green:after{background:var(--green)}
  .metric-card.turq:after{background:var(--turq)}
  .metric-card.red:after{background:var(--red)}

  .metric-icon{height:47px;color:var(--blue);margin-bottom:3px}
  .metric-card.green .metric-icon{color:var(--green)}
  .metric-card.turq .metric-icon{color:var(--turq)}
  .metric-card.red .metric-icon{color:var(--red)}

  .metric-icon svg{
    width:46px;
    height:46px;
    stroke:currentColor;
    fill:none;
    stroke-width:2;
    stroke-linecap:round;
    stroke-linejoin:round;
  }

  .metric-number{
    font-size:30px;
    font-weight:900;
    line-height:1.2;
    color:#116eae;
    letter-spacing:-.6px;
    min-height:38px;
    display:flex;
    align-items:center;
  }

  .metric-card.green .metric-number{color:#07885c}
  .metric-card.turq .metric-number{color:#079a97}
  .metric-card.red .metric-number{color:#e84a3d}

  .metric-label{
    color:#0c2854;
    font-weight:800;
    font-size:15px;
    text-align:center;
    line-height:1.25;
    margin-top:4px;
    white-space:nowrap;
  }

  .content-grid{
    position:relative;
    z-index:2;
    margin-top:30px;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:18px;
    direction:rtl;
  }

  .panel{
    position:relative;
    border:2px solid #0d8293;
    border-radius:10px;
    min-height:262px;
    background:#fff;
    padding:42px 22px 18px;
    direction:rtl;
  }

  .panel .tab{
    position:absolute;
    top:-17px;
    right:142px;
    left:142px;
    height:36px;
    border-radius:999px;
    background:linear-gradient(90deg,#064f89,#088e84);
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:12px;
    font-weight:800;
    font-size:17px;
    box-shadow:0 5px 12px rgba(0,94,122,.24);
  }

  .panel .tab svg{
    width:24px;
    height:24px;
    stroke:#fff;
    fill:none;
    stroke-width:2;
  }

  .summary-lines{
    display:flex;
    flex-direction:column;
    gap:0;
  }

  .summary-line{
    min-height:68px;
    display:grid;
    grid-template-columns:46px 1fr;
    gap:16px;
    align-items:center;
    border-bottom:1px solid #dce7ee;
    padding:8px 0;
  }

  .summary-line:last-child{border-bottom:0}

  .summary-icon{
    color:var(--turq);
    display:flex;
    align-items:center;
    justify-content:center;
  }

  .summary-icon svg{
    width:34px;
    height:34px;
    stroke:currentColor;
    fill:none;
    stroke-width:2;
    stroke-linecap:round;
    stroke-linejoin:round;
  }

  .summary-text{
    font-size:19px;
    line-height:1.85;
    color:#0d2b59;
    font-weight:700;
  }

  .summary-text b{color:var(--turq);font-weight:900}
  .summary-text .green{color:#07885c;font-weight:900}
  .summary-text .blue{color:#0c6bab;font-weight:900}
  .summary-text .red{color:#df4e43;font-weight:900}

  .survey-grid{
    display:grid;
    grid-template-columns:245px 1fr;
    gap:22px;
    align-items:center;
    direction:ltr;
  }

  .donut-wrap{
    width:240px;
    height:205px;
    position:relative;
    display:flex;
    align-items:center;
    justify-content:center;
  }

  .donut{
    width:186px;
    height:186px;
    border-radius:50%;
    position:relative;
    background:conic-gradient(var(--green) 0 ${donutRate}%, #e8eef2 ${donutRate}% 100%);
    box-shadow:0 2px 6px rgba(0,0,0,.12);
  }

  .donut:before{
    content:"";
    position:absolute;
    inset:45px;
    border-radius:50%;
    background:#fff;
    box-shadow:inset 0 0 9px rgba(18,57,88,.14);
  }

  .donut-center{
    position:absolute;
    width:94px;
    height:94px;
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
    font-size:31px;
    line-height:1;
  }

  .donut-center span{
    margin-top:4px;
    font-size:13px;
    color:#52677d;
  }

  .question-table{
    direction:rtl;
    width:100%;
    border-collapse:collapse;
    font-size:14px;
  }

  .question-table th{
    color:#0d2857;
    font-weight:900;
    text-align:right;
    padding:6px 8px;
    border-bottom:1px solid #dce5eb;
  }

  .question-table td{
    padding:6px 8px;
    border-bottom:1px solid #e7edf2;
    font-weight:800;
    color:#0e2b58;
    vertical-align:middle;
  }

  .question-table td:not(.question-text){
    text-align:center;
    white-space:nowrap;
  }

  .question-text{
    max-width:260px;
    overflow:hidden;
    white-space:nowrap;
    text-overflow:ellipsis;
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

    <svg class="bottom-dots" viewBox="0 0 320 78" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><linearGradient id="gb" x1="0" x2="1"><stop stop-color="#3d7eb9"/><stop offset="1" stop-color="#07a869"/></linearGradient></defs>
      <g fill="url(#gb)">
        <circle cx="8" cy="8" r="6"/><circle cx="30" cy="13" r="5" opacity=".8"/><circle cx="52" cy="18" r="5" opacity=".75"/><circle cx="76" cy="22" r="4" opacity=".7"/><circle cx="102" cy="27" r="4" opacity=".6"/><circle cx="130" cy="32" r="3" opacity=".55"/>
        <circle cx="8" cy="37" r="5" opacity=".8"/><circle cx="32" cy="42" r="5" opacity=".75"/><circle cx="58" cy="48" r="4" opacity=".7"/><circle cx="88" cy="52" r="4" opacity=".65"/><circle cx="120" cy="56" r="3" opacity=".6"/><circle cx="152" cy="60" r="3" opacity=".55"/>
        <circle cx="5" cy="66" r="4" opacity=".7"/><circle cx="34" cy="68" r="4" opacity=".65"/><circle cx="65" cy="70" r="3" opacity=".6"/><circle cx="98" cy="72" r="3" opacity=".55"/><circle cx="133" cy="73" r="2.8" opacity=".5"/>
      </g>
    </svg>

    <header class="header">
      <h1 class="title">تقرير تحليل الاستبيان</h1>
      <div class="subtitle">قراءة إحصائية تربوية لآراء المستفيدين ومؤشرات التحسين</div>
    </header>

    <section class="info-panel">
      ${infoItem("school", "المدرسة", schoolName)}
      ${infoItem("report", "اسم الاستبيان", survey.title)}
      ${infoItem("audience", "الفئة المستهدفة", surveyAudienceLabels[survey.audienceType] || survey.audienceType)}
      ${infoItem("status", "حالة الاستبيان", statusLabel(survey.status))}
      ${infoItem("privacy", "نوع الاستجابة", survey.isAnonymous ? "مجهول الهوية" : "بيانات المستجيب اختيارية")}
      ${infoItem("response", "عدد الردود", `${totalResponses} رد`)}
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
        <div class="tab">لوحة المحاور المختارة</div>

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
        <div class="tab">${metricIcon("report")} خلاصة تنفيذية</div>

        <div class="summary-lines">
          ${summaryLine(metricIcon("responses"), `<span class="blue">${escapeHtml(insightLines[0] || "")}</span>`)}
          ${summaryLine(metricIcon("completion"), `<span class="green">${escapeHtml(insightLines[1] || "")}</span>`)}
          ${summaryLine(metricIcon("target"), `${escapeHtml(insightLines[2] || "")}`)}
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

  const requestedQuestionIds = getRequestedQuestionIds(request);
  const html = await buildPdfHtml(survey!, requestedQuestionIds);
  const responseHtml = shouldAutoPrint(request) ? injectPrintScript(html) : html;

  return new NextResponse(responseHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
