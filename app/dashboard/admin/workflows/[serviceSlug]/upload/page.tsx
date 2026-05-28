import { notFound } from "next/navigation";
import { WorkflowUploadCard } from "@/components/admin/workflow-upload-card";
import { dashboardServices } from "@/lib/constants/services";

type PageProps = {
  params: Promise<{
    serviceSlug: string;
  }>;
};

export default async function WorkflowUploadPage({ params }: PageProps) {
  const { serviceSlug } = await params;

  const service = dashboardServices.find((item) => item.slug === serviceSlug);

  if (!service) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-2xl">
        <p className="text-sm font-bold text-sky-300">Workflow Upload</p>
        <h1 className="mt-3 text-4xl font-black">رفع Workflow Excel</h1>
        <p className="mt-4 max-w-3xl leading-8 text-slate-300">
          الخدمة المستهدفة: {service.title}
        </p>
      </section>

      <WorkflowUploadCard serviceSlug={service.slug} serviceName={service.title} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 card-shadow">
        <h2 className="text-2xl font-black text-slate-900">صيغة Excel المطلوبة</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          الأعمدة المدعومة:
          stepTitle, stepDescription, fieldKey, fieldLabel, fieldType,
          fieldRequired, fieldOrder, allowOther, dependsOnFieldKey,
          linkedToValue, optionLabel, optionValue, optionOrder
        </p>
      </section>
    </div>
  );
}