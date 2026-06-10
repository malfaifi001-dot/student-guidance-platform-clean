import { PublicSurveyForm } from "@/components/surveys/public-survey-form";
import { surveyAudienceLabels } from "@/lib/surveys/survey-config";
import { getPublicSurveyByToken } from "@/lib/surveys/survey-service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicSurveyPage({ params }: PageProps) {
  const { token } = await params;
  const { survey, availability } = await getPublicSurveyByToken(token);

  if (!survey || !availability.isOpen) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8" dir="rtl">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center shadow-sm">
            <p className="text-sm font-bold text-amber-700">الاستبيان غير متاح للتعبئة</p>
            <h1 className="mt-3 text-2xl font-bold text-slate-950">
              {availability.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {availability.reason}
            </p>
          </section>
        </div>
      </main>
    );
  }

  const audienceLabel = (surveyAudienceLabels as Record<string, string>)[survey.audienceType] || "استبيان";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold text-sky-700">{audienceLabel}</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">{survey.title}</h1>

          {survey.description ? (
            <p className="mt-3 text-sm leading-7 text-slate-600">{survey.description}</p>
          ) : null}

          {survey.isAnonymous ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-7 text-amber-700">
              هذا الاستبيان مجهول الهوية، ولن يتم طلب الاسم أو رقم الجوال.
            </p>
          ) : (
            <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold leading-7 text-sky-700">
              هذا الاستبيان يتطلب الاسم ورقم الجوال لإرسال الرد.
            </p>
          )}
        </section>

        <PublicSurveyForm survey={survey} />
      </div>
    </main>
  );
}