import { notFound } from "next/navigation";

import { SendActivityAssignmentCard } from "@/components/activity-programs/send-activity-assignment-card";
import { WorkflowServiceHomePage } from "@/components/services/workflow-service-home-page";
import { getActivityProgramDomainBySlug } from "@/lib/activity-programs/activity-program-catalog";

type PageProps = {
  params: Promise<{
    domainSlug: string;
  }>;
};

export default async function ActivityProgramDomainPage({ params }: PageProps) {
  const { domainSlug } = await params;
  const domain = getActivityProgramDomainBySlug(domainSlug);

  if (!domain) {
    notFound();
  }

  return (
    <div className="space-y-6" dir="rtl">
      <SendActivityAssignmentCard
        domainSlug={domain.slug}
        domainTitle={domain.title}
      />

      <WorkflowServiceHomePage
        serviceSlug={domain.serviceSlug}
        title={domain.title}
        description={`${domain.description} يمكنك إنشاء نشاط مباشرة، أو إرسال النموذج لمعلم عبر رابط واتساب.`}
        newButtonLabel="إنشاء نشاط"
        caseSingularName="نشاط"
        casePluralName="الأنشطة"
        emptyTitle="لا توجد أنشطة في هذا المجال"
        emptyDescription="ابدأ بإنشاء نشاط لهذا المجال، أو أرسل النموذج لمعلم دون إنشاء حالة مباشرة."
      />
    </div>
  );
}